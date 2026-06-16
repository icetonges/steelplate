/**
 * Diary — longer reflections the parent writes directly. Stored and embedded
 * (source "diary") so the mentor retrieves them as grounding later.
 */
import { recordDiary } from "@/lib/data";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { childId, body, title } = await req.json();
  if (!childId || !body) {
    return new Response("childId and body are required", { status: 400 });
  }
  await recordDiary(childId, body, title);
  return Response.json({ ok: true });
}
