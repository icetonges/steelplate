/**
 * MODEL CATALOG — the single source of truth for every model the app can use.
 *
 * This is display-and-selection metadata (name, provider, pricing, badges) used
 * by any model picker, plus the canonical list the brain chain resolves against
 * (see modelById / BRAIN_CHAIN in ./models.ts). Add or retire a model here and
 * the rest of the app follows.
 *
 * NOTE ON IDS & PRICES: prices are per 1M tokens and move fast — verify against
 * each provider's docs before relying on them for billing. Gemini 3.5 / 3.1
 * Flash IDs follow Google AI Studio's latest lineup. DeepSeek uses the current
 * V4 IDs (deepseek-v4-flash / deepseek-v4-pro); the old deepseek-chat /
 * deepseek-reasoner names are deprecated aliases. Anthropic Opus is
 * claude-opus-4-8 (there is no 4-6).
 */

export type Provider = "google" | "groq" | "anthropic" | "deepseek";

export interface ModelConfig {
  id: string;
  name: string;
  provider: Provider;
  providerLabel?: string;
  providerColor: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
  contextWindow: string;
  description: string;
  isFree: boolean;
  isDefault: boolean;
  supportsVision?: boolean;
  badge?: string;
}

export const MODELS = [
  // ---- Google Gemini (via Google AI Studio) ----
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "google",
    providerLabel: "Google",
    providerColor: "#4285f4",
    inputPricePer1M: 1.5,
    outputPricePer1M: 9.0,
    contextWindow: "1M",
    description:
      "Flagship value model - ultimate balance of intelligence, speed, and deep thinking capabilities.",
    isFree: false,
    isDefault: true,
    supportsVision: true,
    badge: "Recommended",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    provider: "google",
    providerLabel: "Google",
    providerColor: "#4285f4",
    inputPricePer1M: 0.25,
    outputPricePer1M: 1.5,
    contextWindow: "1M",
    description:
      "High-volume agentic tasks - ultra-low latency option optimized for massive scale.",
    isFree: false,
    isDefault: false,
    supportsVision: true,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    providerLabel: "Google",
    providerColor: "#4285f4",
    inputPricePer1M: 0.3,
    outputPricePer1M: 2.5,
    contextWindow: "1M",
    description:
      "Proven reasoning staple - exceptional price-to-performance ratio with 1M token context.",
    isFree: false,
    isDefault: false,
    supportsVision: true,
  },

  // ---- Groq (free tier, ultra-fast inference) ----
  {
    id: "groq/compound-beta",
    name: "Compound Beta",
    provider: "groq",
    providerLabel: "Groq",
    providerColor: "#f55036",
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    contextWindow: "128K",
    description: "Agentic - built-in web search - auto tool use",
    isFree: true,
    isDefault: false,
    supportsVision: false,
    badge: "New",
  },
  {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout",
    provider: "groq",
    providerLabel: "Groq",
    providerColor: "#f55036",
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    contextWindow: "128K",
    description: "Llama 4 - MoE architecture - vision - 128K",
    isFree: true,
    isDefault: false,
    supportsVision: true,
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: "groq",
    providerLabel: "Groq",
    providerColor: "#f55036",
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    contextWindow: "128K",
    description: "Best Llama 3 - ultra-fast inference - 128K",
    isFree: true,
    isDefault: false,
    supportsVision: false,
    badge: "Fast",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    provider: "groq",
    providerLabel: "Groq",
    providerColor: "#f55036",
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    contextWindow: "128K",
    description: "Lightning-fast - great for simple tasks - 128K",
    isFree: true,
    isDefault: false,
    supportsVision: false,
  },

  // ---- DeepSeek (paid, cheapest reasoning) ----
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    provider: "deepseek",
    providerLabel: "DeepSeek",
    providerColor: "#4d6bfe",
    inputPricePer1M: 0.14,
    outputPricePer1M: 0.28,
    contextWindow: "128K",
    description:
      "Cheapest reasoning - thinking + non-thinking modes - ultra-low cost",
    isFree: false,
    isDefault: false,
    supportsVision: false,
    badge: "Value",
  },
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    provider: "deepseek",
    providerLabel: "DeepSeek",
    providerColor: "#4d6bfe",
    inputPricePer1M: 0.435,
    outputPricePer1M: 0.87,
    contextWindow: "128K",
    description:
      "High-value reasoning, coding, long-context & agentic workflows",
    isFree: false,
    isDefault: false,
    supportsVision: false,
  },

  // ---- Anthropic Claude (paid) ----
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    providerLabel: "Anthropic",
    providerColor: "#c85a3a",
    inputPricePer1M: 3,
    outputPricePer1M: 15,
    contextWindow: "200K",
    description: "Balanced performance - 200K",
    isFree: false,
    isDefault: false,
    supportsVision: true,
    badge: "Balanced",
  },
  {
    id: "claude-opus-4-8",
    name: "Claude Opus 4.8",
    provider: "anthropic",
    providerLabel: "Anthropic",
    providerColor: "#c85a3a",
    inputPricePer1M: 15,
    outputPricePer1M: 75,
    contextWindow: "200K",
    description: "Most capable - 200K",
    isFree: false,
    isDefault: false,
    supportsVision: true,
  },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    providerLabel: "Anthropic",
    providerColor: "#c85a3a",
    inputPricePer1M: 0.8,
    outputPricePer1M: 4,
    contextWindow: "200K",
    description: "Fastest Anthropic model - 200K",
    isFree: false,
    isDefault: false,
    supportsVision: true,
  },
] as const satisfies readonly ModelConfig[];

export type ModelId = (typeof MODELS)[number]["id"];

export const DEFAULT_MODEL_ID: ModelId =
  MODELS.find((m) => m.isDefault)?.id ?? "gemini-3.5-flash";

/** Look up a model's metadata by id. */
export function getModel(id: ModelId): ModelConfig | undefined {
  return MODELS.find((m) => m.id === id);
}
