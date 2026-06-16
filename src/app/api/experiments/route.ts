/**
 * Experiments — the things the family is actively trying. Add new ones, or
 * revise/retire one (which timestamps it closed).
 */
import { addExperiment, updateExperiment } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { childId, body } = await req.json();
  if (!childId || !body) {
    return new Response("childId and body are required", { status: 400 });
  }
  const experiment = await addExperiment(childId, body);
  return Response.json({ experiment });
}

export async function PATCH(req: Request) {
  const { id, status, outcomeNote } = await req.json();
  if (!id) return new Response("id is required", { status: 400 });
  await updateExperiment(id, { status, outcomeNote });
  return Response.json({ ok: true });
}
