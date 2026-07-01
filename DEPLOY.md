# Deployment — two domains

TenderMaster is intentionally split into two independent pieces so the public
marketing site and the paid product scale and deploy separately:

| Piece | Folder | Domain | What it is |
|---|---|---|---|
| **Marketing site** | [`landing/`](./landing) | `tendermaster.com` | Static HTML/CSS/JS. Fast, cacheable, no server. |
| **The app** | [`saas/`](./saas) | `app.tendermaster.com` | The Next.js application subscribers log into. |

The landing page's **"Log in"** link already points to `https://app.tendermaster.com`.

---

## 1. Marketing site → `tendermaster.com`

It's plain static files — host it anywhere that serves static content:

- **Netlify / Vercel / Cloudflare Pages / GitHub Pages / S3+CloudFront**
- Publish directory: `landing/`
- No build step, no environment variables.

Point the apex domain `tendermaster.com` (and `www`) at that host.

## 2. The app → `app.tendermaster.com`

A standard Next.js app. On any Node host (Vercel, Render, Railway, Fly.io, a VPS):

```bash
cd saas
npm install
npm run build
npm start          # serves on port 3000
```

Then map `app.tendermaster.com` to it (Vercel: set it as the project's domain; a
VPS: reverse-proxy 443 → 3000 with nginx/Caddy).

### Environment variables for the app

Set these on the app host (never commit them):

```
TENDERMASTER_ANTHROPIC_API_KEY=sk-ant-...   # enables live AI tender reading
ANTHROPIC_MODEL=claude-opus-4-8             # optional
```

Without the key the app still runs, in demo mode (sample extraction); the nav
shows an **"AI demo"** badge instead of **"AI live"**.

## 3. Accounts & billing — Supabase + Stripe

Auth, database, storage, and billing are **built and wired**, and stay dormant
until their keys are present. When you set them, the app requires login and an
active subscription.

### a) Supabase (auth + database + storage)

1. Create a project at **supabase.com**.
2. Open **SQL Editor → New query**, paste [`saas/supabase/schema.sql`](./saas/supabase/schema.sql),
   and **Run**. This creates all tables (one company per user) with Row Level
   Security so every firm only sees its own data, plus a `subscriptions` table.
3. **Storage → New bucket** → name it `documents`, set it **Private**. Then
   uncomment the four storage policies at the bottom of `schema.sql` and run them.
4. From **Project Settings → API**, copy the values into the env vars below.

### b) Stripe (the $150/mo plan)

1. In Stripe, create a **Product** "TenderMaster" with a **recurring monthly price
   of $150** → copy its **Price ID** (`price_...`).
2. Copy your **Secret key** (`sk_...`).
3. After the app is deployed, add a **Webhook** pointing at
   `https://app.tendermaster.com/api/stripe/webhook`, subscribe to
   `checkout.session.completed` and `customer.subscription.*`, and copy the
   **Signing secret** (`whsec_...`).

### c) Environment variables (app host)

```
# AI
TENDERMASTER_ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-8

# Supabase — NEXT_PUBLIC_* must be present at BUILD time (Vercel handles this)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # server-only

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App URL (for Stripe redirects + email links)
NEXT_PUBLIC_APP_URL=https://app.tendermaster.com
```

> ⚠️ The `NEXT_PUBLIC_*` values are baked into the client bundle **at build time**,
> so they must be set when you build (not only at runtime). On Vercel this is
> automatic; on a VPS, export them before `npm run build`.

### How the gating behaves

- **No Supabase keys** → app runs as one open workspace (great for local dev).
- **Supabase keys set** → visitors must log in (`/login`, `/signup`, magic link).
- **Stripe keys set too** → logged-in users without an active subscription are
  sent to `/subscribe` (Stripe Checkout) before they can use the app.

### Still to do after keys are live (next stage)

The data layer still uses the local JSON store; the **Supabase schema is ready**,
so the remaining step is pointing the app's data functions (`src/lib/store.ts`)
at Supabase and moving uploads to the `documents` bucket. Auth, billing, and the
schema are done — this is the wiring that turns the single workspace into true
per-customer isolation.

---

## 4. What's still needed to be truly production-ready

- **Wire the data layer to Supabase** (schema + auth + storage already built).
- **Deploy** to `tendermaster.com` + `app.tendermaster.com` and add the Stripe webhook.
- **Real tender-discovery source** — the matcher in `saas/src/lib/discovery.ts`
  ships with a curated starter feed; plug in PPRA/EPADS scraping or an aggregator
  API behind the same `seedLeads()` seam.

## Local development

```bash
cd saas
cp .env.example .env      # add your key to .env (gitignored)
npm install
npm run dev               # http://localhost:3000
```
