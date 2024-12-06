import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import {
  Document,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import fs from "fs/promises";
import md5 from "md5";
import { getEmbeddings } from "./embeddings";
import { downloadFromS3 } from "./s3-server";
import { convertToAscii } from "./utils";

let pinecone: Pinecone | null = null;

export const getPinecone = async () => {
  if (!pinecone) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("KEY non défini dans les variables d'environnement");
    }
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pinecone;
};

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadS3IntoPinecone(fileKey: string) {
  //1 Obtenir le PDF depuis S3
  console.log("Téléchargement de S3 en fichier du système...");
  const file_name = await downloadFromS3(fileKey);

  if (!file_name) {
    throw new Error(`Fichier introuvable dans S3 pour la clé : ${fileKey}`);
  }

  try {
    const loader = new PDFLoader(file_name);
    console.log("Chargement du PDF...");
    const pages = (await loader.load()) as PDFPage[];

    console.log(`Pages chargées avec succès : ${pages.length}`);

    //2 Sectioner et Segmenter le PDF
    const documents = await Promise.all(pages.map(prepareDocument));

    //3 Vectoriser et Embed les documents individuellement
    const vectors = await Promise.all(documents.flat().map(embedDocument));

    //4 Téléverser vers Pinecone
    const client = await getPinecone();
    const pineconeIndex = client.Index("chatpdf-gowther");

    console.log("Insertion des documents dans Pinecone...");
    const namespace = pineconeIndex.namespace(convertToAscii(fileKey));
    // Push vectors to Pinecone index
    await namespace.upsert(vectors);

    return documents[0];
    //Ensuite
  } finally {
    // Supprimer le fichier temporaire
    console.log(`Suppression du fichier temporaire : ${file_name}`);
    await fs
      .unlink(file_name)
      .catch((err) =>
        console.error(
          `Erreur lors de la suppression du fichier : ${err.message}`
        )
      );
  }
}

//Embedder le document
async function embedDocument(doc: Document) {
  try {
    const embedding = await getEmbeddings(doc.pageContent);
    const hash = md5(doc.pageContent);

    return {
      id: hash,
      values: embedding,
      metadata: {
        pageNumber: doc.metadata.pageNumber,
        text: doc.metadata.text,
      },
    } as PineconeRecord;
  } catch (error) {
    console.log("Error embedding document", error);
    throw error;
  }
}

//Tronquer la chaîne de caractères
export const truncateStringByBytes = (str: string, bytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};

//Preparer le document
async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, "");
  //Sectioner les documents
  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 36000),
      },
    }),
  ]);
  return docs;
}
