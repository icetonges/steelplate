/**
 * MODEL ROUTING — the chain (after anyfeddemo.vercel.app: "Gemini → Groq → Claude").
 *
 * Models and their metadata live in ./model-catalog.ts (the single source of
 * truth). This file turns catalog ids into runnable provider instances and
 * defines the cost-ordered brain chain.
 *
 * Design rule: Claude is NOT the default — it is the most expensive, so it is
 * the quality backstop. Each turn starts on the cheapest capable model and only
 * escalates upward on failure or a critic rejection.
 *
 *   Tier 0  Gemini  (google)     — cheapest, fast, huge context. The default brain.
 *   Tier 1  Groq    (llama etc.) — free/cheap, very fast. First escalation.
 *   Tier 2  Claude  (anthropic)  — most capable, most expensive. Quality backstop only.
 *
 * DeepSeek is available in the catalog and via modelById (e.g. for a picker UI
 * or as a cheap reasoning tier) but is not in the default 3-tier chain.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import type { LanguageModelV1 } from "ai";
import {
  MODELS,
  getModel,
  DEFAULT_MODEL_ID,
  type ModelId,
  type Provider,
} from "./model-catalog";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });

/** Which env var holds the API key for each provider. */
export const PROVIDER_KEY_ENV: Record<Provider, string> = {
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  groq: "GROQ_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
};

/** Resolve any catalog id to a runnable model instance. */
export function modelById(id: ModelId): LanguageModelV1 {
  const m = getModel(id);
  if (!m) throw new Error(`Unknown model id: ${id}`);
  switch (m.provider) {
    case "google":
      return google(id);
    case "groq":
      return groq(id);
    case "anthropic":
      return anthropic(id);
    case "deepseek":
      return deepseek(id);
  }
}

export type BrainTier = {
  /** Stable name used in logs and the x-steelplate-brain header. */
  name: Provider;
  /** Catalog id this tier runs. */
  id: ModelId;
  /** Env var whose presence means this tier is runnable. */
  keyEnv: string;
  model: LanguageModelV1;
};

function tier(name: Provider, id: ModelId): BrainTier {
  return { name, id, keyEnv: PROVIDER_KEY_ENV[name], model: modelById(id) };
}

/**
 * THE BRAIN CHAIN — ordered cheapest → most expensive. Each tier's id is
 * overridable by env so you can tune cost/quality without a code change.
 */
export const BRAIN_CHAIN: BrainTier[] = [
  tier("google", (process.env.GEMINI_MODEL as ModelId) ?? DEFAULT_MODEL_ID),
  tier("groq", (process.env.GROQ_MODEL as ModelId) ?? "llama-3.3-70b-versatile"),
  tier("anthropic", (process.env.CLAUDE_MODEL as ModelId) ?? "claude-sonnet-4-6"),
];

/** True if the tier's required API key is present in the environment. */
export function tierHasKey(t: BrainTier): boolean {
  return Boolean(process.env[t.keyEnv]);
}

/**
 * The critic and ingestion run on the cheapest model (never Claude), since the
 * whole point is to keep the expensive tier idle. Default to the cheapest
 * Gemini tier; override with CRITIC_MODEL / INGEST_MODEL.
 */
export const criticModel: LanguageModelV1 = modelById(
  (process.env.CRITIC_MODEL as ModelId) ?? "gemini-3.1-flash-lite"
);

export const ingestModel: LanguageModelV1 = modelById(
  (process.env.INGEST_MODEL as ModelId) ?? "gemini-3.1-flash-lite"
);

export { MODELS, DEFAULT_MODEL_ID };
export type { ModelId };
