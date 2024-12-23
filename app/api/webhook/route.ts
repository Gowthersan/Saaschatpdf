import { db } from "@/lib/db";
import { userSubscriptions } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const headerValues = await headers();
  const signature = headerValues.get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SIGNING_SECRET as string
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return new NextResponse("Webhook signature verification failed", {
      status: 400,
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  //new subscription created
  try {
    if (event.type === "checkout.session.completed") {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      if (!session?.metadata?.userId) {
        console.error("Missing userId in session metadata");
        return new NextResponse("No User ID", { status: 400 });
      }

      await db.insert(userSubscriptions).values({
        userId: session.metadata.userId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(
          subscription.current_period_end * 1000
        ),
      });
    } else if (event.type === "invoice.payment_succeeded") {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      await db
        .update(userSubscriptions)
        .set({
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(
            subscription.current_period_end * 1000
          ),
        })
        .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id));
    } else {
      console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error("Error handling event:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  return new NextResponse(null, { status: 200 });
}
