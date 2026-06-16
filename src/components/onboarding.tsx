"use client";

import { useState } from "react";

/**
 * First-run onboarding. Creates the child profile directly from the front end
 * (no seed script, no env var) and hands control back once it exists.
 */
export function Onboarding({ onCreated }: { onCreated: () => void | Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    birthMonth: "",
    gradeSetting: "",
    successDefinition: "",
    familyNonNegotiables: "",
    parentWorkingEdge: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !/^\d{4}-\d{2}$/.test(form.birthMonth)) {
      setError("Name and a birth month in YYYY-MM format are required.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/child", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error(await r.text());
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-5 py-12">
      <p className="text-temper text-xs tracking-[0.3em] uppercase mb-2">steelplate</p>
      <h1 className="font-display text-3xl leading-tight mb-2">Set up your child&apos;s profile</h1>
      <p className="text-mist mb-8">
        This becomes the living snapshot the mentor reasons from. You can change all of it later.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field label="Child's name *">
          <input className={inputCls} value={form.name} onChange={set("name")} placeholder="e.g. Sam" />
        </Field>
        <Field label="Birth month * (YYYY-MM)">
          <input className={inputCls} value={form.birthMonth} onChange={set("birthMonth")} placeholder="2013-08" />
        </Field>
        <Field label="Grade / setting">
          <input className={inputCls} value={form.gradeSetting} onChange={set("gradeSetting")} placeholder="entering 7th grade" />
        </Field>
        <Field label="What 'success' means long-term">
          <textarea className={areaCls} value={form.successDefinition} onChange={set("successDefinition")} rows={2} placeholder="able to handle hard things, build real relationships, recover from failure" />
        </Field>
        <Field label="Family non-negotiables">
          <textarea className={areaCls} value={form.familyNonNegotiables} onChange={set("familyNonNegotiables")} rows={2} placeholder="honesty; effort over outcome" />
        </Field>
        <Field label="Your own working edge (the mentor coaches you too)">
          <textarea className={areaCls} value={form.parentWorkingEdge} onChange={set("parentWorkingEdge")} rows={2} placeholder="I rescue too fast when he's stuck" />
        </Field>

        {error && <p className="text-ember text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="self-start bg-temper text-gunmetal font-medium rounded-xl px-6 py-3 disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create profile"}
        </button>
      </form>
    </main>
  );
}

const inputCls =
  "w-full bg-slate border border-steel/40 rounded-xl px-4 py-3 outline-none focus:border-temper";
const areaCls = inputCls + " resize-y";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-mist">{label}</span>
      {children}
    </label>
  );
}
