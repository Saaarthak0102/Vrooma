# Vrooma — Luxury Car Dealership Platform

> **Authorised Dealer for Brand X (Lucknow & Kanpur)**
> 3 Showrooms · 2 Service Workshops · 1 Certified Pre-Owned Yard · 340 Staff · ₹550–650 Cr Annual Turnover.

Vrooma transforms the traditional car buying and servicing experience by replacing sluggish Excel tracking and phone-only bookings with real-time on-road pricing, self-service test drive & workshop bay scheduling, an auto-assigned lead desk with 5-minute SLA countdown timers, and an executive revenue leakage monitor recovering **₹2.11 crore** in annual lost opportunities.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS · Radix UI · Supabase (Postgres, Auth, Storage, Realtime, `pg_cron`) · `next-intl` (English text catalogue only) · Vitest.

**Status:** Frontend Phases 1–2 and backend Phases 0–6 are complete (auth, schema, data layer, bookings & leads, account privacy, hardening). Live LLM streaming in the lead copilot and WhatsApp account setup are still to come. See [`docs/backend/STATUS.md`](./docs/backend/STATUS.md).

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js:** `v20.0.0` or higher (recommended: Node 22+)
- **Package Manager:** `pnpm` (`v9.0.0` or higher). The tracked lockfile is `pnpm-lock.yaml`.
- A **Supabase project**. The mock in-memory store has been removed, so the app needs a real database. Use the DEV project, never PROD, for local work.

### 2. Installation
```bash
git clone https://github.com/vrooma/vrooma.git
cd vrooma
pnpm install
```

### 3. Environment Setup
```bash
cp .env.example .env.local
pnpm check:env      # validates the variables below
```

| Variable | Purpose |
|---|---|
| `APP_ENV` | `development` / `production`. Production disables dev-only features |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (SEO, auth redirects) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase config |
| `SUPABASE_SECRET_KEY` | **Server only.** Admin client (never import in client code) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Legacy key fallbacks |
| `ALLOW_DEV_LOGIN` | `true` enables one-click dev sign-in (DEV only; the endpoint 404s in production) |
| `SUPABASE_DEV_REF`, `SUPABASE_PROD_REF` | Project refs, used by the safety guard in the DB scripts |
| `RESEND_API_KEY` | Transactional email |
| `AI_PROVIDER_API_KEY` | Lead copilot / chat assistant |
| `CRON_SECRET` | Bearer secret for `/api/cron/*` and `/api/outbox/send` |
| `TRUSTED_PROXY` | `vercel` \| `cloudflare` \| `none`, which proxy to trust for client IP (rate limits, audit) |

Never commit `.env.local`. Details and the DEV → PROD promotion procedure: [`docs/backend/ENVIRONMENTS.md`](./docs/backend/ENVIRONMENTS.md).

### 4. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000).

Supabase cannot call `localhost`, so the HTTP cron jobs (outbox, retention, deletions) do not fire locally. Run `pnpm dev:cron` in a second terminal to simulate them (see [`docs/backend/OPERATIONS.md`](./docs/backend/OPERATIONS.md) §6.3).

---

## 🛠️ Available Scripts

| Group | Script | Purpose |
|---|---|---|
| App | `pnpm dev` / `build` / `start` | Dev server (port 3000), production bundle, production server |
| App | `pnpm format` | Prettier |
| Quality | `pnpm typecheck` | `tsc --noEmit` across the project |
| Quality | `pnpm lint` | Next.js ESLint |
| Quality | `pnpm test` | Vitest: pricing, EMI, SLA, masking, booking engine, lead lifecycle, RLS matrix, cron auth, API guards, discount rules and more |
| Quality | `pnpm rls:test` | RLS matrix tests only |
| Quality | `pnpm check:env` | Validates required environment variables |
| Quality | `pnpm check:wiring` | Dead-button audit (`notWired()` registry) |
| Quality | `pnpm check:buttons` | Shared Button component usage audit |
| Quality | `pnpm check:layout` | Layout regression audit |
| Quality | `pnpm smoke` / `pnpm probe` | Smoke test and API probe against a running server |
| Database | `pnpm db:push` | Apply pending migrations (guarded to the DEV project; needs `SUPABASE_PROJECT_REF`) |
| Database | `pnpm db:lint` | Lint the live schema and PL/pgSQL functions |
| Database | `pnpm db:types` | Regenerate `src/types/db.ts` from the DEV schema |
| Ops | `pnpm dev:cron` | Local stand-in for the HTTP cron jobs |
| Ops | `scripts/backup-schema.bat` / `.sh` | Dump schema and seed (see Operations doc) |

