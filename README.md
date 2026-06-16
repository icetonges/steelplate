# steelplate

A long-term mentor for raising a child with the character and capability to meet
a future neither of you can predict. Not a grade tracker — a thinking partner that
remembers, follows up on what you tried, re-baselines as your child grows, and
grounds every answer in your family's real history.

> **The brain comes first.** Everything in this repo serves one thing: the quality
> of the reasoning in `src/lib/prompts/mentor.ts`. A child's development is the
> stakes here, so the mentor is built to be honest (it tells you when *you're* the
> problem), evidence-grounded (it labels research vs. judgment and never invents
> studies), and safe (it routes you to a real clinician/teacher the moment
> something is beyond parenting advice).
>
> **The brain is a chain, not Claude-by-default.** Claude is expensive, so it is
> the *backstop*, not the workhorse. Each turn runs cheapest-first — Gemini → Groq
> → Claude — and a second "critic" agent checks every draft against the mentor's
> own principles before the parent sees it. Only a rejected (or unsafe) draft
> escalates up the chain. Cheap when it can be, expensive only when it must be.

## Architecture

```
Parent message
   │
   ▼
/api/chat ──► load live SNAPSHOT (the child's state, as tables)
   │          + RAG retrieve from stored history (pgvector)
   │
   ▼
DRAFT  on cheapest tier (Gemini)  ──tools──►  search_history (deeper RAG)
   │                                          update_snapshot (evolve state)
   ▼
CRITIC agent  ── scores draft against MENTOR_PRINCIPLES (same intent as the prompt)
   │
   ├─ pass  ─────────────────────────────────►  stream the draft (cheapest path)
   │
   └─ fail / unsafe ─► REVISE, escalate up the chain (Groq → Claude) with the
                       critic's specific objections ─►  stream the fixed reply
                                                         │
   parent's message embedded + stored for next time  ◄──┘
```

- **Brain (the chain):** Gemini → Groq → Claude, cost-ordered, in `src/lib/models.ts`
  + `src/lib/brain.ts`. The first tier with a key that succeeds answers; failures and
  rejected drafts escalate upward. Claude is the quality backstop only.
- **The loop:** `src/lib/critic.ts` scores each draft against `MENTOR_PRINCIPLES`
  (`src/lib/prompts/mentor.ts`) — the *same* principles the system prompt encodes, so
  the design intent is verified at runtime, not just stated. The chosen model is
  reported in the `x-steelplate-brain` response header.
- **Critic + ingestion** run on the cheapest tier (Gemini), never Claude.
- **Memory:** the Snapshot *is* the schema (`src/lib/db/schema.ts`). The prompt's
  daily/weekly/monthly rhythm maps to check-ins, reflections, and versioned snapshot
  updates. Improved growth edges graduate; history is never silently dropped.
- **Self-improving loop:** everything text-bearing (check-ins, diary, uploads, news,
  research) is embedded into `documents`. The more you store, the better retrieval
  grounds the mentor. That's `src/lib/rag.ts`.
- **Ingestion:** `/api/ingest/news` (daily Vercel Cron), `/api/ingest/research`,
  `/api/documents/upload` (Blob → parse → chunk → embed). All currently stubbed at
  the source/parse step — wire your feeds and a PDF/docx parser.

## Front end (everything is editable from the UI)

Five screens, gated behind first-run onboarding that creates the child profile:

- **Mentor** (`/`) — the chat, running the draft→critic→revise chain.
- **Diary** (`/diary`) — write reflections; each is embedded for retrieval.
- **Knowledge** (`/knowledge`) — upload documents and paste/distill research.
- **Snapshot** (`/snapshot`) — view AND edit the living state: profile fields,
  strengths, growth edges, relationships, leadership, courage, watch-list,
  graduated items, and experiments. This is the self-evolving state, by hand.
- **History** (`/history`) — semantic search over everything stored, plus recent
  check-ins.

## What's done vs. what's stubbed

Done: the brain chain + critic loop, model catalog, schema + SQL migration, RAG
retrieval, the full front end above with its API routes (child, snapshot, traits,
experiments, diary, documents, check-ins, search), snapshot versioning, and the
embed-and-store pipeline.

Stubbed (`TODO`): the daily news-feed source, a PDF/DOCX text extractor for
uploads (text formats work today), and **auth**. **Add auth before this holds
anything real** — it stores sensitive information about a child. Keep it
single-tenant and private (Clerk or Auth.js, gate every route).

## Setup

1. `npm install`
2. Create a Neon database, set `DATABASE_URL`. Run the migration:
   `psql "$DATABASE_URL" -f db/migrations/0000_init.sql`
   (this enables `pgvector` and creates all tables + the HNSW index)
3. Set keys (see `.env.example`). On **Vercel**, add them in Project → Settings →
   Environment Variables — that's all the deployed app needs; a local `.env` is
   optional. For **local dev / migrations**, run `vercel env pull .env.local`.
   At minimum set one brain tier (`GOOGLE_GENERATIVE_AI_API_KEY` recommended — it
   also powers embeddings, the critic, and ingestion), plus `DATABASE_URL`.
4. `npm run dev` — on first load the app shows an onboarding screen; create the
   child profile there. No seed script or `NEXT_PUBLIC_CHILD_ID` needed.

## Move it to your machine + open in Cowork

This was scaffolded in a sandbox, so do these two steps locally:

```powershell
# 1. unzip the download into the target folder
Expand-Archive steelplate.zip -DestinationPath C:\Users\Peter-HP\git\steelplate

# 2. from that folder
cd C:\Users\Peter-HP\git\steelplate
git init
npm install
```

Then open the folder as a **Cowork project** (or in Claude Code). Once it's open
there, I can run against your real Neon DB and env, wire the stubbed ingestion to
your actual feeds, add auth, and deploy to Vercel — the things that need your
machine and your credentials.

## Model IDs move fast

The IDs in `.env.example` were current at scaffold time. Confirm them against the
provider docs before deploying; routing is centralized in `src/lib/models.ts` so a
swap is one env var. Defaults: `gemini-2.0-flash`, `llama-3.3-70b-versatile`,
`claude-sonnet-4-6`.
