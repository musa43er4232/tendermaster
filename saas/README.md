# TenderMaster — SaaS (Phase 2)

The working application: an AI tender-automation tool for EPC firms in Pakistan.
Onboarding builds a company knowledge graph; uploading a tender PDF produces an
**eligibility verdict**, a **dynamic document checklist**, **reminders**, and a
**win-tracking lifecycle** — grounded in the real LDA tender documents we studied.

## Stack

- **Next.js 14** (App Router, TypeScript, server actions) + **Tailwind** (dark-purple theme).
- **Claude API** (`@anthropic-ai/sdk`) reads tender PDFs natively — including scanned/stamped
  pages — and returns structured data. Falls back to a deterministic sample when no key is set.
- **Data layer:** a small, dependency-free JSON store (`src/lib/store.ts`) so the app runs
  anywhere with zero setup. **Production target:** PostgreSQL via Prisma — the schema is kept in
  [`docs-schema.prisma`](./docs-schema.prisma) and the model shapes in `src/lib/models.ts` match it,
  so swapping the store for Prisma is a localised change.

## Run it

```bash
cd saas
npm install
npm run build && npm start    # http://localhost:3000
# or: npm run dev
```

The database self-seeds on first run with a demo company (modeled on a real EPC solar contractor)
and one example tender, so every screen is populated immediately. Reset with `npm run db:reset`.

## What I need from you to light up live AI

The app works in **demo mode** without any keys (sample extraction). To read real tender PDFs:

1. Put an **Anthropic API key** in `saas/.env` (preferred name avoids clashing with any
   Claude-Code-own auth in shared cloud environments; the plain name also works locally):
   ```
   TENDERMASTER_ANTHROPIC_API_KEY="sk-ant-..."
   ANTHROPIC_MODEL="claude-opus-4-8"   # optional override
   ```
2. (Production) Provide a **PostgreSQL** connection string and we switch the data layer to Prisma.

That's all that's needed from your side right now.

## What works today

- **Onboarding** — a 6-step guided wizard (company → registrations → experience → team →
  financials → stamp & signature) with a live readiness score, add/remove for every repeatable
  item, and the PEC-category field that appears only for PEC licences. Doubles as the profile editor.
- **Dashboard** — live tenders, win count, open reminders, and a profile-completion nudge.
- **Upload a tender** → AI extraction → **eligibility verdict** (deterministic hard gates: PEC
  category floor, active filer, sector gates like AEDB-for-solar) + **predicted score**.
- **Dynamic checklist** — required documents auto-matched to the company's vault (have / missing /
  expired), each with contextual "how to get this" guidance.
- **Company profile** (knowledge graph) — identity, licences with expiry tracking, experience,
  people, financials, and the **stamp + signature** assets.
- **Lifecycle** — mark submitted / won / lost; reminders for deadlines and licence expiry; an
  outcome-check nudge fires after each deadline.
- **Tender Discovery** (`/discover`) — auto-finds opportunities (curated starter feed modeled on
  PPRA/EPADS/press) and **pre-screens each against your profile** with a fit score and specific
  reasons/blockers. One click imports a lead into your pipeline as a full tender. Live portal
  scraping plugs into the same matcher via `src/lib/discovery.ts` → `seedLeads()`.
- **Live AI status** — the nav shows **AI live** / **AI demo**. Real Claude extraction is used when
  a key is set; on any API error it falls back to a sample instead of failing the upload.
- **Compiled submission PDF** — one click builds a print-ready package: a cover page (mirrors the
  real LDA tender cover), then a labelled divider + content page per checklist item — a real
  uploaded certificate is merged in, an AI/template-drafted letter is generated for items like the
  Letter of Technical Bid, or a clear "needs attention" page appears for anything still missing.
  The company's **stamp and signature are auto-overlaid on every page**. Download from the tender
  page once generated.

## Code map

| Path | Purpose |
|---|---|
| `src/lib/ai.ts` | Claude PDF extraction + drafting (with mock fallback) |
| `src/lib/eligibility.ts` | Deterministic hard-gate rules + predicted score |
| `src/lib/checklist.ts` | Builds the per-tender document checklist |
| `src/lib/pdfBuilder.ts` | Compiles the submission PDF (cover, dividers, merge/draft, stamp overlay) |
| `src/lib/pec.ts` | PEC category ladder & "C-6 & above" logic |
| `src/lib/discovery.ts` | Tender-discovery feed + fit-matching vs the company |
| `src/lib/store.ts` | JSON data store + seed (prod → Prisma/Postgres) |
| `src/app/` | Dashboard, tender upload, tender detail, company profile, onboarding |
| `src/app/api/tenders/[id]/pdf` | Download route for the generated submission PDF |

## Accounts & billing (Supabase + Stripe)

Auth (Supabase), the subscription gate (Stripe), and the full Postgres schema
with Row Level Security are **built and wired**, and stay dormant until their env
keys are set:

- No Supabase keys → one open workspace (local dev).
- Supabase keys → login required (`/login`, `/signup`, magic link).
- Stripe keys too → unsubscribed users are sent to `/subscribe` (Stripe Checkout).

Setup + env vars: [`../DEPLOY.md`](../DEPLOY.md). Schema: [`supabase/schema.sql`](./supabase/schema.sql).

## Deployment (two domains)

Marketing site (`landing/`) → **tendermaster.com**; the app (`saas/`) →
**app.tendermaster.com**. See [`../DEPLOY.md`](../DEPLOY.md).

## Next up

- **Wire the data layer to Supabase** (schema/auth/storage/billing already built) —
  turns the single workspace into true per-customer isolation.
- **Real discovery source** (PPRA/EPADS scraping or aggregator API) behind `seedLeads()`.
- Award-letter ingestion (extract Agreement Amount on a win) + win/loss learning loop.
