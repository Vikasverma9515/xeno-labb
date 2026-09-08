# Xeno Analytics Lab

A SQL-first customer-retention analytics tool for a D2C/retail brand — built to
mirror the actual analytical core of [Xeno](https://www.getxeno.com)'s own CRM
product (RFM segmentation, dormant/at-risk detection, predicted-LTV tiering,
channel and send-time optimization), plus the two things a "data analyst" job
description actually tests that a typical portfolio dashboard skips:
**query-performance tuning at scale**, and **using an LLM as a working tool**,
not just a chatbot bolted on the side.

**Live demo:** _add your Vercel URL here after deploying_

## Why this exists

This was built for a "Data Analyst Intern" application that asked for a live
data analytics/engineering project. Instead of a generic Kaggle dashboard, it
rebuilds the specific feature set Xeno's product is known for — RFM
segmentation, dormant-customer flagging, channel and best-send-time
optimization — in raw SQL, on a dataset large enough that query performance is
a real problem, not a toy one.

## What's inside

| Page | What it shows |
|---|---|
| **Overview** | Revenue, customers, repeat-purchase rate, revenue trend, segment mix |
| **RFM Segments** | Recency/Frequency/Monetary segmentation computed via SQL window functions (`ntile`), with a business playbook per segment |
| **Channels & Timing** | Conversion rate by channel × segment, and a day/hour heatmap of best send times |
| **Query Lab** | The centerpiece: the channel × segment join query run live with `EXPLAIN ANALYZE` against a multi-million-row events table. Toggle indexes + a materialized view on/off and watch the query plan and timing change in real time. |
| **AI Assistant** | Ask a business question in plain English (or by voice) — an LLM (Groq/Gemini) writes read-only SQL against the schema, it executes in a read-only transaction, and you get a chart-ready result plus a one-line business recommendation. Falls back to a template-matched query if no LLM key is configured, so the page still works out of the box. |

## Architecture

```
Next.js (App Router, TS, Tailwind, Recharts)
  ├─ Server components query Postgres directly via postgres.js (lib/db.ts)
  ├─ /api/query-lab   — live EXPLAIN ANALYZE + index apply/revert
  ├─ /api/ask         — NL question -> LLM-generated SQL -> guarded read-only execution
  └─ /api/transcribe  — voice input via Deepgram

Postgres (Neon, via Vercel Marketplace)
  ├─ dim_customer, dim_product        (dimensions)
  ├─ fact_orders                      (~125k rows)
  ├─ fact_campaign_events             (~3M rows — the performance case study table)
  └─ customer_rfm (view)              (RFM scoring, computed in SQL — see db/002_analytics_views.sql)

pipeline/  — Python (pandas + numpy + Faker) synthetic data generator,
             tier-based so RFM segmentation has real structure to find,
             loaded via COPY for speed.
```

## The query-performance case study

`fact_campaign_events` ships with only a primary key (see
`db/001_schema.sql`). The Query Lab's core query joins it against
`fact_orders` and the `customer_rfm` view to compute conversion rate by
channel and segment — on a multi-million-row table with no supporting
indexes, that join forces a sequential scan and gets measurably slower as
volume grows. `db/003_add_indexes.sql` adds a composite index on
`customer_id`, a partial index on converted events, and a materialized rollup
for the channel × segment summary. The Query Lab page lets you apply/revert
that migration live and compares `EXPLAIN ANALYZE` output before and after.

## Running locally

**1. Database** — either:
- Local Postgres via `docker compose up -d` (schema/views are applied automatically by the seed script), or
- A Neon/Vercel Postgres connection string in `DATABASE_URL`

**2. Seed data**
```bash
cd pipeline
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
DATABASE_URL="postgres://..." python generate_and_load.py
```

**3. App**
```bash
cp .env.example .env.local   # fill in DATABASE_URL + at least one LLM key
npm install
npm run dev
```

## Environment variables

See `.env.example`. `DATABASE_URL` is required; `GROQ_API_KEY` /
`GEMINI_API_KEY` and `DEEPGRAM_API_KEY` are optional — the AI Assistant and
voice input degrade gracefully without them.

## Deploying

```bash
vercel link
vercel integration add neon   # provisions Postgres + sets DATABASE_URL
vercel env add GEMINI_API_KEY production
vercel --prod
```
