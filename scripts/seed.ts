/**
 * Seed the first child row, then put its id into NEXT_PUBLIC_CHILD_ID.
 * Run with: npx tsx scripts/seed.ts
 */
import { db } from "../src/lib/db";
import { child } from "../src/lib/db/schema";

async function main() {
  const [row] = await db.insert(child).values({
    name: "REPLACE_ME",
    birthMonth: "2013-08", // YYYY-MM
    gradeSetting: "entering 7th grade",
    familyNonNegotiables: "honesty; effort over outcome",
    successDefinition: "able to handle hard things, build real relationships, and recover from failure",
    parentWorkingEdge: "I rescue too fast when he's stuck",
  }).returning();
  console.log("Seeded child id:", row.id);
  console.log("Put this in .env as NEXT_PUBLIC_CHILD_ID");
}
main();
