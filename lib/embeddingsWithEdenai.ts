import fetch from "node-fetch";

const url =
  "https://api.edenai.run/v2/workflow/5dc519c5-78fe-4f67-b878-935b4222ffb8/execution/{execution_id}/";

export async function getEmbeddingsEdenAI(text: string) {
  try {
    // console.log("Texte envoyé :", text);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EDENAI_API_TOKEN}`, // Jeton sécurisé
      },
    });

    // console.log("Statut de la réponse :", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Erreur API : ${response.status} - ${response.statusText}`,
        errorText
      );
      throw new Error(`Erreur lors de l'appel API : ${response.status}`);
    }

    const result = await response.json();
    // console.log("Réponse de l'API :", result);

    return result.data[0].embedding as number[];
  } catch (error) {
    console.log("Erreur lors de l'appel de l'API EdenAI ");
    throw error;
  }
}
