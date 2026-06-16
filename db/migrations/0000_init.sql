-- Enable pgvector before anything else.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS child (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  birth_month text NOT NULL,
  grade_setting text,
  stage_notes text,
  family_non_negotiables text,
  success_definition text,
  parent_working_edge text,
  snapshot_version integer NOT NULL DEFAULT 1,
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS traits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child(id),
  kind text NOT NULL,
  body text NOT NULL,
  trend text,
  created_at timestamp NOT NULL DEFAULT now(),
  resolved_at timestamp
);

CREATE TABLE IF NOT EXISTS experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child(id),
  body text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  started_at timestamp NOT NULL DEFAULT now(),
  closed_at timestamp,
  outcome_note text
);

CREATE TABLE IF NOT EXISTS check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES child(id),
  body text NOT NULL,
  cadence text NOT NULL DEFAULT 'daily',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES child(id),
  source text NOT NULL,
  title text,
  chunk text NOT NULL,
  meta jsonb,
  embedding vector(768),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS documents_source_idx ON documents (source);
