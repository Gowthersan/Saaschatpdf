import { Configuration, OpenAIApi } from "openai-edge";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(config);

export async function getEmbeddings(text: string) {
  try {
    // console.log("Clé API utilisée :", process.env.OPENAI_API_KEY);
    // console.log("Texte envoyé :", text);

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: text.replace(/\n/g, " "),
      }),
    });

    // console.log("Clé API :", process.env.OPENAI_API_KEY);

    // console.log("Statut de la réponse :", response.status);
    // console.log("Réponse brute :", response);

    const result = await response.json();
    // console.log("Réponse de l'API :", result);

    return result.data[0].embedding as number[];
  } catch (error) {
    console.log("Erreur lors de l'appel de l'api openai", error);
    throw error;
  }
}
