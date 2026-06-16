/**
 * Snapshot traits (strength | growth_edge | graduated | watch | relationship |
 * leadership | courage). Add or remove individual items from the UI.
 */
import { addTrait, deleteTrait } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { childId, kind, body } = await req.json();
  if (!childId || !kind || !body) {
    return new Response("childId, kind and body are required", { status: 400 });
  }
  const trait = await addTrait(childId, kind, body);
  return Response.json({ trait });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new Response("id is required", { status: 400 });
  await deleteTrait(id);
  return Response.json({ ok: true });
}
