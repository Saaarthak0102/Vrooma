# VROOMA BACKEND: IMPLEMENTATION STATUS & PROGRESSION

**Last Updated:** 2026-11-04  
**Current Phase:** Phase 2 Complete (Migrations, RLS, Seed, RPCs & Tests Ready for Remote DB Push)  
**Branch / Worktree:** Main  

---

## 1. Phase Progression Overview

| Phase | Specification Document | Description | Status | Sign-Off Date |
|:---:|---|---|:---:|:---:|
| **0** | `docs/backend/01 audit.md` | Frontend-to-Backend Audit (Documentation only, zero code changes) | **COMPLETE** | 2026-11-04 |
| **1** | `docs/backend/02 auth.md` | Real sign-in, sign-up, onboarding, sessions, roles, guards | **COMPLETE** | 2026-11-04 |
| **2** | `docs/backend/03 schema.md` | Production schema, RLS, functions, cron, storage, seed | **COMPLETE** | 2026-11-04 |
| **3** | `docs/backend/04 data layer catalog.md` | Mock removal; catalog, pricing, admin CRUD on real data | READY | — |
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
  - Admin bootstrap script: `node --experimental-strip-types scripts/bootstrap-admin.ts <email> [--force]`.
  - Dev user seeding script: `node --experimental-strip-types scripts/seed-dev-users.ts`.
  - Dev password sign-in endpoint: `src/app/api/auth/dev-login/route.ts` (strictly 404 in production).

---

## 3. Phase 2 Implementation Summary (Schema, Constraints, RLS, RPCs, Storage & Seed)

### 3.1 Migration Sequence (`supabase/migrations/`)
Clean, ordered 13-migration split:
1. `0001_extensions_schemas_enums.sql`: Extensions (`uuid-ossp`, `pgcrypto`, `pg_trgm`, `btree_gist`, `citext`, `unaccent`), `private` schema with `touch_updated_at()`, and all domain enums.
2. `0002_identity_profiles_consents.sql`: `profiles` (with phone regex constraint, citext email, is_active, timestamps), `staff_showrooms`, `consultant_availability`, `consents`, `current_consents` view, `consultant_public` view, `handle_new_user` trigger, helper functions (`private.current_role()`, `private.is_staff()`, `private.is_manager()`, `private.is_admin()`, `private.user_showrooms()`), and column-level privileges revoking direct role escalation.
3. `0003_geo_catalog.sql`: `cities`, `showrooms` (with `private.validate_hours()` check), `workshops`, `showroom_closures`, `models`, `variants`, and `variant_colors`.
4. `0004_pricing.sql`: `price_rules` with non-overlapping `btree_gist` exclusion constraint (`EXCLUDE USING gist (city_id WITH =, scope_key WITH =, daterange(valid_from, valid_until, '[]') WITH &&)`), and `resolve_price_rule()` resolution logic.
5. `0005_used_cars.sql`: `used_cars` with `reg_no_masked` generated column via `private.mask_reg_number()`, status transition trigger `check_used_car_transition()`, column privileges revoking `reg_no_private` select, `used_car_sales_history`, and `used_car_price_suggestions`.
6. `0006_slots_bookings.sql`: `demo_cars`, `service_types`, `slots` (with `capacity >= 1`, `booked_count` check, resource_id generated column), `bookings` (with partial unique active slot index), and `idempotency_keys` store.
7. `0007_leads_assignment.sql`: `leads` (with SLA tracking, 24h dedupe index, portal unique ref index), `lead_events` timeline, `assignment_rules`, `assignment_rule_consultants` join table, and buyer-safe `my_enquiries` view.
8. `0008_messaging_audit_ops.sql`: `messages_outbox`, `audit_log` with generic `private.audit()` trigger, `rate_limits` with `private.hit_rate_limit()`, `newsletter_subscribers`, `csv_imports`, `ai_logs`, `saved_items` (disjoint check constraint), `trade_in_requests`, `offers`, and `banners`.
9. `0009_privacy_requests.sql`: `data_requests`, `request_account_deletion()`, and `private.anonymise_user()` PII scrub routine.
10. `0010_rls_policies.sql`: Complete RLS policy implementation across all tables according to Section 3 matrix.
11. `0011_functions_rpc.sql`: Security definer RPCs (`complete_profile`, `get_onroad_teaser`, `get_onroad_breakup`, `create_lead`, `assign_lead`, `reassign_lead`, `set_lead_status`, `book_slot`, `cancel_booking`, `reschedule_booking`, `generate_slots`, `flag_sla_breaches`, `get_leak_metrics`, `get_used_car_reg`, `admin_set_role`).
12. `0012_cron_jobs.sql`: `pg_cron` automated schedules (SLA breaches, daily 14-day slots, idempotency TTL cleanup, rate limit purge, anonymization).
13. `0013_storage.sql`: Storage buckets (`car-media`, `inspection-reports`, `trade-in-photos`) and storage RLS policies.

### 3.2 Master Seed Script (`supabase/seed.sql`)
- Idempotent seed data for 2 cities, 3 showrooms, 2 workshops, closures, 5 models, 8 variants (including Model H ZX AT `NEW-H-02`), colors, demo fleet, service types, certified used cars (`UC-1182`, `UC-1190` booked, `UC-1204`), historical sales data, pricing rules, offers, banners, staff profile placeholders (6 consultants + 1 manager), and assignment rules with join table.
- Does not insert directly into `auth.users`.

### 3.3 Scripts and Verification Tools
- `scripts/db-push.mjs` (`pnpm db:push`): Refuses to execute unless `SUPABASE_PROJECT_REF` matches `ajumkjokagqfdikfguti` and `--yes` is supplied.
- `scripts/db-lint.mjs` (`pnpm db:lint`): Validates migration numbering, transaction wrapping, universal RLS enablement, privacy column grants, and search_path isolation.
- `scripts/rls-matrix.ts` & `tests/rls-matrix.test.ts` (`pnpm rls:test`): Automated matrix assertion covering all 5 personas (anon, buyer, consultant, manager, admin) and private column masks.
- `tests/db-edge-cases.test.ts`: Automated test suite for all 16 concurrency and constraint edge cases.

---

## 4. Four Supabase Clients Contract (Convention 2)

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

## 5. Human Step (Pending Before Remote Database Migration)

Per Phase 2 specification ("0. HUMAN STEPS - stop and wait"):
The agent must **NOT** run `db push` against any Supabase project until the user confirms the project ref is the DEV project:
- Target DEV Project Ref: `ajumkjokagqfdikfguti`
- Command to push when confirmed:
  `SUPABASE_PROJECT_REF=ajumkjokagqfdikfguti pnpm db:push --yes`
