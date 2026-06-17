"use client";

import { useState } from "react";
import { useChild } from "@/components/app-shell";
import { ModelSelect } from "@/components/model-select";
import { MODELS, DEFAULT_MODEL_ID } from "@/lib/model-catalog";

type Side = { model: string; text: string; ms?: number; error?: boolean };

const SECOND_DEFAULT =
  MODELS.find((m) => m.id !== DEFAULT_MODEL_ID && m.provider === "anthropic")?.id ??
  MODELS.find((m) => m.id !== DEFAULT_MODEL_ID)?.id ??
  DEFAULT_MODEL_ID;

function modelName(id: string) {
  return MODELS.find((m) => m.id === id)?.name ?? id;
}

export function ComparePanel() {
  const { child } = useChild();
  const [modelA, setModelA] = useState<string>(DEFAULT_MODEL_ID);
  const [modelB, setModelB] = useState<string>(SECOND_DEFAULT);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [a, setA] = useState<Side | null>(null);
  const [b, setB] = useState<Side | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setA(null);
    setB(null);
    const r = await fetch("/api/compare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        childId: child.id,
        messages: [{ role: "user", content: input }],
        modelA,
        modelB,
      }),
    });
    const j = await r.json().catch(() => null);
    setLoading(false);
    if (j) {
      setA(j.a);
      setB(j.b);
    }
  }

  return (
    <div>
      <form onSubmit={run} className="flex flex-col gap-3 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-steel uppercase tracking-wide">Model A</span>
            <ModelSelect value={modelA} onChange={setModelA} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-steel uppercase tracking-wide">Model B</span>
            <ModelSelect value={modelB} onChange={setModelB} />
          </label>
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask both models the same thing…"
            className="flex-1 bg-slate border border-steel/40 rounded-xl px-4 py-3 outline-none focus:border-temper"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-temper text-gunmetal font-medium rounded-xl px-5 disabled:opacity-50"
          >
            {loading ? "…" : "Compare"}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-2 gap-4">
        <Column title={modelName(modelA)} side={a} loading={loading} />
        <Column title={modelName(modelB)} side={b} loading={loading} />
      </div>
    </div>
  );
}

function Column({ title, side, loading }: { title: string; side: Side | null; loading: boolean }) {
  return (
    <div className="border border-steel/20 rounded-xl p-4 min-h-[12rem]">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-temper text-sm font-medium">{title}</h3>
        {side?.ms != null && <span className="text-steel text-xs">{(side.ms / 1000).toFixed(1)}s</span>}
      </div>
      {loading && !side && <p className="text-steel italic text-sm">Thinking…</p>}
      {side && (
        <p className={"whitespace-pre-wrap leading-relaxed text-sm " + (side.error ? "text-ember" : "text-parchment")}>
          {side.text}
        </p>
      )}
      {!loading && !side && <p className="text-steel italic text-sm">Output will appear here.</p>}
    </div>
  );
}
