/**
 * Generates a 768-dimensional vector embedding using Jina AI Embeddings API.
 * Model: jina-embeddings-v2-base-en (free, 1M tokens/month)
 * Requires: JINA_API_KEY in .env (free from https://jina.ai)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const jinaKey = process.env.JINA_API_KEY || "";

    const response = await fetch("https://api.jina.ai/v1/embeddings", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${jinaKey}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: JSON.stringify({
            model: "jina-embeddings-v2-base-en",
            input: [text.replace(/\n/g, " ")],
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Jina embedding failed (${response.status}): ${err}`);
    }

    const json = await response.json() as { data: { embedding: number[] }[] };
    const embedding = json.data[0]?.embedding;

    if (!embedding || embedding.length === 0) {
        throw new Error("Empty embedding returned from Jina AI");
    }

    console.log(`[Embedding] Generated ${embedding.length}-dim vector via Jina AI`);
    return embedding;
}
