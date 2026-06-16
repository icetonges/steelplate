/**
 * Lists recent check-ins (the parent's chat messages, captured each turn).
 */
import { listCheckIns } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const childId = url.searchParams.get("childId");
  const limit = Number(url.searchParams.get("limit") ?? 50);
  if (!childId) return new Response("childId is required", { status: 400 });
  const checkIns = await listCheckIns(childId, limit);
  return Response.json({ checkIns });
}
