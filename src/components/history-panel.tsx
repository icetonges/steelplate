"use client";

import { useCallback, useEffect, useState } from "react";
import { useChild } from "@/components/app-shell";

type Result = { source: string; title: string | null; chunk: string };
type CheckIn = { id: string; body: string; createdAt: string };

const SOURCES = ["check_in", "diary", "upload", "research", "news"];

export function HistoryPanel() {
  const { child } = useChild();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string[]>([]);
  const [results, setResults] = useState<Result[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

  const loadCheckIns = useCallback(async () => {
    const r = await fetch(`/api/checkins?childId=${child.id}`);
    const { checkIns } = await r.json();
    setCheckIns(checkIns);
  }, [child.id]);

  useEffect(() => {
    loadCheckIns();
  }, [loadCheckIns]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const r = await fetch("/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        childId: child.id,
        query,
        sources: active.length ? active : undefined,
      }),
    });
    const { results } = await r.json();
    setResults(results);
    setSearching(false);
  }

  function toggle(s: string) {
    setActive((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s]));
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl mb-1">History</h1>
        <p className="text-mist text-sm">
          Semantic search across everything stored, plus your recent check-ins.
        </p>
      </div>

      <section>
        <form onSubmit={search} className="flex gap-2 mb-3">
          <input
            className="flex-1 bg-slate border border-steel/40 rounded-xl px-4 py-3 outline-none focus:border-temper"
            placeholder="Search history — e.g. 'how did the bedtime experiment go?'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            disabled={searching}
            className="bg-temper text-gunmetal font-medium rounded-xl px-5 disabled:opacity-50"
          >
            {searching ? "…" : "Search"}
          </button>
        </form>
        <div className="flex flex-wrap gap-2 mb-4">
          {SOURCES.map((s) => (
            <button
              key={s}
              onClick={() => toggle(s)}
              className={
                "text-xs rounded-lg px-3 py-1 border " +
                (active.includes(s)
                  ? "bg-temper text-gunmetal border-temper"
                  : "border-steel/40 text-mist hover:border-temper")
              }
            >
              {s}
            </button>
          ))}
        </div>

        {results && (
          <div className="flex flex-col gap-3">
            {results.length === 0 && <p className="text-steel italic">No matches.</p>}
            {results.map((r, i) => (
              <article key={i} className="border-l-2 border-temper pl-4">
                <span className="text-temper text-xs uppercase">
                  {r.source}
                  {r.title ? ` · ${r.title}` : ""}
                </span>
                <p className="text-mist text-sm leading-relaxed mt-1">{r.chunk}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-temper text-xs tracking-[0.2em] uppercase mb-3">Recent check-ins</h2>
        <div className="flex flex-col gap-3">
          {checkIns.length === 0 && <p className="text-steel italic">No check-ins yet.</p>}
          {checkIns.map((c) => (
            <article key={c.id} className="flex gap-3">
              <time className="text-steel text-xs shrink-0 w-20">
                {new Date(c.createdAt).toLocaleDateString()}
              </time>
              <p className="text-mist text-sm leading-relaxed">{c.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
