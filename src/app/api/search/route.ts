/**
 * Semantic search over the family's stored history (the RAG retrieval, exposed
 * to the UI). Embeds the query and returns the closest chunks by cosine
 * distance. Optional source filter.
 */
import { retrieve } from "@/lib/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { childId, query, sources, limit } = await req.json();
  if (!childId || !query) {
    return new Response("childId and query are required", { status: 400 });
  }
  const results = await retrieve(query, {
    childId,
    limit: limit ?? 10,
    sources,
  });
  return Response.json({ results });
}
