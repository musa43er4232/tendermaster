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

### Data (important before real launch)

The app currently uses a **local JSON store** (`saas/data/db.json`) for zero-setup
running. That's perfect for the prototype but is **single-instance and ephemeral**.
Before onboarding real customers, swap it for **PostgreSQL** (the schema is already
written in [`saas/docs-schema.prisma`](./saas/docs-schema.prisma), and the model
shapes in `saas/src/lib/models.ts` match it, so it's a contained change). Uploaded
files (`saas/uploads/`) should likewise move to object storage (S3/R2).

---

## 3. What's still needed to be truly production-ready

- **Authentication & multi-tenant accounts** (today it's a single workspace).
- **Postgres + object storage** (replace the JSON store and local uploads).
- **Billing** (Stripe) gating access to `app.tendermaster.com`.
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