---

## 🗄️ Backend (Supabase)

- **Migrations:** `supabase/migrations/0001`–`0019` are the single source of truth. Never edit an applied migration; add a new one. Seed data lives in `supabase/seed.sql`; email templates in `supabase/templates/`.
- **Schema:** 38 objects in `public` (catalog, pricing, used cars, slots & bookings, leads & assignment, consents, data requests, outbox, audit) plus a `private` schema for helpers that PostgREST does not expose.
- **Security:** RLS enabled on every `public` table, default deny. All `SECURITY DEFINER` functions set `search_path = ''` and have explicit grants. Role matrix in [`docs/backend/ROLE_MATRIX.md`](./docs/backend/ROLE_MATRIX.md).
- **Key RPCs:** `create_lead`, `book_slot`, `cancel_booking`, `reassign_lead`, `set_lead_status`, `get_onroad_breakup`, `get_onroad_teaser`, `get_used_car_reg`, `get_leak_metrics`, `request_account_deletion`, `admin_set_role`. Call paths: [`docs/backend/RPC_CALL_PATHS.md`](./docs/backend/RPC_CALL_PATHS.md).
- **Scheduled jobs:** created by `private.ensure_cron_jobs()`. SQL jobs (SLA evaluation, slot generation, idempotency and rate-limit purges) run in-database. HTTP jobs (outbox, data retention, finalize deletions) need the Vault secrets `app_url` and `cron_secret`; after adding them run `select private.ensure_cron_jobs();`. Check status with `public.get_cron_status()`.
- **Outbox:** customer messages are queued in `messages_outbox` and delivered by `/api/cron/outbox` with backoff and stale-claim recovery. Email (Resend) and WhatsApp (Meta Cloud API) are real when keys are set, otherwise rows are `skipped`. SMS was removed.
- **Environments:** DEV (`vrooma-dev`) and PROD are separate projects. Promote migrations DEV → PROD only after DEV verification ([`ENVIRONMENTS.md`](./docs/backend/ENVIRONMENTS.md), [`OPERATIONS.md`](./docs/backend/OPERATIONS.md)).

### API routes (`src/app/api`)

| Route | Purpose | Access |
|---|---|---|
| `GET /api/health` | Health check | Public |
| `GET /api/price` | On-road price breakup from admin price rules | Public (full breakup gated) |
| `GET /api/slots` | Available test-drive / service slots | Public |
| `GET /api/cars/search` | Catalog search | Public |
| `GET/POST /api/bookings` | List / create bookings | Signed-in user (idempotent) |
| `GET/POST /api/leads` | List / create leads (auto-assigned) | Staff roles |
| `GET/PATCH /api/leads/[id]` | Lead detail, status, re-assign | Staff roles |
| `POST /api/leads/import` | Portal CSV import | Staff |
| `POST /api/ai/lead-copilot` | AI summary and first-reply draft (discount-guarded) | Staff |
| `POST /api/chat` | Buyer chat assistant | Public |
| `POST /api/trade-in` (+ `/upload-urls`) | Trade-in request and photo upload URLs | Public |
| `POST /api/consent`, `/api/newsletter` | DPDP consent, newsletter opt-in | Public |
| `GET/PUT /api/me/profile`, `POST /api/me/delete` | Profile, DPDP erasure request | Signed-in buyer |
| `GET /api/export/daily-csv` | Daily DMS CSV export | Admin / manager or `CRON_SECRET` |
| `POST /api/outbox/send` | Manual outbox send | Admin or `CRON_SECRET` |
| `/api/cron/{sla,outbox,data-retention,finalize-deletions}` | Scheduled jobs | `CRON_SECRET` |
| `POST /api/auth/dev-login` | One-click dev sign-in | `development` only, 404 otherwise |

