/**
 * SCHEMA — the self-evolving prompt, expressed as tables.
 *
 * The Snapshot from the prompt design IS this schema. The `child` row plus
 * the related tables (strengths, growth_edges, experiments, graduated) are the
 * living state. Everything text-bearing also lands in `documents` with an
 * embedding so the mentor can retrieve it (RAG).
 *
 * Uses Drizzle + Neon Postgres + pgvector.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  vector,
  index,
} from "drizzle-orm/pg-core";

// Gemini text-embedding dims; adjust if you change embedding models.
const EMBED_DIM = 768;

export const child = pgTable("child", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  birthMonth: text("birth_month").notNull(), // "YYYY-MM" — mentor computes age from this
  gradeSetting: text("grade_setting"),
  stageNotes: text("stage_notes"),
  familyNonNegotiables: text("family_non_negotiables"),
  successDefinition: text("success_definition"), // steers everything
  parentWorkingEdge: text("parent_working_edge"), // the mentor coaches the parent too
  snapshotVersion: integer("snapshot_version").notNull().default(1),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// kind: strength | growth_edge | graduated | watch | relationship | leadership | courage
export const traits = pgTable("traits", {
  id: uuid("id").defaultRandom().primaryKey(),
  childId: uuid("child_id").notNull().references(() => child.id),
  kind: text("kind").notNull(),
  body: text("body").notNull(),
  trend: text("trend"), // growing | stable | improved
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"), // set when a growth_edge graduates
});

export const experiments = pgTable("experiments", {
  id: uuid("id").defaultRandom().primaryKey(),
  childId: uuid("child_id").notNull().references(() => child.id),
  body: text("body").notNull(),
  status: text("status").notNull().default("active"), // active | revised | retired
  startedAt: timestamp("started_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
  outcomeNote: text("outcome_note"),
});

export const checkIns = pgTable("check_ins", {
  id: uuid("id").defaultRandom().primaryKey(),
  childId: uuid("child_id").notNull().references(() => child.id),
  body: text("body").notNull(),
  cadence: text("cadence").notNull().default("daily"), // daily | weekly | monthly
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * The retrievable corpus. One row per chunk. Source distinguishes where it
 * came from so retrieval can weight or filter. This is what RAG searches.
 */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    childId: uuid("child_id").references(() => child.id),
    source: text("source").notNull(), // check_in | diary | upload | news | research
    title: text("title"),
    chunk: text("chunk").notNull(),
    meta: jsonb("meta"),
    embedding: vector("embedding", { dimensions: EMBED_DIM }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    // HNSW index for fast cosine similarity search at scale.
    embeddingIdx: index("documents_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops")
    ),
    sourceIdx: index("documents_source_idx").on(t.source),
  })
);

export const EMBEDDING_DIM = EMBED_DIM;
