/**
 * Research ingestion. Distills longer research (papers, articles) into the
 * corpus using the 1M-context ingest model so whole documents fit.
 * STUB: wire your sources.
 */
import { generateText } from "ai";
import { ingestModel } from "@/lib/models";
import { storeChunk, chunk } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { childId, title, url, body } = await req.json();
  if (!body) return new Response("Missing body", { status: 400 });

  const { text } = await generateText({
    model: ingestModel,
    prompt:
      `Distill this research into key, evidence-backed takeaways relevant to ` +
      `child development, character, learning, relationships, or resilience. ` +
      `Be faithful; note the strength of evidence.\n\nTITLE: ${title}\n\n${body}`,
  });

  let chunks = 0;
  for (const c of chunk(text)) {
    await storeChunk({
      childId: childId ?? undefined,
      source: "research",
      title,
      chunk: c,
      meta: { url },
    });
    chunks++;
  }
  return Response.json({ ok: true, summary: text, chunks });
}