---

## 🧭 Interactive Demo Walkthrough

**Signing in (DEV only):** the seeded accounts `dev-buyer@`, `dev-consultant@`, `dev-manager@` and `dev-admin@vrooma.in` are created by `scripts/seed-dev-users.ts` (the shared dev password is defined in that script). Sign in with them on `/sign-in`, or, with `ALLOW_DEV_LOGIN=true` and `NODE_ENV=development`, call `POST /api/auth/dev-login` with `{ "role": "buyer|consultant|manager|admin" }`. The endpoint returns 404 in any other environment.

### 👤 Role 1: Car Buyer (Public & Self-Service)
1. **Explore Vehicle Catalog:** Visit `/cars` and filter by budget, fuel type, and transmission.
2. **Dynamic On-Road Price:** Open **Model H** (`/cars/model-h`). Switch variants to see specs and ex-showroom price update. Click **Calculate On-Road Price** to view the itemized RTO, insurance, handling, accessories, and TCS breakdown with its validity date.
3. **Certified Used Car Dossier:** Visit `/used-cars` to browse certified inventory with masked plates (`UP32 ** **** 1234`). Open **Model C VX** (`/used-cars/uc-1182`) for the 140-point inspection scorecard.
4. **Self-Service Test Drive:** Click **Book Test Drive** (`/book/test-drive`). Pick a showroom, demo car, date and live slot, then confirm with explicit DPDP consent.
5. **Loan EMI Calculator:** `/emi-calculator` for loan, tenure and rate sliders with the full amortisation schedule.
6. **Account & Privacy:** Sign in as the buyer to see `/dashboard` (bookings, saved cars, enquiries) and `/legal/data-rights` for data download and erasure requests.

### 💼 Role 2: Sales Consultant (Staff Lead Desk)
1. **Sign in** as `dev-consultant@vrooma.in`.
2. **Lead Desk & 5-Minute SLA:** `/staff` shows color-coded SLA countdowns. Breaches are flagged every minute by the `eval_lead_sla_breaches` job.
3. **AI Buyer Briefing & Guarded First Reply:** Click a lead (it opens in a side panel) for the 3-bullet AI summary and drafted reply. Forbidden discount words (`discount`, `छूट`) are blocked in the editor and on the server ([`DISCOUNT_RULES.md`](./docs/backend/DISCOUNT_RULES.md)).
4. **CSV Lead Importer:** the **Import CSV** button on the Lead Desk, with `scripts/seed-csv-sample.csv`, de-duplicates by phone number.
5. **Bookings:** `/staff/bookings` for test drives, service, attended / no-show and workshop bay load.

### 🔍 Role 3: Used-Car Manager
1. **Sign in** as `dev-manager@vrooma.in`.
2. **Used Stock:** `/staff/stock` shows the price band built from past sales of the same model (visible **only** to the manager and admin), the inspection scorecard, the audited plate reveal, vehicle intake, and the Trade-ins tab.

### 🏢 Role 4: Dealer Principal (Admin Executive)
1. **Sign in** as `dev-admin@vrooma.in`.
2. **₹2.11 Crore Revenue Leakage Monitor:** `/admin` shows live leakage analytics (₹1.62 Cr from slow lead response, ₹48.6 Lakh from dropped service calls).
3. **Live Price Rules CMS:** `/admin/catalog?tab=prices` edits Lucknow or Kanpur RTO rules with a live simulator.
4. **Team & Network:** `/admin/team` for roles, staff invites, lead routing rules, bay capacity and the slot calendar.
5. **System health and AI log:** tabs on `/admin`.

Staff sign-ins always land in their console (no public header or footer there). `pnpm e2e:console` and `pnpm layout:console` verify every console feature and layout against the dev project.

---

## 📐 Architecture & Standards

