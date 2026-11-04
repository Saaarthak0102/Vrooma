# VROOMA BACKEND: IMPLEMENTATION STATUS & PROGRESSION

**Last Updated:** 2026-11-04  
**Current Phase:** Phase 0 Complete — Phase 1 Ready  
**Branch / Worktree:** Main  

---

## 1. Phase Progression Overview

| Phase | Specification Document | Description | Status | Sign-Off Date |
|:---:|---|---|:---:|:---:|
| **0** | `docs/backend/01 audit.md` | Frontend-to-Backend Audit (Documentation only, zero code changes) | **COMPLETE** | 2026-11-04 |
| **1** | `docs/backend/02 auth.md` | Real sign-in, sign-up, onboarding, sessions, roles, guards | **COMPLETE** | 2026-11-04 |
| **2** | `docs/backend/03 schema.md` | Production schema, RLS, functions, cron, storage, seed | READY | — |
| **3** | `docs/backend/04 data layer catalog.md` | Mock removal; catalog, pricing, admin CRUD on real data | PENDING | — |
| **4** | `docs/backend/05 booking lead.md` | Slots, test drives, service, leads, SLA, CSV import/export, outbox | PENDING | — |
| **5** | `docs/backend/06 account privacy.md` | Profile, saved, enquiries, trade-in, consent, data rights, newsletter | PENDING | — |
| **6** | `docs/backend/07 hardening release.md` | Security review, tests, observability, performance, release checklist | PENDING | — |

---

## 2. Phase 1 Implementation Summary (Auth, Onboarding & Route Protection)

### 2.1 What Was Built
- **Email Templates (`supabase/templates/`):**
  - Responsive, branded HTML templates for: `confirmation.html`, `magic_link.html`, `invite.html`, `email_change.html`, `reauthentication.html`.
  - Prominent 6-digit numeric verification code (`{{ .Token }}`) with secondary fallback link (`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=<type>&next=...`). Hindi subtitle hint included.
- **Supabase Clients Tier (`src/lib/supabase/`):**
  - Browser Client (`client.ts`), Next.js 15 Cookie Server Client (`server.ts`), Cookie-less Public ISR Client (`public.ts`), and `server-only` Admin Client (`admin.ts`).
- **Route Guards & Middleware (`src/middleware.ts` & `src/lib/supabase/middleware.ts`):**
  - Dual-layer composed middleware: Next.js 15 + `next-intl` (handling `localePrefix: "as-needed"`) + Supabase session refresh.
  - Public static catalog pages (`/`, `/cars`, `/used-cars`, `/offers`, `/showrooms`, `/legal`) bypass auth checks entirely for ISR caching and sub-2.5s loads.
  - Protected paths (`/dashboard`, `/profile`, `/staff`, `/admin`, `/onboarding`, `/sign-in`, `/sign-up`, `/auth`) refresh claims and copy cookies to redirects/responses with `Cache-Control: private, no-store`.
  - Guard logic: Unauthenticated -> `/sign-in?next=`; Incomplete profile (`onboarding_completed_at IS NULL`) -> `/onboarding?next=`; Role mismatch on `/staff` or `/admin` -> 403 Forbidden; Inactive profile (`is_active = false`) -> clean sign-out with `account_disabled` banner.
- **Pages & Components:**
  - `/sign-up`: 2-column desktop layout (3 key value propositions on left; 2-step form on right), 3 unticked DPDP consent checkboxes, 6-digit numeric input with paste & auto-submit, 60s cooldown timer.
  - `/onboarding`: Mandatory profile completion screen with prefilled details, terms & privacy consents, and sign-out as the only exit.
  - `/sign-in` & `SignInSheet`: Refactored to real passwordless OTP and Google OAuth with URL error code translation banners.
  - `/auth/callback` & `/auth/confirm`: Production route handlers for OAuth code exchange and token-hash email verification.
  - `AuthProvider` & `UserMenu`: SSR hydration via `onAuthStateChange`, multi-tab session sync, pending intent preservation across OAuth flows (30 min TTL in `sessionStorage`), CLS reserved width in header.
