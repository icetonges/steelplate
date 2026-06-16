"use client";

import { useCallback, useEffect, useState } from "react";
import { useChild } from "@/components/app-shell";

type Entry = { id: string; title: string | null; chunk: string; createdAt: string };

export function DiaryPanel() {
  const { child } = useChild();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);

  const load = useCallback(async () => {
    const r = await fetch(`/api/documents?source=diary&childId=${child.id}`);
    const { documents } = await r.json();
    setEntries(documents);
  }, [child.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    await fetch("/api/diary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ childId: child.id, body, title: title || undefined }),
    });
    setBody("");
    setTitle("");
    setSaving(false);
    load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Diary</h1>
      <p className="text-mist mb-5 text-sm">
        Longer reflections. Each entry is embedded so the mentor can recall it later.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-3 mb-8">
        <input
          className="bg-slate border border-steel/40 rounded-xl px-4 py-3 outline-none focus:border-temper"
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="bg-slate border border-steel/40 rounded-xl px-4 py-3 outline-none focus:border-temper resize-y"
          rows={6}
          placeholder="What happened, what you noticed, what you're wondering about…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button
          type="submit"
          disabled={saving || !body.trim()}
          className="self-start bg-temper text-gunmetal font-medium rounded-xl px-5 py-2.5 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save entry"}
        </button>
      </form>

      <div className="flex flex-col gap-4">
        {entries.length === 0 && <p className="text-steel italic">No entries yet.</p>}
        {entries.map((e) => (
          <article key={e.id} className="border-l-2 border-steel/40 pl-4">
            <div className="flex items-baseline justify-between gap-3">
              {e.title && <h3 className="font-medium">{e.title}</h3>}
              <time className="text-steel text-xs">{new Date(e.createdAt).toLocaleDateString()}</time>
            </div>
            <p className="whitespace-pre-wrap text-mist leading-relaxed mt-1">{e.chunk}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