- **Source of Truth:** Full architectural specification and golden rules are in [`context.md`](./context.md).
- **Zero Dead Buttons:** Enforced via `notWired()` and audited in [`docs/WIRING.md`](./docs/WIRING.md).
- **DPDP Act 2023 Compliance:** Registration numbers masked publicly (full value only via `get_used_car_reg` for authorised staff), explicit unticked consent boxes, self-serve data download and erasure (`/api/me/delete`, 7-day cooling-off, then anonymisation).
- **English only:** one text catalogue (`messages/en.json`) read through `next-intl`; no language switcher.
- **Pure Arithmetic Engines:** Road tax, EMI amortisation and SLA timers are isolated pure functions with unit tests.
- **Server-side safeguards:** API guards (`src/server/auth/api-guard.ts`), timing-safe cron auth (`src/lib/cron-auth.ts`), CSP and security headers, trusted-proxy IP resolution, rate limiting and idempotency keys. See [`docs/backend/SECURITY.md`](./docs/backend/SECURITY.md).
- **CI:** `.github/workflows/ci.yml` runs env check, typecheck, lint, tests and build, plus a database-backed job (lead lifecycle, RLS matrix, booking engine).

---

## 📄 Documentation Directory

**Product & frontend**
- [`docs/BRIEF.md`](./docs/BRIEF.md) — Verbatim client brief
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — System layers
- [`docs/ROUTES.md`](./docs/ROUTES.md) — Application route table
- [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) — Schema, enums and tables
- [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md), [`BUTTON_SYSTEM.md`](./docs/BUTTON_SYSTEM.md), [`MOTION.md`](./docs/MOTION.md), [`ASSETS.md`](./docs/ASSETS.md) — Tokens, buttons, motion, imagery
- [`docs/LANDING.md`](./docs/LANDING.md), [`LISTING_CARDS.md`](./docs/LISTING_CARDS.md), [`LISTING_CARDS_V2.md`](./docs/LISTING_CARDS_V2.md), [`DASHBOARD.md`](./docs/DASHBOARD.md), [`LAYOUT_FIXES.md`](./docs/LAYOUT_FIXES.md) — Landing scenes, catalog cards, buyer dashboard
- [`docs/GATING.md`](./docs/GATING.md), [`AI.md`](./docs/AI.md), [`DPDP.md`](./docs/DPDP.md), [`SEO.md`](./docs/SEO.md), [`PERFORMANCE.md`](./docs/PERFORMANCE.md) — Gating, AI guardrails, privacy, SEO, budgets
- [`docs/TESTING.md`](./docs/TESTING.md), [`WIRING.md`](./docs/WIRING.md), [`DECISIONS.md`](./docs/DECISIONS.md), [`ROADMAP.md`](./docs/ROADMAP.md) — Tests, button registry, ADRs, roadmap

**Backend (`docs/backend/`)**
- [`STATUS.md`](./docs/backend/STATUS.md) — Phase progress and what is deferred
- [`ENVIRONMENTS.md`](./docs/backend/ENVIRONMENTS.md), [`OPERATIONS.md`](./docs/backend/OPERATIONS.md), [`RELEASE.md`](./docs/backend/RELEASE.md) — Environments, runbook, release checklist
- [`SECURITY.md`](./docs/backend/SECURITY.md), [`ROLE_MATRIX.md`](./docs/backend/ROLE_MATRIX.md), [`DISCOUNT_RULES.md`](./docs/backend/DISCOUNT_RULES.md) — Security review, roles, discount guard
- [`RPC_CALL_PATHS.md`](./docs/backend/RPC_CALL_PATHS.md), [`EXPORT.md`](./docs/backend/EXPORT.md), [`TESTING.md`](./docs/backend/TESTING.md), [`VERIFY_REPORT.md`](./docs/backend/VERIFY_REPORT.md) — RPC map, DMS export, backend tests, verification
- [`00 readme.md`](./docs/backend/00%20readme.md) — Phase runbook (phases 0–6 specs: audit, auth, schema, data layer, booking & leads, privacy, hardening)

---

## ⚖️ License
Proprietary — Internal Dealership Platform for Vrooma Brand X.
