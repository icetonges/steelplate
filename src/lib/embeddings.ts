/**
 * Embeddings via Gemini. Used to embed every stored chunk and every incoming
 * query for retrieval.
 *
 * Model: gemini-embedding-001 (the legacy text-embedding-004 was deprecated by
 * Google on 2026-01-14). gemini-embedding-001 defaults to 3072 dims but supports
 * Matryoshka truncation — we request 768 to match the `vector(768)` column and
 * HNSW index in the schema. (For cosine distance, truncation is fine.)
 *
 * If you ever change the model or dimensionality, update EMBED_DIM in
 * src/lib/db/schema.ts and re-run the migration.
 */
import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";
import { EMBEDDING_DIM } from "./db/schema";

const model = google.textEmbeddingModel("gemini-embedding-001", {
  outputDimensionality: EMBEDDING_DIM,
});

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model, value: text });
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({ model, values: texts });
  return embeddings;
}
