/**
 * THE MENTOR ROUTE.
 *
 * Two modes, chosen by the `modelId` field from the UI dropdown:
 *   - No modelId ("Auto") → the full draft → critic → revise/escalate loop over
 *     the Gemini → Groq → Claude chain.
 *   - A specific modelId → answer directly with that one model (no chain
 *     fallback, no critic) so you see exactly what that model produces.
 *
 * Either way the parent's check-in is saved first and independently, retrieval
 * degrades gracefully, and model failures return a visible message.
 */

import {
  tool,
  streamText,
  createDataStreamResponse,
  formatDataStreamPart,
  type CoreMessage,
} from "ai";
import { z } from "zod";
import { generateWithChain, streamWithChain } from "@/lib/brain";
import { BRAIN_CHAIN, modelById } from "@/lib/models";
import { getModel, type ModelId } from "@/lib/model-catalog";
import { buildSystemPrompt, buildRevisePrompt } from "@/lib/prompts/mentor";
import { critiqueReply } from "@/lib/critic";
import { retrieve, formatContext } from "@/lib/rag";
import { loadSnapshotText, applySnapshotUpdate } from "@/lib/snapshot";
import { recordCheckIn } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  const { messages, childId, modelId } = (await req.json()) as {
    messages: CoreMessage[];
    childId?: string;
    modelId?: string;
  };

  if (!childId) return new Response("Missing childId", { status: 400 });

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = typeof lastUser?.content === "string" ? lastUser.content : "";

  if (query) {
    try {
      await recordCheckIn(childId, query, "daily");
    } catch (err) {
      console.error("[chat] check-in save failed:", err);
    }
  }

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

  // DIRECT MODE — a specific model was chosen in the dropdown.
  if (modelId) {
    if (!getModel(modelId as ModelId)) {
      return streamMessage(`Unknown model: ${modelId}.`, `${modelId}:error`);
    }
    try {
      const result = streamText({
        model: modelById(modelId as ModelId),
        system: baseSystem,
        messages,
        temperature: 0.7,
        tools: { search_history: searchTool },
        maxSteps: 4,
        onError: (e) => console.warn(`[chat] direct model ${modelId} error:`, e),
      });
      return result.toDataStreamResponse({
        headers: { "x-steelplate-brain": `${modelId}:direct` },
      });
    } catch (err) {
      console.error(`[chat] direct model ${modelId} failed:`, err);
      return streamMessage(
        `Couldn't run ${modelId}. Check that its provider key is set and valid.`,
        `${modelId}:error`
      );
    }
  }

  // AUTO MODE — draft on the cheapest tier.
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

  const verdict = await critiqueReply({
    parentMessage: query,
    snapshotText,
    draftText: draft.text,
  });

  if (verdict.pass) {
    return streamMessage(draft.text, `${draft.tier.name}:approved`);
  }

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
