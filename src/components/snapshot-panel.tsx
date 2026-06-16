"use client";

import { useCallback, useEffect, useState } from "react";
import { useChild } from "@/components/app-shell";

type Trait = { id: string; kind: string; body: string };
type Experiment = { id: string; body: string; status: string; outcomeNote: string | null };
type SnapshotData = {
  text: string | null;
  child: Record<string, unknown> | null;
  traitsByKind: Record<string, Trait[]>;
  experiments: Experiment[];
};

const KINDS: { kind: string; label: string }[] = [
  { kind: "strength", label: "Strengths" },
  { kind: "growth_edge", label: "Growth edges" },
  { kind: "relationship", label: "Relationships & social" },
  { kind: "leadership", label: "Leadership & initiative" },
  { kind: "courage", label: "Courage & worry" },
  { kind: "watch", label: "Watch-list" },
  { kind: "graduated", label: "Graduated (proof it's working)" },
];

const CORE: { key: string; label: string }[] = [
  { key: "gradeSetting", label: "Grade / setting" },
  { key: "stageNotes", label: "Developmental stage notes" },
  { key: "successDefinition", label: "What 'success' means long-term" },
  { key: "familyNonNegotiables", label: "Family non-negotiables" },
  { key: "parentWorkingEdge", label: "Your own working edge" },
];

export function SnapshotPanel() {
  const { child, refresh } = useChild();
  const [data, setData] = useState<SnapshotData | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/snapshot?childId=${child.id}`);
    setData(await r.json());
  }, [child.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addTrait(kind: string, body: string) {
    await fetch("/api/traits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ childId: child.id, kind, body }),
    });
    load();
  }
  async function delTrait(id: string) {
    await fetch(`/api/traits?id=${id}`, { method: "DELETE" });
    load();
  }
  async function addExperiment(body: string) {
    await fetch("/api/experiments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ childId: child.id, body }),
    });
    load();
  }
  async function retireExperiment(id: string) {
    await fetch("/api/experiments", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status: "retired" }),
    });
    load();
  }
  async function saveCore(key: string, value: string) {
    await fetch("/api/child", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: child.id, [key]: value }),
    });
    await refresh();
    load();
  }

  if (!data) return <p className="text-steel">Loading snapshot…</p>;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl mb-1">Snapshot</h1>
        <p className="text-mist text-sm">
          The living state the mentor reasons from — version {child.snapshotVersion}. Edit anything here.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-temper text-xs tracking-[0.2em] uppercase">Profile</h2>
        {CORE.map((f) => (
          <CoreField
            key={f.key}
            label={f.label}
            value={(child as Record<string, unknown>)[f.key] as string | null}
            onSave={(v) => saveCore(f.key, v)}
          />
        ))}
      </section>

      {KINDS.map(({ kind, label }) => (
        <TraitSection
          key={kind}
          label={label}
          items={data.traitsByKind[kind] ?? []}
          onAdd={(body) => addTrait(kind, body)}
          onDelete={delTrait}
        />
      ))}

      <ExperimentSection
        items={data.experiments}
        onAdd={addExperiment}
        onRetire={retireExperiment}
      />

      <section>
        <button onClick={() => setShowRaw((s) => !s)} className="text-steel text-sm underline">
          {showRaw ? "Hide" : "Show"} the exact text the mentor reads
        </button>
        {showRaw && (
          <pre className="mt-3 bg-slate rounded-xl p-4 text-xs text-mist whitespace-pre-wrap overflow-x-auto">
            {data.text}
          </pre>
        )}
      </section>
    </div>
  );
}

function CoreField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string | null;
  onSave: (v: string) => void | Promise<void>;
}) {
  const [v, setV] = useState(value ?? "");
  const [dirty, setDirty] = useState(false);
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-mist">{label}</span>
      <div className="flex gap-2">
        <textarea
          className="flex-1 bg-slate border border-steel/40 rounded-xl px-4 py-2.5 outline-none focus:border-temper resize-y"
          rows={2}
          value={v}
          onChange={(e) => {
            setV(e.target.value);
            setDirty(true);
          }}
        />
        {dirty && (
          <button
            onClick={async () => {
              await onSave(v);
              setDirty(false);
            }}
            className="bg-temper text-gunmetal text-sm rounded-xl px-4 self-stretch"
          >
            Save
          </button>
        )}
      </div>
    </label>
  );
}

function TraitSection({
  label,
  items,
  onAdd,
  onDelete,
}: {
  label: string;
  items: Trait[];
  onAdd: (body: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  return (
    <section>
      <h2 className="text-temper text-xs tracking-[0.2em] uppercase mb-3">{label}</h2>
      <ul className="flex flex-col gap-2 mb-3">
        {items.length === 0 && <li className="text-steel italic text-sm">None yet.</li>}
        {items.map((t) => (
          <li key={t.id} className="flex items-start justify-between gap-3 bg-slate rounded-xl px-4 py-2.5">
            <span className="text-mist text-sm">{t.body}</span>
            <button onClick={() => onDelete(t.id)} className="text-steel hover:text-ember text-sm shrink-0">
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-slate border border-steel/40 rounded-xl px-4 py-2 outline-none focus:border-temper text-sm"
          placeholder={`Add to ${label.toLowerCase()}…`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              onAdd(draft.trim());
              setDraft("");
            }
          }}
        />
        <button
          onClick={() => {
            if (draft.trim()) {
              onAdd(draft.trim());
              setDraft("");
            }
          }}
          className="bg-slate border border-steel/40 rounded-xl px-4 text-sm hover:border-temper"
        >
          Add
        </button>
      </div>
    </section>
  );
}

function ExperimentSection({
  items,
  onAdd,
  onRetire,
}: {
  items: Experiment[];
  onAdd: (body: string) => void | Promise<void>;
  onRetire: (id: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const active = items.filter((e) => e.status === "active");
  const past = items.filter((e) => e.status !== "active");
  return (
    <section>
      <h2 className="text-temper text-xs tracking-[0.2em] uppercase mb-3">Active experiments</h2>
      <ul className="flex flex-col gap-2 mb-3">
        {active.length === 0 && <li className="text-steel italic text-sm">None active.</li>}
        {active.map((e) => (
          <li key={e.id} className="flex items-start justify-between gap-3 bg-slate rounded-xl px-4 py-2.5">
            <span className="text-mist text-sm">{e.body}</span>
            <button onClick={() => onRetire(e.id)} className="text-steel hover:text-temper text-xs shrink-0">
              retire
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 bg-slate border border-steel/40 rounded-xl px-4 py-2 outline-none focus:border-temper text-sm"
          placeholder="Start a new experiment…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              onAdd(draft.trim());
              setDraft("");
            }
          }}
        />
        <button
          onClick={() => {
            if (draft.trim()) {
              onAdd(draft.trim());
              setDraft("");
            }
          }}
          className="bg-slate border border-steel/40 rounded-xl px-4 text-sm hover:border-temper"
        >
          Add
        </button>
      </div>
      {past.length > 0 && (
        <details className="text-sm">
          <summary className="text-steel cursor-pointer">Retired / revised ({past.length})</summary>
          <ul className="flex flex-col gap-1 mt-2">
            {past.map((e) => (
              <li key={e.id} className="text-steel line-through px-4">
                {e.body}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
