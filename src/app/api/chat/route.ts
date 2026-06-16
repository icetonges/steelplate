/**
 * THE MENTOR ROUTE — where a parent's message meets the brain, run as a
 * draft → critic → revise/escalate loop over the Gemini → Groq → Claude chain.
 *
 * Flow on each turn:
 *   1. Load the live Snapshot for the child + retrieve grounding context (RAG).
 *   2. DRAFT: answer on the cheapest brain tier (Gemini), with a read-only
 *      history-search tool and the snapshot-update tool. Claude is NOT used here.
 *   3. CRITIQUE: a cheap second agent scores the draft against the steelplate
 *      principles (the same intent encoded in the system prompt).
 *   4a. If it passes → stream the draft back as-is. (Cheapest path: 2 cheap calls.)
 *   4b. If it fails → REVISE: re-answer with the critic's specific objections,
 *       escalating one rung up the chain (Groq, then Claude as the backstop).
 *       Unsafe drafts escalate straight to the strongest tier.
 *   5. Persist the parent's message as a check-in (embedded for future RAG).
 *
 * The chosen model is surfaced in the `x-steelplate-brain` response header.
 *
 * Production note: gate this route behind auth (see README). It handles
 * sensitive information about a child — single-tenant, private, locked to you.
 */

import {
  tool,
  createDataStreamResponse,
  formatDataStreamPart,
  type CoreMessage,
} from "ai";
import { z } from "zod";
import { generateWithChain, streamWithChain } from "@/lib/brain";
import { BRAIN_CHAIN } from "@/lib/models";
import { buildSystemPrompt, buildRevisePrompt } from "@/lib/prompts/mentor";
import { critiqueReply } from "@/lib/critic";
import { retrieve, formatContext } from "@/lib/rag";
import { loadSnapshotText, applySnapshotUpdate } from "@/lib/snapshot";
import { recordCheckIn } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, childId } = (await req.json()) as {
    messages: CoreMessage[];
    childId?: string;
  };

  if (!childId) {
    return new Response("Missing childId", { status: 400 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query =
    typeof lastUser?.content === "string" ? lastUser.content : "";

  // 1: live snapshot + grounding context (parallel)
  const [snapshotText, retrieved] = await Promise.all([
    loadSnapshotText(childId),
    retrieve(query, { childId, limit: 8 }),
  ]);

  const baseSystem = buildSystemPrompt({
    snapshotText,
    retrievedContext: formatContext(retrieved),
  });

  // Persist the parent's message for future retrieval (fire-and-forget).
  if (query) void recordCheckIn(childId, query, "daily");

  // Tools. search_history is read-only (safe to run on any pass); update_snapshot
  // writes, so it's offered only on the draft pass to avoid double-writes on revise.
  const searchTool = tool({
    description:
      "Search deeper into stored history (check-ins, diary, documents, news, research) when the snapshot and current context are not enough. Use sparingly.",
    parameters: z.object({
      query: z.string().describe("What to look for in the family's history"),
      sources: z
        .array(z.enum(["check_in", "diary", "upload", "news", "research"]))
        .optional(),
    }),
    execute: async ({ query, sources }) => {
      const hits = await retrieve(query, { childId, limit: 6, sources });
      return formatContext(hits) || "Nothing relevant found.";
    },
  });

  const updateSnapshotTool = tool({
    description:
      "Persist a revised Child Snapshot. Call this only on an explicit weekly/monthly update or when the parent asks to update the snapshot. Increment version, graduate improved edges, retire finished experiments.",
    parameters: z.object({
      stageNotes: z.string().optional(),
      strengths: z.array(z.string()).optional(),
      growthEdges: z.array(z.string()).optional(),
      graduated: z.array(z.string()).optional(),
      watchList: z.array(z.string()).optional(),
      activeExperiments: z.array(z.string()).optional(),
      parentWorkingEdge: z.string().optional(),
    }),
    execute: async (update) => {
      await applySnapshotUpdate(childId, update);
      return "Snapshot updated and versioned.";
    },
  });

  // 2: DRAFT on the cheapest tier (Gemini). Has both tools.
  let draft;
  try {
    draft = await generateWithChain({
      system: baseSystem,
      messages,
      tools: { search_history: searchTool, update_snapshot: updateSnapshotTool },
      temperature: 0.7,
    });
  } catch (err) {
    console.error("[chat] draft failed across all tiers:", err);
    return new Response(
      "The mentor is unavailable — no model tier is configured. Set GOOGLE_GENERATIVE_AI_API_KEY, GROQ_API_KEY, or ANTHROPIC_API_KEY.",
      { status: 503 }
    );
  }

  // 3: CRITIQUE the draft against the steelplate principles.
  const verdict = await critiqueReply({
    parentMessage: query,
    snapshotText,
    draftText: draft.text,
  });

  // 4a: PASS — stream the draft back unchanged. No extra model call.
  if (verdict.pass) {
    return createDataStreamResponse({
      headers: { "x-steelplate-brain": `${draft.tier.name}:approved` },
      execute: (writer) => {
        writer.write(formatDataStreamPart("text", draft!.text));
        writer.write(
          formatDataStreamPart("finish_message", {
            finishReason: "stop",
            usage: { promptTokens: 0, completionTokens: 0 },
          })
        );
      },
    });
  }

  // 4b: FAIL — revise with escalation. Unsafe drafts jump to the strongest tier;
  // otherwise step one rung above whichever tier produced the draft.
  const escalateTo =
    verdict.severity === "unsafe"
      ? BRAIN_CHAIN.length - 1
      : Math.min(draft.tierIndex + 1, BRAIN_CHAIN.length - 1);

  const reviseSystem = buildRevisePrompt({
    baseSystem,
    violations: verdict.violations,
    guidance: verdict.guidance,
  });

  let revised;
  try {
    revised = await streamWithChain({
      system: reviseSystem,
      messages,
      // Read-only tool only on revise (update already ran during draft if needed).
      tools: { search_history: searchTool },
      temperature: 0.6,
      startTier: escalateTo,
    });
  } catch (err) {
    console.error("[chat] revise failed; falling back to draft text:", err);
    // Last resort: ship the draft rather than erroring on the parent.
    return createDataStreamResponse({
      headers: { "x-steelplate-brain": `${draft.tier.name}:fallback` },
      execute: (writer) => {
        writer.write(formatDataStreamPart("text", draft!.text));
        writer.write(
          formatDataStreamPart("finish_message", {
            finishReason: "stop",
            usage: { promptTokens: 0, completionTokens: 0 },
          })
        );
      },
    });
  }

  return revised.result.toDataStreamResponse({
    headers: {
      "x-steelplate-brain": `${revised.tier.name}:revised:${verdict.severity}`,
    },
  });
}
