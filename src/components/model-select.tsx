"use client";

import { MODELS, type Provider } from "@/lib/model-catalog";

const PROVIDER_LABELS: Record<Provider, string> = {
  google: "Google Gemini",
  groq: "Groq",
  deepseek: "DeepSeek",
  anthropic: "Anthropic Claude",
};

const ORDER: Provider[] = ["google", "groq", "deepseek", "anthropic"];

/**
 * Model dropdown built from the catalog (src/lib/model-catalog.ts). With
 * includeAuto, the first option is "Auto" (the chain + critic) — value "".
 */
export function ModelSelect({
  value,
  onChange,
  includeAuto = false,
}: {
  value: string;
  onChange: (id: string) => void;
  includeAuto?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate border border-steel/40 rounded-lg px-3 py-2 text-sm outline-none focus:border-temper"
    >
      {includeAuto && <option value="">Auto · chain + critic</option>}
      {ORDER.map((provider) => {
        const group = MODELS.filter((m) => m.provider === provider);
        if (group.length === 0) return null;
        return (
          <optgroup key={provider} label={PROVIDER_LABELS[provider]}>
            {group.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.isFree ? " · free" : ""}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
