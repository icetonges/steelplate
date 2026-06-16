/**
 * Embeddings via Gemini (already in your stack). Used to embed every stored
 * chunk and every incoming query for retrieval.
 */
import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

const model = google.textEmbeddingModel("text-embedding-004");

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model, value: text });
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({ model, values: texts });
  return embeddings;
}
