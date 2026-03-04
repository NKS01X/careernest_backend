import OpenAI from "openai";

const grok = new OpenAI({
    apiKey: process.env.GROK_API,
    baseURL: "https://api.x.ai/v1",
});

/*
 * Generate a vector embedding for the given text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const response = await grok.embeddings.create({
            model: "v1",
            input: text.replace(/\n/g, " "),
        });

        const embedding = response.data[0]?.embedding;
        if (!embedding) {
            throw new Error("Failed to generate embedding from Grok API");
        }

        return embedding;
    } catch (error) {
        console.error("Error generating embedding:", error);
        throw error;
    }
}
