/**
 * RETRIEVAL — the self-improving loop.
 *
 * The more the family stores (check-ins, diary, docs, news, research), the
 * richer this retrieval gets, and the more grounded the mentor becomes. That
 * is the "use stored information to enhance performance" feature: it's just
 * this one function, reused everywhere the mentor needs grounding.
 */
import { sql } from "drizzle-orm";
import { db } from "./db";
import { embedText } from "./embeddings";

export type Retrieved = { source: string; title: string | null; chunk: string };

export async function retrieve(
  query: string,
  opts: { childId: string; limit?: number; sources?: string[] } = { childId: "" }
): Promise<Retrieved[]> {
  const limit = opts.limit ?? 8;
  const queryEmbedding = await embedText(query);
  const vec = JSON.stringify(queryEmbedding);

  // Cosine distance search via pgvector. Lower distance = more similar.
  const rows = await db.execute(sql`
    SELECT source, title, chunk
    FROM documents
    WHERE child_id = ${opts.childId}
      ${opts.sources ? sql`AND source = ANY(${opts.sources})` : sql``}
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${limit}
  `);

  return (rows as unknown as Retrieved[]) ?? [];
}

/** Formats retrieved chunks into the block the mentor prompt expects. */
export function formatContext(items: Retrieved[]): string {
  if (!items.length) return "";
  return items
    .map((r, i) => `[${i + 1}] (${r.source}${r.title ? `: ${r.title}` : ""})\n${r.chunk}`)
    .join("\n\n");
}
