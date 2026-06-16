/**
 * The child profile. Single-tenant: GET returns the one profile (or null so the
 * UI can show onboarding), POST creates it, PATCH updates its core fields.
 */
import { getFirstChild, createChild, updateChildCore } from "@/lib/data";

export const runtime = "nodejs";

export async function GET() {
  const child = await getFirstChild();
  return Response.json({ child });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.name || !body?.birthMonth) {
    return new Response("name and birthMonth are required", { status: 400 });
  }
  const child = await createChild(body);
  return Response.json({ child });
}

export async function PATCH(req: Request) {
  const { id, ...patch } = await req.json();
  if (!id) return new Response("id is required", { status: 400 });
  const child = await updateChildCore(id, patch);
  return Response.json({ child });
}
