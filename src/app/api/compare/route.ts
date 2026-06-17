/**
 * SIDE-BY-SIDE COMPARISON — run the same mentor prompt through two chosen models
 * and return both answers. No chain fallback, no critic: you see each model's
 * real, unfiltered output so the comparison is fair.
 */
import { generateText, type CoreMessage } from "ai";
import { modelById } from "@/lib/models";
import { getModel, type ModelId } from "@/lib/model-catalog";
import { buildMentorContext } from "@/lib/mentor-context";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { childId, messages, modelA, modelB } = (await req.json()) as {
    childId?: string;
    messages: CoreMessage[];
    modelA?: string;
    modelB?: string;
  };

  if (!childId || !modelA || !modelB) {
    return new Response("childId, modelA and modelB are required", { status: 400 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = typeof lastUser?.content === "string" ? lastUser.content : "";
  const system = await buildMentorContext(childId, query);

  const run = async (id: string) => {
    if (!getModel(id as ModelId)) {
      return { model: id, text: "Unknown model id.", error: true as const };
    }
    const started = Date.now();
    try {
      const { text } = await generateText({
        model: modelById(id as ModelId),
        system,
        messages,
        temperature: 0.7,
      });
      return { model: id, text, ms: Date.now() - started };
    } catch (err) {
      return {
        model: id,
        text: `Error: ${err instanceof Error ? err.message : "failed"}`,
        error: true as const,
      };
    }
  };

  const [a, b] = await Promise.all([run(modelA), run(modelB)]);
  return Response.json({ a, b });
}
