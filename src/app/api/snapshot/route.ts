import { loadSnapshotText } from "@/lib/snapshot";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const childId = new URL(req.url).searchParams.get("childId");
  if (!childId) return new Response("Missing childId", { status: 400 });
  const text = await loadSnapshotText(childId);
  return Response.json({ snapshot: text });
}
