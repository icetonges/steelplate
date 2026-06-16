/**
 * THE CHAIN EXECUTOR.
 *
 * Runs the brain as a cost-ordered fallback chain (Gemini → Groq → Claude).
 * Two entry points:
 *   - generateWithChain: non-streaming, used for the DRAFT pass (so the critic
 *     can read the whole reply before the parent ever sees it).
 *   - streamWithChain:   streaming, used for the final REVISE pass.
 *
 * Both accept `startTier` so the agent loop can *escalate*: a rejected draft
 * re-runs starting one rung higher up the chain. Both skip tiers whose API key
 * is missing, and fall through to the next tier on any provider error.
 */

import { generateText, streamText, type CoreMessage } from "ai";
import { BRAIN_CHAIN, tierHasKey, type BrainTier } from "./models";

type CommonOpts = {
  system: string;
  messages: CoreMessage[];
  tools?: Parameters<typeof generateText>[0]["tools"];
  temperature?: number;
  maxSteps?: number;
  /** Index into BRAIN_CHAIN to begin at. 0 = Gemini (default), 1 = Groq, 2 = Claude. */
  startTier?: number;
};

/** The ordered tiers that are actually runnable (have a key), from startTier on. */
function runnableTiers(startTier = 0): BrainTier[] {
  return BRAIN_CHAIN.slice(startTier).filter(tierHasKey);
}

/**
 * DRAFT pass: try each tier in order, return the first that succeeds.
 * Returns the generated text plus which tier produced it (so the loop knows
 * where to escalate from, and so we can surface it in a response header).
 */
export async function generateWithChain(opts: CommonOpts): Promise<{
  text: string;
  tier: BrainTier;
  tierIndex: number;
}> {
  const tiers = runnableTiers(opts.startTier);
  if (tiers.length === 0) {
    throw new Error(
      "No brain tier is configured. Set at least one of " +
        BRAIN_CHAIN.map((t) => t.keyEnv).join(", ")
    );
  }

  let lastErr: unknown;
  for (const tier of tiers) {
    try {
      const res = await generateText({
        model: tier.model,
        system: opts.system,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        tools: opts.tools,
        maxSteps: opts.maxSteps ?? 4,
      });
      return {
        text: res.text,
        tier,
        tierIndex: BRAIN_CHAIN.indexOf(tier),
      };
    } catch (err) {
      // Rate limit, outage, bad key — fall through to the next (more expensive) tier.
      lastErr = err;
      console.warn(`[brain] tier "${tier.name}" failed, escalating:`, err);
    }
  }
  throw lastErr ?? new Error("All brain tiers failed.");
}

/**
 * REVISE / final pass: stream from the first runnable tier at/after startTier.
 * On a provider error before any tokens stream, fall through to the next tier.
 * Returns the streamText result so the caller can shape the HTTP response and
 * read `chosenTier` to report which model answered.
 */
export async function streamWithChain(opts: CommonOpts): Promise<{
  result: ReturnType<typeof streamText>;
  tier: BrainTier;
  tierIndex: number;
}> {
  const tiers = runnableTiers(opts.startTier);
  if (tiers.length === 0) {
    throw new Error(
      "No brain tier is configured. Set at least one of " +
        BRAIN_CHAIN.map((t) => t.keyEnv).join(", ")
    );
  }

  let lastErr: unknown;
  for (const tier of tiers) {
    try {
      const result = streamText({
        model: tier.model,
        system: opts.system,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        tools: opts.tools,
        maxSteps: opts.maxSteps ?? 4,
        onError: (e) => console.warn(`[brain] stream error on "${tier.name}":`, e),
      });
      // Touch the stream so a synchronous setup error (bad key) surfaces here
      // and we can fall through; token-level errors are handled by onError.
      void result.warnings;
      return { result, tier, tierIndex: BRAIN_CHAIN.indexOf(tier) };
    } catch (err) {
      lastErr = err;
      console.warn(`[brain] tier "${tier.name}" stream init failed, escalating:`, err);
    }
  }
  throw lastErr ?? new Error("All brain tiers failed.");
}
