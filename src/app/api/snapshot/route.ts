/**
 * The living snapshot. GET returns both the rendered text (what the mentor
 * reads) and the structured pieces (so the UI can show and edit them). POST
 * applies a bulk structured update and bumps the version.
 */
import { loadSnapshotText, applySnapshotUpdate } from "@/lib/snapshot";
import { getChild, listTraits, listExperiments } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const childId = new URL(req.url).searchParams.get("childId");
  if (!childId) return new Response("Missing childId", { status: 400 });

  const [text, child, allTraits, experiments] = await Promise.all([
    loadSnapshotText(childId),
    getChild(childId),
    listTraits(childId),
    listExperiments(childId),
  ]);

  const traitsByKind: Record<string, typeof allTraits> = {};
  for (const t of allTraits) {
    (traitsByKind[t.kind] ??= []).push(t);
  }

  return Response.json({ text, child, traitsByKind, experiments });
}

export async function POST(req: Request) {
  const { childId, update } = await req.json();
  if (!childId) return new Response("Missing childId", { status: 400 });
  await applySnapshotUpdate(childId, update ?? {});
  return Response.json({ ok: true });
}
