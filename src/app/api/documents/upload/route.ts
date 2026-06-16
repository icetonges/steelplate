/**
 * Document upload -> Vercel Blob -> extract text -> chunk -> embed -> store.
 *
 * Plain-text formats (.txt/.md/.csv/.json) are read directly. PDF/DOCX are
 * stored to Blob and noted, but text extraction for them needs a parser
 * (e.g. unpdf for PDFs, mammoth for .docx) wired where indicated below.
 */
import { put } from "@vercel/blob";
import { storeChunk, chunk } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 120;

const TEXTUAL = /\.(txt|md|markdown|csv|tsv|json|log)$/i;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const childId = form.get("childId") as string | null;
  if (!file) return new Response("Missing file", { status: 400 });

  // @vercel/blob only supports public access for tokens; keep the URL private
  // by not surfacing it anywhere user-facing other than the owner's own UI.
  const blob = await put(`uploads/${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  let text = "";
  let extracted = true;
  if (TEXTUAL.test(file.name) || file.type.startsWith("text/")) {
    text = await file.text();
  } else {
    // TODO: parse PDF/DOCX -> plain text here (unpdf / mammoth).
    extracted = false;
  }

  let chunks = 0;
  if (text.trim()) {
    for (const c of chunk(text)) {
      await storeChunk({
        childId: childId ?? undefined,
        source: "upload",
        title: file.name,
        chunk: c,
        meta: { blobUrl: blob.url },
      });
      chunks++;
    }
  }

  return Response.json({
    ok: true,
    url: blob.url,
    chunks,
    extracted,
    note: extracted
      ? undefined
      : "Stored the file, but text extraction for this type isn't wired yet (PDF/DOCX). Paste its text in Knowledge → Research for now.",
  });
}
