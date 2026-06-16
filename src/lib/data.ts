/**
 * DATA LAYER — all DB reads/writes the API routes use, kept in one place so the
 * routes stay thin. Single-tenant: one child profile, created from the UI.
 */
import { and, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { child, traits, experiments, checkIns, documents } from "./db/schema";
import { storeChunk } from "./store";

export type NewChild = {
  name: string;
  birthMonth: string;
  gradeSetting?: string;
  stageNotes?: string;
  familyNonNegotiables?: string;
  successDefinition?: string;
  parentWorkingEdge?: string;
};

export async function getFirstChild() {
  return (await db.query.child.findFirst()) ?? null;
}

export async function getChild(id: string) {
  return (await db.query.child.findFirst({ where: eq(child.id, id) })) ?? null;
}

export async function createChild(input: NewChild) {
  const [row] = await db
    .insert(child)
    .values({
      name: input.name,
      birthMonth: input.birthMonth,
      gradeSetting: input.gradeSetting,
      stageNotes: input.stageNotes,
      familyNonNegotiables: input.familyNonNegotiables,
      successDefinition: input.successDefinition,
      parentWorkingEdge: input.parentWorkingEdge,
    })
    .returning();
  return row;
}

export async function updateChildCore(id: string, patch: Partial<NewChild>) {
  await db
    .update(child)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(child.id, id));
  return getChild(id);
}

export async function listTraits(childId: string) {
  return db.query.traits.findMany({ where: eq(traits.childId, childId) });
}

export async function addTrait(childId: string, kind: string, body: string) {
  const [row] = await db.insert(traits).values({ childId, kind, body }).returning();
  return row;
}

export async function deleteTrait(id: string) {
  await db.delete(traits).where(eq(traits.id, id));
}

export async function listExperiments(childId: string) {
  return db.query.experiments.findMany({
    where: eq(experiments.childId, childId),
    orderBy: [desc(experiments.startedAt)],
  });
}

export async function addExperiment(childId: string, body: string) {
  const [row] = await db.insert(experiments).values({ childId, body }).returning();
  return row;
}

export async function updateExperiment(
  id: string,
  patch: { status?: string; outcomeNote?: string }
) {
  await db
    .update(experiments)
    .set({
      ...(patch.status
        ? {
            status: patch.status,
            ...(patch.status !== "active" ? { closedAt: new Date() } : {}),
          }
        : {}),
      ...(patch.outcomeNote !== undefined ? { outcomeNote: patch.outcomeNote } : {}),
    })
    .where(eq(experiments.id, id));
}

/** A diary entry: stored + embedded so the mentor can retrieve it later. */
export async function recordDiary(childId: string, body: string, title?: string) {
  await storeChunk({ childId, source: "diary", title, chunk: body });
}

export async function listCheckIns(childId: string, limit = 50) {
  return db.query.checkIns.findMany({
    where: eq(checkIns.childId, childId),
    orderBy: [desc(checkIns.createdAt)],
    limit,
  });
}

export async function listDocuments(childId: string, source?: string, limit = 100) {
  return db
    .select({
      id: documents.id,
      source: documents.source,
      title: documents.title,
      chunk: documents.chunk,
      meta: documents.meta,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(
      source
        ? and(eq(documents.childId, childId), eq(documents.source, source))
        : eq(documents.childId, childId)
    )
    .orderBy(desc(documents.createdAt))
    .limit(limit);
}
