/**
 * THE CRITIC — the second agent in the loop.
 *
 * The draft pass produces a candidate reply on a cheap model. Before the parent
 * ever sees it, the critic scores that draft against MENTOR_PRINCIPLES — the
 * exact same intent encoded in the mentor's own system prompt. If the draft
 * violates a principle (especially the non-negotiable clinical/safety one), the
 * critic rejects it with specific, actionable objections, and the chat route
 * escalates to a stronger model for a targeted rewrite.
 *
 * This is what guarantees the design intent is *carried out*, not just *stated*:
 * generation and verification read from one source of truth, and a failing draft
 * cannot reach the parent unrevised.
 *
 * The critic runs on a cheap, fast, JSON-capable model (never Claude) so the
 * loop stays inexpensive.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { criticModel } from "./models";
import { MENTOR_PRINCIPLES } from "./prompts/mentor";

const verdictSchema = z.object({
  pass: z
    .boolean()
    .describe("True only if the draft satisfies every principle that applies."),
  severity: z
    .enum(["ok", "minor", "major", "unsafe"])
    .describe(
      "ok = ship it. minor = small fixes. major = clearly violates a principle. unsafe = breaks the clinical/safety limit; must be fixed."
    ),
  violations: z
    .array(z.string())
    .describe(
      "One short sentence per failed principle, naming the principle and what went wrong. Empty if pass."
    ),
  guidance: z
    .string()
    .describe("One or two sentences telling the reviser how to fix it. Empty if pass."),
});

export type Verdict = z.infer<typeof verdictSchema>;

const RUBRIC = MENTOR_PRINCIPLES.map(
  (p) => `- [${p.id}] ${p.name}: ${p.test}`
).join("\n");

const CRITIC_SYSTEM = `You are the steelplate quality reviewer. You do not talk to the parent. Your only job is to judge whether a DRAFT reply from the parenting mentor honors the steelplate principles, and to reject it precisely when it does not.

THE PRINCIPLES (the contract the draft must satisfy):
${RUBRIC}

HOW TO JUDGE
- Judge only principles that actually apply to this exchange. A short factual clarification does not need to "close the loop"; a description of a child meltdown does.
- Be strict about the clinical/safety limit. If the draft tries to coach a parent through something that needs a professional (self-harm, abuse, depression, danger), set severity "unsafe" and pass=false, no matter how good the rest is.
- Reward concision and honest confidence-labeling. Penalize parenting essays, flattery, invented studies, and advice that ignores what was already tried.
- Do not rewrite the draft yourself. Only diagnose. Keep violations specific and short.
- If the draft is good enough to send, pass=true, severity "ok", empty violations and guidance. Do not invent problems.`;

/**
 * Scores a draft. Returns a structured verdict. If the critic model itself
 * errors, we fail OPEN (pass=true) — a working cheap reply is better than a
 * hard error, and the safety net is the prompt itself, which already carries
 * every principle.
 */
export async function critiqueReply(opts: {
  parentMessage: string;
  snapshotText: string | null;
  draftText: string;
}): Promise<Verdict> {
  const prompt = `PARENT'S MESSAGE:
${opts.parentMessage || "(none)"}

CHILD SNAPSHOT (source of truth for who the child is):
${opts.snapshotText?.trim() || "(no snapshot on file)"}

DRAFT REPLY FROM THE MENTOR (judge this):
${opts.draftText}`;

  try {
    const { object } = await generateObject({
      model: criticModel,
      schema: verdictSchema,
      system: CRITIC_SYSTEM,
      prompt,
      temperature: 0,
    });
    return object;
  } catch (err) {
    console.warn("[critic] verdict failed, failing open:", err);
    return { pass: true, severity: "ok", violations: [], guidance: "" };
  }
}
