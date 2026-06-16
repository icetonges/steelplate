/**
 * Lists stored knowledge for the child — every embedded chunk (diary, uploads,
 * news, research, check-ins). Optional ?source= filter. Powers the History view.
 */
import { listDocuments } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const childId = url.searchParams.get("childId");
  const source = url.searchParams.get("source") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 100);
  if (!childId) return new Response("childId is required", { status: 400 });
  const documents = await listDocuments(childId, source, limit);
  return Response.json({ documents });
}
