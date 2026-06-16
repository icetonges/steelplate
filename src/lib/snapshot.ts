/**
 * SNAPSHOT — assembling the living state into the text the brain reads, and
 * applying the brain's structured updates back into the tables.
 */
import { and, eq, isNull } from "drizzle-orm";
import { db } from "./db";
import { child, traits, experiments } from "./db/schema";

function ageFromBirthMonth(birthMonth: string): string {
  const [y, m] = birthMonth.split("-").map(Number);
  if (!y || !m) return "unknown";
  const now = new Date();
  let years = now.getFullYear() - y;
  if (now.getMonth() + 1 < m) years -= 1;
  return `${years}`;
}

/** Renders the current state as the Snapshot text block the mentor expects. */
export async function loadSnapshotText(childId: string): Promise<string | null> {
  const c = await db.query.child.findFirst({ where: eq(child.id, childId) });
  if (!c) return null;

  const allTraits = await db.query.traits.findMany({ where: eq(traits.childId, childId) });
  const exps = await db.query.experiments.findMany({ where: eq(experiments.childId, childId) });

  const byKind = (k: string) => allTraits.filter((t) => t.kind === k).map((t) => `  - ${t.body}`).join("\n") || "  -";
  const activeExps = exps.filter((e) => e.status === "active").map((e, i) => `  ${i + 1}. ${e.body}`).join("\n") || "  (none yet)";

  return `=== CHILD SNAPSHOT — v${c.snapshotVersion} — last updated: ${c.updatedAt.toISOString().slice(0, 10)} ===

CHILD
  Name: ${c.name}
  Birth month: ${c.birthMonth}  (current age ~${ageFromBirthMonth(c.birthMonth)})
  Grade / setting: ${c.gradeSetting ?? "—"}
  Developmental stage notes: ${c.stageNotes ?? "—"}

STRENGTHS
${byKind("strength")}

GROWTH EDGES
${byKind("growth_edge")}

RELATIONSHIPS & SOCIAL
${byKind("relationship")}

LEADERSHIP & INITIATIVE
${byKind("leadership")}

COURAGE & WORRY
${byKind("courage")}

ACTIVE EXPERIMENTS
${activeExps}

GRADUATED (proof it's working)
${byKind("graduated")}

WATCH-LIST
${byKind("watch")}

PARENT'S OWN WORKING EDGE
  ${c.parentWorkingEdge ?? "—"}

FAMILY NON-NEGOTIABLES
  ${c.familyNonNegotiables ?? "—"}

WHAT 'SUCCESS' MEANS LONG-TERM
  ${c.successDefinition ?? "—"}

=== END SNAPSHOT ===`;
}

type SnapshotUpdate = {
  stageNotes?: string;
  strengths?: string[];
  growthEdges?: string[];
  graduated?: string[];
  watchList?: string[];
  activeExperiments?: string[];
  parentWorkingEdge?: string;
};

/**
 * Applies the brain's structured update. Bumps the version, replaces trait
 * sets, and reconciles experiments — never silently destroys graduated history.
 */
export async function applySnapshotUpdate(childId: string, u: SnapshotUpdate) {
  const c = await db.query.child.findFirst({ where: eq(child.id, childId) });
  if (!c) throw new Error("child not found");

  await db.update(child).set({
    snapshotVersion: c.snapshotVersion + 1,
    updatedAt: new Date(),
    ...(u.stageNotes ? { stageNotes: u.stageNotes } : {}),
    ...(u.parentWorkingEdge ? { parentWorkingEdge: u.parentWorkingEdge } : {}),
  }).where(eq(child.id, childId));

  // Replace the live trait sets that were provided (graduated is append-only).
  const replaceKind = async (kind: string, items?: string[]) => {
    if (!items) return;
    if (kind !== "graduated") {
      await db.delete(traits).where(and(eq(traits.childId, childId), eq(traits.kind, kind)));
    }
    for (const body of items) {
      await db.insert(traits).values({ childId, kind, body });
    }
  };

  await replaceKind("strength", u.strengths);
  await replaceKind("growth_edge", u.growthEdges);
  await replaceKind("graduated", u.graduated);
  await replaceKind("watch", u.watchList);

  if (u.activeExperiments) {
    // retire current active, insert the new active set
    await db.update(experiments)
      .set({ status: "retired", closedAt: new Date() })
      .where(and(eq(experiments.childId, childId), eq(experiments.status, "active")));
    for (const body of u.activeExperiments) {
      await db.insert(experiments).values({ childId, body, status: "active" });
    }
  }
}
