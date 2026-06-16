"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChild } from "@/components/app-shell";

type Doc = {
  id: string;
  source: string;
  title: string | null;
  chunk: string;
  createdAt: string;
};

export function KnowledgePanel() {
  const { child } = useChild();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  // research form
  const [rTitle, setRTitle] = useState("");
  const [rUrl, setRUrl] = useState("");
  const [rBody, setRBody] = useState("");
  const [distilling, setDistilling] = useState(false);

  // upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/documents?childId=${child.id}`);
    const { documents } = await r.json();
    setDocs(
      (documents as Doc[]).filter((d) => ["upload", "research", "news"].includes(d.source))
    );
  }, [child.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitResearch(e: React.FormEvent) {
    e.preventDefault();
    if (!rBody.trim()) return;
    setDistilling(true);
    setStatus(null);
    const r = await fetch("/api/ingest/research", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ childId: child.id, title: rTitle, url: rUrl, body: rBody }),
    });
    const j = await r.json().catch(() => ({}));
    setDistilling(false);
    if (r.ok) {
      setStatus(`Distilled into ${j.chunks ?? 0} chunk(s).`);
      setRTitle("");
      setRUrl("");
      setRBody("");
      load();
    } else {
      setStatus("Failed to distill research.");
    }
  }

  async function submitUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setStatus(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("childId", child.id);
    const r = await fetch("/api/documents/upload", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    setStatus(r.ok ? j.note ?? `Stored ${j.chunks ?? 0} chunk(s).` : "Upload failed.");
    load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Knowledge</h1>
      <p className="text-mist mb-5 text-sm">
        Add documents and research the mentor can draw on. Everything is embedded for retrieval.
      </p>

      <section className="mb-8">
        <h2 className="text-temper text-xs tracking-[0.2em] uppercase mb-3">Upload a document</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            className="text-sm text-mist file:mr-3 file:rounded-lg file:border-0 file:bg-slate file:px-4 file:py-2 file:text-mist"
          />
          <button
            onClick={submitUpload}
            disabled={uploading}
            className="bg-temper text-gunmetal font-medium rounded-xl px-5 py-2.5 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
        <p className="text-steel text-xs mt-2">Text formats (.txt, .md, .csv, .json) are read directly.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-temper text-xs tracking-[0.2em] uppercase mb-3">Add research</h2>
        <form onSubmit={submitResearch} className="flex flex-col gap-3">
          <input className={inputCls} placeholder="Title" value={rTitle} onChange={(e) => setRTitle(e.target.value)} />
          <input className={inputCls} placeholder="Source URL (optional)" value={rUrl} onChange={(e) => setRUrl(e.target.value)} />
          <textarea
            className={inputCls + " resize-y"}
            rows={6}
            placeholder="Paste the article or paper text. It's distilled into evidence-backed takeaways, then stored."
            value={rBody}
            onChange={(e) => setRBody(e.target.value)}
          />
          <button
            type="submit"
            disabled={distilling || !rBody.trim()}
            className="self-start bg-temper text-gunmetal font-medium rounded-xl px-5 py-2.5 disabled:opacity-50"
          >
            {distilling ? "Distilling…" : "Distill & store"}
          </button>
        </form>
      </section>

      {status && <p className="text-mist text-sm mb-6">{status}</p>}

      <section>
        <h2 className="text-temper text-xs tracking-[0.2em] uppercase mb-3">Stored knowledge</h2>
        <div className="flex flex-col gap-3">
          {docs.length === 0 && <p className="text-steel italic">Nothing stored yet.</p>}
          {docs.map((d) => (
            <article key={d.id} className="border-l-2 border-steel/40 pl-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-medium">
                  <span className="text-temper text-xs uppercase mr-2">{d.source}</span>
                  {d.title ?? "Untitled"}
                </h3>
                <time className="text-steel text-xs">{new Date(d.createdAt).toLocaleDateString()}</time>
              </div>
              <p className="text-mist text-sm leading-relaxed mt-1 line-clamp-4">{d.chunk}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const inputCls = "bg-slate border border-steel/40 rounded-xl px-4 py-3 outline-none focus:border-temper";
