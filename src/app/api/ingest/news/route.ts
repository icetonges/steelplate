/**
 * Daily news ingestion. Triggered by Vercel Cron (see vercel.json).
 * Fetches a feed, summarizes each item with the cheap ingest model, embeds,
 * and stores it so the mentor can reference relevant developments.
 *
 * STUB: wire your actual feed source(s). Kept deliberately small.
 */
import { generateText } from "ai";
import { ingestModel } from "@/lib/models";
import { storeChunk } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  // Protect the cron endpoint.
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // TODO: replace with real feed items (parenting/education/child-development).
  const items: { title: string; url: string; body: string }[] = [];

  for (const it of items) {
    const { text } = await generateText({
      model: ingestModel,
      prompt:
        `Summarize this for a parent focused on raising a resilient, capable child. ` +
        `2-3 sentences, plain language, only what's actionable or worth knowing.\n\n${it.body}`,
    });
    await storeChunk({
      source: "news",
      title: it.title,
      chunk: text,
      meta: { url: it.url, ingestedAt: new Date().toISOString() },
    });
  }

  return Response.json({ ingested: items.length });
}
