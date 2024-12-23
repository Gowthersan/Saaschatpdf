"use server";

import { getContext } from "@/lib/context";
import { db } from "@/lib/db";
import { messages as _messages, chats } from "@/lib/db/schema";
import { openai } from "@ai-sdk/openai";
import { CoreMessage, Message, streamText } from "ai";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages, chatId } = await req.json();

    // Vérifier si le chat existe dans la base de données
    const _chats = await db.select().from(chats).where(eq(chats.id, chatId));
    if (_chats.length !== 1) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Récupérer la clé de fichier associée au chat
    const fileKey = _chats[0].fileKey;
    const lastMessage = messages[messages.length - 1];

    // Obtenir le contexte pour la conversation
    const context = await getContext(lastMessage.content, fileKey);

    // Créer le prompt système avec le contexte
    const prompt = {
      role: "system",
      content: `AI assistant is a brand new, powerful, human-like artificial intelligence.
      The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
      AI is a well-behaved and well-mannered individual.
      AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
      AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
      AI assistant is a big fan of Pinecone and Vercel.
      START CONTEXT BLOCK
      ${context}
      END OF CONTEXT BLOCK
      AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
      If the context does not provide the answer to question, the AI assistant will say, "I'm sorry, but I don't know the answer to that question".
      AI assistant will not apologize for previous responses, but instead will indicate new information was gained.
      AI assistant will not invent anything that is not drawn directly from the context.
      `,
    };

    // Créer un tableau avec les messages envoyés
    const allMessages: CoreMessage[] = [
      prompt,
      ...messages.filter((message: Message) => message.role === "user"),
    ];

    // Appel de la fonction continueConversation pour gérer le flux de réponse
    const result = await continueConversation(
      allMessages,
      chatId,
      lastMessage.content
    );

    return result;
  } catch (error) {
    console.error("Erreur dans POST:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

async function continueConversation(
  messages: CoreMessage[],
  chatId: string,
  lastMessageContent: string
) {
  const response = streamText({
    model: openai("gpt-3.5-turbo"),
    messages,
    async onFinish({ text }) {
      try {
        // Convertir chatId en nombre si nécessaire
        const chatIdNumber = Number(chatId);

        if (isNaN(chatIdNumber)) {
          throw new Error("chatId must be a valid number");
        }

        // Sauvegarder également le dernier message utilisateur
        await db.insert(_messages).values({
          chatId: chatIdNumber, // Assurer que chatId est un nombre
          content: lastMessageContent,
          role: "user",
        });

        // Sauvegarder le message généré par l'IA
        await db.insert(_messages).values({
          chatId: chatIdNumber, // Assurer que chatId est un nombre
          content: text, // Texte généré par l'IA
          role: "system",
        });

        console.log("Message sauvegardé avec succès.");
      } catch (error) {
        console.error("Erreur dans l'enregistrement du message:", error);
      }
    },
  });

  // Retourner le flux de données en streaming
  const stream = response.toDataStreamResponse();
  return stream;
}
