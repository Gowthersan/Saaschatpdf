import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { loadS3IntoPinecone } from "@/lib/pinecone";
import { getS3Url } from "@/lib/s3";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request, res: Response) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Utilisateur non authentifié" },
      { status: 401 }
    );
  }
  try {
    const body = await req.json();
    const { file_key, file_name } = body;

    // console.log("Paramètres reçus : ", { file_key, file_name });

    await loadS3IntoPinecone(file_key);
    const chat_id = await db
      .insert(chats)
      .values({
        fileKey: file_key,
        pdfname: file_name,
        pdfurl: getS3Url(file_key),
        userId,
      })
      .returning({
        insertedId: chats.id,
      });

    return NextResponse.json(
      { chat_id: chat_id[0].insertedId },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur interne :", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
