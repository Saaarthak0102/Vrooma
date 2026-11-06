# VROOMA — 5-DAY DEVELOPMENT ROADMAP

## Day 1: Foundation, Pure Engines & Core Infrastructure
- [x] Configure Next.js 15, TypeScript, Tailwind CSS, Lucide icons, Vitest, and Radix UI.
- [x] Define domain types, database schemas (`supabase/migrations`), and initial seed data.
- [x] Implement pure arithmetic engines:
  - [x] Dynamic on-road price engine with RTO, TCS, insurance, accessories (`src/lib/price-engine.ts`).
  - [x] Automotive reducing-balance loan EMI and amortisation schedule engine (`src/lib/emi.ts`).
  - [x] Registration plate and phone number privacy masking (`src/lib/masking.ts`).
  - [x] 5-minute lead response SLA state machine (`src/lib/sla.ts`).
- [x] Achieve 100% unit test coverage for pure engines (`tests/*`).
- [x] Set up i18n routing and authentic English/Hindi translation dictionaries (`messages/*`).
- [x] Implement dead-button audit script (`scripts/check-wiring.mjs`) and `notWired()` helper.

---

## Day 2: Frontend Pages & Layouts (Mock Data)
- [x] Build luxury automotive design system tokens and layout shell (`SiteHeader`, `SiteFooter`, `Breadcrumbs`, `PageShell`).
- [x] Public vehicle discovery:
  - [x] Modern homepage with trust pillars, vehicle strips, and leakage counter.
  - [x] New car catalog with live facet filtering and sorting (`/cars`).
  - [x] Dynamic model detail page with 360 gallery, variant switcher, specs, and gated on-road price modal (`/cars/[modelSlug]`).
  - [x] Certified pre-owned catalog with masked plates and inspection badges (`/used-cars`).
  - [x] Used vehicle dossier with gated 140-point inspection modal and loan calculator (`/used-cars/[stockId]`).
- [x] Customer self-service tools:
  - [x] 5-step test-drive booking wizard by showroom and demo car (`/book/test-drive`).
  - [x] 4-step workshop service booking wizard by workshop bay capacity (`/book/service`).
  - [x] Interactive loan EMI calculator with real-time sliders and amortisation breakdown (`/emi-calculator`).
  - [x] Vehicle trade-in intake form with AI price estimation band (`/trade-in`).
  - [x] Facility locator (`/showrooms`), offers page (`/offers`), about & contact pages.
  - [x] DPDP compliance pages (`/legal/privacy`, `/legal/terms`, `/legal/data-rights`).
- [x] Buyer account portal (`/dashboard/*`) for bookings, saved cars, and personal data erasure.
- [x] Staff and admin consoles, consolidated to 2-3 spreadsheet-style screens per role (see `docs/ROUTES.md`):
  - [x] Consultant: Lead Desk (`/staff`: SLA timers, inline stage, AI summary and guarded reply, reassign, activity, CSV import) and Bookings (`/staff/bookings`: attended / no-show, bay load).
  - [x] Used-Car Manager: Used Stock (`/staff/stock`: manager-only price band from past sales, scorecard, audited plate reveal, vehicle intake, trade-ins with photos).
  - [x] Dealer Principal: Overview (`/admin`: live metrics, leakage monitor, AI reply log, system health), Catalog (`/admin/catalog`: models, variants, price rules, offers, banners), Team (`/admin/team`: roles, invite, bays, routing rules, slot calendar).
  - [x] Every action verified against Supabase by `scripts/console-e2e.mjs`; layout verified by `scripts/console-layout.mjs`.

---

## Day 3: Supabase Backend Integration & Admin Wiring
- [ ] Connect live Supabase project and execute database migrations `0001` through `0007`.
- [ ] Implement Supabase client repository queries in `src/server/repositories/*`.
- [x] Wire admin mutations (done; 0 `notWired()` placeholders remain):
  - [ ] Model & variant creation/editing.
  - [ ] City price rule updates.
  - [ ] Used car stock intake with 140-point inspection JSON.
  - [ ] Showroom and bay capacity management.
  - [ ] Lead auto-assignment rules.

---

## Day 4: Buyer Authentication & Booking Fulfillment
- [ ] Configure Supabase Auth (Email OTP only; Google was removed).
- [ ] Wire customer dashboard mutations (retiring Day 4 `notWired()` placeholders):
  - [ ] Test drive cancellation and rescheduling.
  - [ ] Saved cars wishlist toggling.
  - [ ] Mark booking attended from staff calendar.
- [ ] Implement real-time lead inbox synchronization via Supabase Realtime WebSocket subscriptions.
- [ ] Deploy SLA escalation cron job (`/api/cron/sla`).

---

## Day 5: AI Integration, Landing Animations & Production Polish
- [ ] Connect live LLM provider (Vercel AI SDK + OpenAI / Anthropic / Gemini):
  - [ ] Live streaming AI buyer summary extraction.
  - [ ] First-reply draft generation with hard discount guardrails.
  - [ ] Historical regression model for used car resale price bands.
- [ ] Wire transactional notifications via Resend API (customer test drive confirmation & WhatsApp simulation).
- [ ] Implement Phase 2 high-fidelity animated landing page:
  - [ ] Lenis inertial smooth scroll.
  - [ ] GSAP canvas 3D car turnstile scene (`HeroScene`).
  - [ ] Pinned scroll-scrub showroom orbit and transparent pricing layers.
- [ ] Final wiring check: Verify `pnpm check:wiring` outputs 100% wired (0 placeholders left).
- [ ] End-to-end performance audit, Core Web Vitals verification, and Vercel production deployment.

