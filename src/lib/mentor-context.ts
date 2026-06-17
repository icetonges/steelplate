/**
 * Builds the mentor's system prompt for a child + query: the stable brain prompt
 * plus the live snapshot plus retrieved grounding. Shared by the chat route and
 * the compare route so both judge the same task. Degrades gracefully if snapshot
 * or retrieval fails.
 */
import { retrieve, formatContext } from "./rag";
import { loadSnapshotText } from "./snapshot";
import { buildSystemPrompt } from "./prompts/mentor";

export async function buildMentorContext(childId: string, query: string): Promise<string> {
  const [snapshotText, retrieved] = await Promise.all([
    loadSnapshotText(childId).catch(() => null),
    retrieve(query, { childId, limit: 8 }).catch(() => []),
  ]);
  return buildSystemPrompt({
    snapshotText,
    retrievedContext: formatContext(retrieved),
  });
}
