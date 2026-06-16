/**
 * Document upload -> Vercel Blob -> parse -> chunk -> embed -> store.
 * STUB: the parse step depends on file type (pdf/docx). Wire a parser
 * (e.g. unpdf for PDFs, mammoth for docx) where indicated.
 */
import { put } from "@vercel/blob";
import { storeChunk, chunk } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const childId = form.get("childId") as string | null;
  if (!file) return new Response("Missing file", { status: 400 });

  const blob = await put(`uploads/${Date.now()}-${file.name}`, file, { access: "private" as any });

  // TODO: parse file -> plain text based on file.type.
  const text = await file.text(); // works for .txt/.md; replace for pdf/docx.

  for (const c of chunk(text)) {
    await storeChunk({
      childId: childId ?? undefined,
      source: "upload",
      title: file.name,
      chunk: c,
      meta: { blobUrl: blob.url },
    });
  }
  return Response.json({ ok: true, url: blob.url });
}