- **Server Actions & Utilities (`src/server/auth/`):**
  - `safeNext(rawNext, locale)`: Strict Open Redirect protection with allow-list, blocking `//`, `/\`, `\\`, external schemes, and encoded bypasses.
  - `normalizeIndianPhone(phone)`: Cleans and standardizes Indian mobile numbers to `+91XXXXXXXXXX`.
  - Server actions: `requestOtp`, `verifyOtp`, `startGoogle`, `completeProfile`, `signOut`, `inviteStaff`.
- **Database & Administration:**
  - Migration `supabase/migrations/0010_auth_profiles.sql` adding `email`, `whatsapp`, `address`, `pincode`, `is_active`, and `onboarding_completed_at` to `profiles`, user auto-provision trigger `on_auth_user_created`, atomic `complete_profile` RPC, and RLS policies.
  - Admin bootstrap script: `node --experimental-strip-types scripts/bootstrap-admin.ts <email> [--force]`.
  - Dev user seeding script: `node --experimental-strip-types scripts/seed-dev-users.ts`.
  - Dev password sign-in endpoint: `src/app/api/auth/dev-login/route.ts` (strictly 404 in production).

---

## 3. Four Supabase Clients Contract (Convention 2)

- **Deliverable:** `docs/backend/AUDIT.md` produced covering:
  - Screen inventory (41 routes + 4 interactive widgets + 17 API route handlers).
  - Form inventory (27 forms and mutating buttons).
  - Profile and sign-up fields matrix with DPDP minimisation evaluation.
  - Domain type vs PostgreSQL schema diff (identifying 9 structural schema vulnerabilities).
  - Mock leftovers inventory (36 `memoryStore` usages, 28 `notWired()` buttons, 23 repository TODOs).
  - DPDP Act 2023 personal data lifecycle and erasure schedule.
  - Security gaps (public lead leaks, unauthenticated CSV export, price breakup API leak).
  - Implementation sizing and risk matrix.
- **Source Code Status:** Strictly **ZERO** source code files were edited or mutated during Phase 0.

---

## 3. Four Supabase Clients Contract (Convention 2)

To maintain strict security and caching isolation across Next.js 15, exactly four Supabase clients are permitted:

1. **Browser Client (`createBrowserClient`):**
   - File: `src/lib/supabase/client.ts`
   - Key: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (browser-safe)
   - Scope: Client Components requiring direct real-time subscriptions or browser auth state.
2. **Server User Client (`createServerClient`):**
   - File: `src/lib/supabase/server.ts`
   - Key: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with Next.js cookie adapter
   - Scope: Authenticated Server Components, Server Actions, Route Handlers operating on user data.
3. **Public Catalog Client (Anon, NO cookies):**
   - File: `src/lib/supabase/public.ts`
   - Key: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with **zero** cookie reading
   - Scope: Next.js ISR and statically generated public catalog routes (`/`, `/cars`, `/cars/[slug]`, `/used-cars`, `/offers`, `/showrooms`). Guarantees zero `cookies()` invocation.
4. **Admin Client (Secret Key, `server-only`):**
   - File: `src/lib/supabase/admin.ts`
   - Key: `SUPABASE_SECRET_KEY`
   - Requirement: File starts with `import "server-only"`.

### Allow-Listed Functions for Admin Client (Strictly Restricted)
The following functions alone are authorized to invoke the Admin Client:
- `adminInviteStaffUser(email, role, facilityId)` — Inviting consultants/managers via Supabase Auth Admin API.
- `cronEvaluateLeadSlaBreaches()` — SLA background worker updating breached leads.
- `cronGenerateBaySlots(startDate, days)` — Automated 30-day capacity generator.
- `dpdpExecuteAccountPurge(userId, email)` — Permanent PII scrubbing and anonymization worker.
- `dmsDailyCsvExport()` — Scheduled DMS lead sync exporter.

*Never import the Admin Client from any client component or general repository function.*

---

## 4. Open Questions & Recommended Defaults

| # | Item / Decision | Recommended Default | Status |
|---|---|---|:---:|
| 1 | Remove address & PIN code from sign-up form | **Yes.** Defer to `/profile` or Home Test Drive request. | Awaiting Product Owner Sign-off |
| 2 | Mask customer vehicle registration numbers after service | **Yes.** Store full registration for active job card; mask after 90 days. | Awaiting Product Owner Sign-off |
| 3 | Provision anonymous guest session for test-drive bookings | **Yes.** Auto-provision phone-verified guest session so booking docket renders instantly. | Awaiting Product Owner Sign-off |
| 4 | Visible on-road price estimate vs gated itemized breakup | **Keep total visible, gate tax lines.** Shows pricing transparency while retaining lead capture. | Awaiting Product Owner Sign-off |
| 5 | Trade-in submissions triggering 5-minute sales SLA | **Yes.** Auto-create a lead with `source = 'trade_in'` assigned to pre-owned manager. | Awaiting Product Owner Sign-off |

---

## 5. Next Phase: Phase 1 Checklist (from `02 auth.md`)

When ready to start Phase 1:
- [ ] Configure `.env.local` with real Supabase keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
- [ ] Implement four Supabase clients adhering to Convention 2.
- [ ] Create dedicated `/sign-up` page and multi-step onboarding wizard.
- [ ] Compose `src/middleware.ts` combining `next-intl` and Supabase `updateSession`.
- [ ] Enforce server-side role guards on `/dashboard/*`, `/staff/*`, and `/admin/*`.
- [ ] Remove `vrooma_mock_user` localStorage synchronization.

