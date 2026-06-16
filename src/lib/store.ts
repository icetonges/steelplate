/**
 * Persisting and embedding text so it becomes retrievable. Every check-in,
 * diary entry, document, and ingested item flows through here.
 */
import { db } from "./db";
import { checkIns, documents } from "./db/schema";
import { embedText } from "./embeddings";

export async function recordCheckIn(childId: string, body: string, cadence = "daily") {
  await db.insert(checkIns).values({ childId, body, cadence });
  await storeChunk({ childId, source: "check_in", chunk: body });
}

export async function storeChunk(opts: {
  childId?: string;
  source: string;
  title?: string;
  chunk: string;
  meta?: Record<string, unknown>;
}) {
  const embedding = await embedText(opts.chunk);
  await db.insert(documents).values({
    childId: opts.childId,
    source: opts.source,
    title: opts.title,
    chunk: opts.chunk,
    meta: opts.meta as any,
    embedding,
  });
}

/** Naive paragraph chunker; swap for a token-aware splitter when you wire real docs. */
export function chunk(text: string, max = 1200): string[] {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + "\n\n" + p).length > max) {
      if (buf) out.push(buf);
      buf = p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf) out.push(buf);
  return out;
}
