/**
 * THE MENTOR ROUTE — a parent's message meets the brain, run as a
 * draft → critic → revise/escalate loop over the Gemini → Groq → Claude chain.
 *
 * Resilience: the parent's check-in is saved first and independently; retrieval
 * (which needs an embedding call) is wrapped so a failure degrades to "no
 * grounding" instead of killing the turn; and any model failure returns a
 * visible assistant message rather than a silent error.
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

/** Emit a fixed assistant message as a valid data stream (no model call). */
function streamMessage(text: string, brain: string) {
  return createDataStreamResponse({
    headers: { "x-steelplate-brain": brain },
    execute: (writer) => {
      writer.write(formatDataStreamPart("text", text));
      writer.write(
        formatDataStreamPart("finish_message", {
          finishReason: "stop",
          usage: { promptTokens: 0, completionTokens: 0 },
        })
      );
    },
  });
}

export async function POST(req: Request) {
  const { messages, childId } = (await req.json()) as {
    messages: CoreMessage[];
    childId?: string;
  };

  if (!childId) return new Response("Missing childId", { status: 400 });

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = typeof lastUser?.content === "string" ? lastUser.content : "";

  // 1: save the parent's check-in first, reliably (independent of model/RAG).
  if (query) {
    try {
      await recordCheckIn(childId, query, "daily");
    } catch (err) {
      console.error("[chat] check-in save failed:", err);
    }
  }

  // 2: snapshot + grounding. Each degrades on its own so one failure (e.g. an
  // embedding error) can't take down the turn.
  const [snapshotText, retrieved] = await Promise.all([
    loadSnapshotText(childId).catch((e) => {
      console.error("[chat] snapshot load failed:", e);
      return null;
    }),
    retrieve(query, { childId, limit: 8 }).catch((e) => {
      console.error("[chat] retrieval failed, continuing without grounding:", e);
      return [];
    }),
  ]);

  const baseSystem = buildSystemPrompt({
    snapshotText,
    retrievedContext: formatContext(retrieved),
  });

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
      try {
        const hits = await retrieve(query, { childId, limit: 6, sources });
        return formatContext(hits) || "Nothing relevant found.";
      } catch {
        return "History search is temporarily unavailable.";
      }
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

  // 3: DRAFT on the cheapest tier. If every tier fails, show why.
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
    return streamMessage(
      "I couldn't reach any model just now. Check that a brain key is set and valid " +
        "(GOOGLE_GENERATIVE_AI_API_KEY, GROQ_API_KEY, or ANTHROPIC_API_KEY), then try again.",
      "none:error"
    );
  }

  // 4: CRITIQUE the draft against the steelplate principles.
  const verdict = await critiqueReply({
    parentMessage: query,
    snapshotText,
    draftText: draft.text,
  });

  // 4a: PASS — stream the draft back unchanged (no extra model call).
  if (verdict.pass) {
    return streamMessage(draft.text, `${draft.tier.name}:approved`);
  }

  // 4b: FAIL — revise with escalation. Unsafe jumps to the strongest tier.
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
      tools: { search_history: searchTool },
      temperature: 0.6,
      startTier: escalateTo,
    });
  } catch (err) {
    console.error("[chat] revise failed; shipping the draft:", err);
    return streamMessage(draft.text, `${draft.tier.name}:fallback`);
  }

  return revised.result.toDataStreamResponse({
    headers: {
      "x-steelplate-brain": `${revised.tier.name}:revised:${verdict.severity}`,
    },
  });
}
