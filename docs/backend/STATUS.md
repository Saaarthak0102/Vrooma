# VROOMA BACKEND: IMPLEMENTATION STATUS & PROGRESSION

**Last Updated:** 2026-11-07  
**Current Phase:** Phase 6 Complete (Hardening, Security Review, Observability, Tests & Release Checklist)  
**Branch / Worktree:** Main  

---

## 1. Phase Progression Overview

| Phase | Specification Document | Description | Status | Sign-Off Date |
|:---:|---|---|:---:|:---:|
| **0** | `docs/backend/01 audit.md` | Frontend-to-Backend Audit (Documentation only, zero code changes) | **COMPLETE** | 2026-11-04 |
| **1** | `docs/backend/02 auth.md` | Real sign-in, sign-up, onboarding, sessions, roles, guards | **COMPLETE** | 2026-11-04 |
| **2** | `docs/backend/03 schema.md` | Production schema, RLS, functions, cron, storage, seed | **COMPLETE** | 2026-11-04 |
| **3** | `docs/backend/04 data layer catalog.md` | Mock removal; catalog, pricing, admin CRUD on real data | **COMPLETE** | 2026-11-04 |
| **4** | `docs/backend/05 booking lead.md` | Slots, test drives, service, leads, SLA, CSV import/export, outbox | **COMPLETE** | 2026-11-05 |
| **5** | `docs/backend/06 account privacy.md` | Profile, saved, enquiries, trade-in, consent, data rights, newsletter | **COMPLETE** | 2026-11-05 |
| **6** | `docs/backend/07 hardening release.md` | Security review, tests, observability, performance, release checklist | **COMPLETE** | 2026-11-05 |

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
- `scripts/db-push.mjs` (`pnpm db:push`): Refuses to execute unless `SUPABASE_PROJECT_REF` matches `eobtzcwinjmimzisypca` (DEV) and `--yes` is supplied.
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

## 5. Human Step (Environment Verification & Promotion Policy)

DEV project is `eobtzcwinjmimzisypca`; PRODUCTION is `ajumkjokagqfdikfguti`.
- Target DEV Project Ref: `eobtzcwinjmimzisypca`
- Target PROD Project Ref: `ajumkjokagqfdikfguti`
- Command to push to DEV when confirmed:
  `SUPABASE_PROJECT_REF=eobtzcwinjmimzisypca pnpm db:push --yes`
- Command to push to PROD (only after DEV passes and approval):
  `pnpm db:push --target prod --i-am-targeting-production`

---

## 6. Phase 3 Implementation Summary (Real Data Layer, Pricing RPC & Admin CRUD)

### 6.1 What Was Built & Replaced
- **Full Mock Layer Decommissioning:**
  - Deprecated and removed in-memory store and `USE_MOCK` branching across all domain repositories: `models`, `variants`, `pricing`, `used-cars`, `showrooms`, `offers`, `slots`, `bookings`, `leads`, `users`, `saved`, `trade-in`.
  - Zero `TODO(day-` repository markers remaining (`node scripts/check-wiring.mjs` passes with 0 TODOs).
  - Strict client separation enforced: `createPublicClient()` for static/ISR catalog reads; `createServerClient()` for authenticated user contexts; `createAdminClient()` strictly for elevated background tasks and admin CMS operations.
  - `reg_no_private` column is strictly blocked from public listing queries and catalog endpoints.

- **On-Road Pricing Engine RPC:**
  - Integrated PostgreSQL `resolve_price_rule` stored procedure with UUID normalization and multi-tier priority fallback (Variant > Model > Fuel > City-wide).
  - Cache tagging via `cachedQuery` on Next.js 15 App Router with tag `['price']`.

- **Next.js 15 Tagged Caching Architecture (`src/server/cache.ts`):**
  - High-performance cached query wrapper with deterministic key generation.
  - Dedicated cache tags: `models`, `used`, `price`, `showrooms`, `workshops`, `offers`, `banners`.
  - Selective on-demand revalidation helpers (`safeRevalidateTag`, `safeRevalidatePath`).

- **Admin CMS & Catalog Server Actions (`src/server/actions/admin-catalog.ts`):**
  - `saveModelAction`, `deactivateModelAction` (with optimistic concurrency check on `updated_at` and `['models']` cache invalidation).
  - `savePriceRuleAction`, `deletePriceRuleAction` (with PostgreSQL exclusion constraint conflict handling [SQLSTATE `23P01`] and `['price']` cache invalidation).
  - `saveUsedCarAction`, `updateUsedCarStatusAction` (with status transitions, PII masking guarantees, and `['used']` cache invalidation).
  - `saveOfferAction`, `deleteOfferAction` (with `['offers']` cache invalidation).
  - `saveBannerAction` (with `['banners']` cache invalidation).
  - `setStaffRoleAction` (with RBAC enforcement and `audit_log` logging).

- **Admin & Staff Console Server Components Migration:**
  - Converted admin and staff pages to server components with client views (`AssignmentClient`, `BannersClient`, `ModelsClient`, `ModelDetailClient`, `OffersClient`, `PricesClient`, `ShowroomsClient`, `SlotsClient`, `UsedCarsClient`, `UsedCarDetailClient`, `UsersClient`, `StaffOverviewClient`, `StaffBookingsClient`, `StaffLeadsClient`, `LeadDetailClient`).

### 6.2 Verification Status
- **TypeScript Typecheck:** `npx tsc --noEmit` passed with 0 errors.
- **ESLint:** `npm run lint` passed with 0 errors, 0 warnings.
- **Vitest Suite:** 24/24 test files passed, 245/245 tests passing (100%).
- **Production Build:** `npm run build` passed successfully, generating all 117 static & dynamic routes without warnings.

---

## 7. Phase 4 Implementation Summary (Slots, Bookings, Leads, SLA, CSV, Outbox)

### 7.1 What Was Built

1. **Slots & Atomic Booking Engine:**
   - Real slot queries via `GET /api/slots` with public ISR cache (`Cache-Control: public, s-maxage=30, stale-while-revalidate=60`).
   - IST day boundaries (`Asia/Kolkata`, UTC+05:30) calculated deterministically via `getISTDayRangeUTC`.
   - Server-side 2-hour minimum advance booking lead-time cutoff.
   - Taken or full slots returned with `booked_count >= capacity` and displayed disabled, never hidden.
   - Server action `bookSlotAction` invoking `book_slot` RPC:
     - Handles concurrency conflicts (`VR001`) returning typed `CONFLICT`.
     - Validates profile completeness (`requireCompleteProfile`) and DPDP consent.
     - Blocks overlapping bookings of the same kind for the same user.
     - Automatically attaches a `leads` record in the same transaction for sales desk assignment.
     - Normalizes and masks vehicle registration numbers (`UP32 ** **** 1234`) according to DPDP Act 2023.
   - Server actions `cancelBookingAction` (releasing capacity) and `rescheduleBookingAction` (atomic slot swap).
   - Server action `generateSlotsAction` for admin slot generation up to 60 days in advance.
   - Updated client booking wizards (`/book/test-drive` and `/book/service`) completely removing all mock data imports.

2. **Leads Pipeline & Staff Console Actions:**
   - Public lead intake route handler `POST /api/leads` with Zod validation, hidden honeypot spam protection, per-IP and per-phone rate limiting (429 with `Retry-After: 60`), and phone E.164 normalization.
   - Staff server action `updateLeadStatusAction` with optimistic concurrency conflict detection on `updated_at`.
   - Staff server action `reassignLeadAction` with required audit reason and event tracking.
   - Staff server action `sendLeadReplyAction` enforcing strict dealership policy: hard-blocking discount words (`discount`, `price cut`, `off`, `waiver`, `छूट`, `कम`).
   - Automated SLA breach worker `GET /api/cron/sla` calling `flag_sla_breaches` RPC via admin client with `CRON_SECRET` protection.

3. **Portal CSV Ingestion (`/api/leads/import`):**
   - File limits: <= 2 MB, <= 2,000 rows.
   - UTF-8 BOM (`\uFEFF`) stripping and delimiter auto-detection (`,`, `;`, `\t`).
   - Flexible case-insensitive header mapping.
   - Formula injection neutralisation on import (stripping leading `= + - @`).
   - Deduplication within batch and against database (24h dedupe rule).
   - Ingestion logging to `public.csv_imports`.

4. **Daily DMS CSV Feed (`/api/export/daily-csv?date=`):**
   - Protected by `CRON_SECRET` bearer token or Dealership Admin/Manager session.
   - Streams full IST calendar day inbound leads and bookings.
   - CSV injection immunity via `escapeCsvCellForExport` (prefixing `'` on all formula trigger characters).
   - Documented in `docs/backend/EXPORT.md`.
   - Immutable audit logging in `public.audit_log`.

5. **Outbox Background Worker (`/api/cron/outbox`):**
   - Scheduled worker claiming pending/failed batches with optimistic locking.
   - Exponential retry backoff (1m, 5m, 30m, 120m).
   - Dead-letter queue marking (`status = 'dead'`) after 5 failed attempts.
   - Resend email transmission with local test/dev simulation fallback.

6. **Dealer Principal "Leak" Monitor (`src/server/actions/admin-leak.ts`):**
   - Server action `getLeakMetricsAction` invoking `get_leak_metrics` RPC.
   - Direct mathematical alignment with brief assumptions for the ₹2.11 crore operational leak (54 lost sales × ₹25,000 dealer contribution = ₹1.62 cr/yr; 300 migrating owners × ₹4,500 × 30% margin = ₹48.6 lakh/yr).

### 7.2 Verification Status
- **TypeScript Typecheck:** `npx tsc --noEmit` passed with 0 errors.
- **ESLint:** `npm run lint` passed with 0 errors, 0 warnings.
- **Wiring Placeholders:** All Phase 4 placeholders wired; 0 repository `TODO(day-` markers.
- **Vitest Suite:** 27/27 test files passed, 261/261 tests passing (100%).
- **Production Build:** `npm run build` compiled all 118 static and dynamic routes with exit code 0.

---

## 8. Phase 5 Implementation Summary (Account, Privacy [DPDP Act 2023], Saved, Enquiries, Trade-In & Newsletter)

### 8.1 What Was Built

1. **Buyer Dashboard Data Engine (`src/server/actions/buyer-dashboard.ts`):**
   - Single coordinated action `getBuyerDashboardDataAction` fetching real database appointments, saved items, and enquiries.
   - Upcoming appointments joined with slots, facilities, profiles, and display names, sorted soonest-first and capped at 50.
   - Saved items joined with live catalog: models and certified used cars; count and list from the SAME query.
   - Graceful handling of sold or deactivated used cars ("No longer available" card with remove button, never an error or missing row).
   - Sanitized buyer enquiries view (`my_enquiries`) completely hiding internal notes, staff commentary, and AI drafts.
   - Gated save/unsave actions (`toggleSaveVehicleAction`, `removeSavedVehicleAction`) with optimistic client UI and rollback on error.
   - Real `ref` column used with fallback to `bookingRef()`.

2. **Real Profile View & Concurrency (`src/server/actions/profile.ts` & `src/components/profile/ProfileView.tsx`):**
   - Profile updates via `updateBuyerProfileAction` with phone re-normalization (`+91XXXXXXXXXX`), PIN code, address, and city.
   - Concurrency protection: optimistic lock checking `expectedUpdatedAt` vs `profile.updated_at` to reject stale writes.
   - Email change flow via `requestEmailChangeAction` using Supabase `auth.updateUser({ email })` with inbox verification explanation.
   - DPDP marketing consent toggle appending immutable consent audit records rather than mutable booleans.
   - Bilingual language preference updating both profile and `NEXT_LOCALE` cookie.
   - Danger zone account erasure trigger with 7-day cooling-off grace period notice.

3. **Statutory DPDP Consent Module (`src/server/privacy/consent.ts`):**
   - Append-only consent logging (`recordConsent`, `withdrawConsent`, `hasCurrentConsent`).
   - Constant `POLICY_VERSION = "2026.1"`.
   - Deterministic SHA-256 consent text hashing (`computeConsentTextHash`).
   - Tamper-proof HMAC unsubscribe token generation (`generateUnsubscribeToken`) and verification (`verifyUnsubscribeToken`).
   - One-click unsubscribe page `/[locale]/unsubscribe/[token]` recording statutory consent withdrawal without login requirement.

4. **Self-Service DPDP Data Rights Portal (`/legal/data-rights` & `src/server/actions/data-rights.ts`):**
   - Personal data portability docket (`generateUserDataExportAction`): exports complete user data dossier (profile, consents, bookings, enquiries, saved items, trade-ins) as downloadable JSON with audit record.
   - Signed-out public rights intake (`submitPublicDataRequestAction`) queueing verification notices to customer in `messages_outbox`.
   - Right to erasure workflow (`requestAccountDeletionAction`): releases upcoming bookings, closes open leads as `lost` ("Customer requested DPDP erasure"), notifies assigned staff, queues deletion tracking record, and signs out.

5. **Certified Trade-In Intake Engine (`/trade-in` & `src/server/actions/trade-in.ts`):**
   - Photo upload signing via `getTradeInUploadUrlsAction` (up to 6 photos, <= 5 MB each, JPEG/PNG/WebP only) in `trade-in-photos` bucket.
   - Comprehensive validation: year (2000 to current year + 1), km (0 to 500,000 km), condition, phone normalization, mandatory DPDP consent.
   - Creates sales lead (`source = 'trade_in'`) via `create_lead` RPC and inserts record in `public.trade_in_requests`.
   - Dynamic AI market indicative valuation band calculation.

6. **Production Newsletter Route (`POST /api/newsletter`):**
   - Double-check honeypot fields (`website`, `botCheck`) silently dropping spam bots.
   - Rate limiting per IP and per email address (429 Too Many Requests).
   - Mandatory explicit consent checkbox.
   - Idempotent upsert preventing email enumeration.
   - Automated double opt-in / confirmation notice queued in `messages_outbox` with HMAC unsubscribe link.

7. **Automated Background Data Retention & Erasure Finalization:**
   - `/api/cron/finalize-deletions`: Purges eligible accounts (> 7 days cooling-off period) via `private.anonymise_user(p_uid)` RPC and removes auth user.
   - `/api/cron/data-retention`: Anonymizes closed leads older than 24 months, purges expired outbox entries older than 90 days, and purges expired idempotency keys (> 7 days).

### 8.2 Verification Status
- **TypeScript Typecheck:** `npx tsc --noEmit` passed with 0 errors.
- **ESLint:** `npm run lint` passed with 0 errors, 0 warnings.
- **Vitest Suite:** 28/28 test files passed, 272/272 tests passing (100%).
- **Production Build:** `npm run build` compiled all 119 routes (100% static & dynamic generation) with exit code 0.

---

## 9. Phase 6 Implementation Summary (Hardening, Security Review, Observability, Tests & Release Checklist)

### 9.1 What Was Built & Verified

1. **Comprehensive Security Audit & Secret Scrubbing (`docs/backend/SECURITY.md`):**
   - Verified 0 secrets in git history via repository-wide search (`sb_secret_`, `service_role`, `eyJ`, `re_`).
   - Inspected `.next/static/**/*.js` client chunks; verified 0 secret keys leaked to the browser.
   - Enforced `import "server-only";` in `src/lib/supabase/admin.ts`.
   - Verified all 40+ call sites of `createAdminClient()`; confirmed all table references are static string literals without user-controlled dynamic queries or SQL injection risks.
   - Strict web security headers configured in `next.config.ts`: `Content-Security-Policy`, `Strict-Transport-Security` (2-year HSTS + preload), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
   - Origin & CSRF verification in `src/lib/security.ts` (`verifyRequestOrigin`) cross-checking `Sec-Fetch-Site` and `Origin` vs `Host`.
   - CSV formula injection escaping in `/api/export/daily-csv` and `/api/leads/import`.
   - DPDP Act 2023 compliance: used car registration masking (`UP32 ** **** 1234`), unmasked access restricted to authorized staff via audited security definer RPC `get_used_car_reg`.

2. **Role-Based Access Control Matrix (`docs/backend/ROLE_MATRIX.md`):**
   - Exhaustive RBAC authorization matrix covering all 23 Server Actions and 28 Route Handlers across 5 personas: Anon, Buyer, Sales Consultant, Manager, Admin, and Cron.
   - Enforces `requireRole()`, `requireCompleteProfile()`, and `requireUser()` with typed error responses and redirect guards.

3. **Observability & System Diagnostics:**
   - Lightweight public healthcheck endpoint `GET /api/health` performing cheap database connectivity ping, returning `{ status: "healthy", version: "2026.1", database: "connected" }`.
   - Admin System Health dashboard `/[locale]/(admin)/admin/system` displaying live metrics: outbox queue depth, dead letters, recent cron runs, SLA compliance breaches, CSV imports, and pending DPDP data requests.
   - Added "System Health" navigation item with `Activity` icon in `AdminSidebar.tsx`.

4. **Operations & Disaster Recovery Manual (`docs/backend/OPERATIONS.md`):**
   - Documented Supabase free tier limitations vs Pro tier requirements (\$25/mo) for automated 7-day backups and zero inactivity sleep.
   - Schema and seed backup automation scripts: `scripts/backup-schema.sh` and `scripts/backup-schema.bat`.
   - Disaster recovery restore rehearsal checklist from clean project provisioning to RLS verification.
   - Forward-fixing migration policy and multi-environment promotion workflow (DEV -> PROD).

5. **Automated Testing Suite (`docs/backend/TESTING.md`):**
   - 28 test suites covering 272 automated unit, integration, and security tests with 100% passing rate.
   - Production smoke test runner `scripts/smoke-test.mjs` and `npm run smoke` verifying 15 critical endpoints and APIs across English and Hindi in ~1.2s.
   - Multi-stage GitHub Actions CI workflow in `.github/workflows/ci.yml`.

6. **Production Release Checklist (`docs/backend/RELEASE.md`):**
   - Complete production release checklist with concrete evidence for all items: domain, HTTPS, Supabase keys, SMTP SPF/DKIM, Google OAuth consent, admin bootstrap, catalog data, price rules, slots, crons, robots/sitemap, legal texts, grievance contacts, and error pages.

### 9.2 Final Verification Status
- **TypeScript Typecheck:** `npx tsc --noEmit` passed with 0 errors.
- **ESLint:** `npm run lint` passed with 0 errors, 0 warnings.
- **Vitest Suite:** 28/28 test files passed, 272/272 tests passing (100%).
- **Production Build:** `npm run build` compiled all 121 static and dynamic routes with exit code 0.
- **Production Smoke Test:** `npm run smoke` passed 15/15 checks (100%).


---

## 10. Console consolidation and live verification (2026-11-07)

- **Screens:** consultant 2, manager 3, admin 3 (`docs/ROUTES.md`). Shared `DataGrid`, `ConsoleShell`, side panels. Old URLs redirect.
- **Wired and verified live:** lead status, timeline, AI summary/draft persistence, reply audit (`ai_logs`), CSV import with history, used-stock price/status/scorecard/intake, audited plate reveal, trade-ins with signed photos, models, variants, price rules, offers, banners, roles, invite, deactivate, routing rules, workshop bays (also resizes upcoming slots), slot calendar, live Overview metrics.
- **Bugs fixed on the way:** offers saved a non-existent column; banners failed with an empty link; price rules accepted a scope the database rejects; CSV import history wrote the wrong column; trade-in submit wrote non-existent columns; `saveUsedCarAction` overwrote the private plate, photos and score; `saveModelAction` wiped gallery and featured flag; admin pages fell back to the first record for an unknown id.
- **Known limits:** WhatsApp and SMS are simulated (outbox logs only); the AI summary and draft are templates, not a live model; phone calls are not tracked, so the unanswered-call rate cannot be measured (the Overview shows online service bookings); no admin create for showrooms, workshops or demo cars.
- **Verification:** `pnpm e2e:console` 42/42, `pnpm layout:console` clean, 554 unit tests.

---

## 11. Support chat with consultant handoff (2026-11-07)

- **Applied to DEV (vrooma-dev) on 2026-11-07 with the guarded `pnpm db:push`; NOT promoted to PROD.** `0029_chat_assigned_to_profiles.sql` is a forward fix found by the e2e run: `assigned_to` pointed at `auth.users`, which PostgREST cannot embed, so every chat request failed until it pointed at `profiles`.
- **Migration `0028_support_chat_handoff.sql`:** `chat_conversations` gains `status` (bot / waiting / live / resolved), `lead_id`, `assigned_to`, `guest_token`, `ai_context`, handoff and resolve timestamps; `chat_messages` allows `consultant` and `system` roles. Staff read policies (consultant: assigned chats; manager and admin: all); both tables join the `supabase_realtime` publication.
- **Buyer flow:** `/api/chat` (bot turns, "solved" / "connect" actions), `/api/chat/handoff` (name, mobile, DPDP consent for guests), `/api/chat/messages` (polling). Only the owner (signed-in user or guest token) can read a chat.
- **Handoff:** `src/server/services/chat-handoff.ts` records consent, creates the lead (source `chat`) via `create_lead`, links the chat, saves the AI brief on chat and lead, and posts a system message. Reassigning the lead moves the chat (`reassignLeadAction`).
- **Console:** `/staff/chats` (consultant 3 screens, manager 4). Replies go through `sendChatReplyAction`, which rejects discount words.
- **Known limits:** the bot is rule based (no live model); the buyer side polls every 4 s; the buyer is not notified by WhatsApp or SMS of a consultant reply.
- **Verification:** `pnpm e2e:console` now has a `chat` group (14 checks: bot closing question, no discount words, solved, guest consent and handoff, AI brief, guarded reply, live round trip, isolation between consultants, owner-only API, lead drawer link, reassign, close, signed-in handoff); whole suite 56/56. Unit tests in `tests/support-chat.test.ts`. `pnpm layout:console` includes the `chats` screen.

---

## 12. Full-stack completion pass, non-AI (2026-11-07)

Migrations `0030` to `0032` are applied to DEV (vrooma-dev) with the guarded `pnpm db:push`. **None of `0028`-`0032` is on PROD.**

- **Real catalog:** `/cars` and `/used-cars` are server components reading `listModels`, `listActiveOfferModelIds` and `listUsedCars`; the sample-stock fallback in `getUsedCarByStockId` and the mock imports are gone (`src/server/store.ts` stays as a test-only seam). List pages have metadata; the sitemap uses real `updated_at`; robots hides `/profile`, `/onboarding` and the auth pages.
- **Honest messaging:** `deliverMessage` (`src/server/services/message-providers.ts`) is the single place that knows the channels. Email goes through Resend with an HTML template (`email-template.ts`); WhatsApp and SMS have no provider and are stored as status `skipped` (migration `0030`), never `sent`. Without `RESEND_API_KEY` outside production, email is `skipped` too. A consultant chat reply emails the buyer at most once per 10 minutes per chat.
- **DMS hand-off:** `buildDailyCsv` (`dms-export.ts`) feeds both `GET /api/export/daily-csv` and the new `/api/cron/dms-export`, which stores `vrooma-dms-YYYY-MM-DD.csv` in the private `dms-exports` bucket (migration `0031`) every day at 00:15 IST. The System tab lists the job.
- **Scheduling:** unchanged design (pg_cron + Vault), now documented in `docs/backend/CRON_SETUP.md`. **On DEV only the 4 database jobs exist; the HTTP jobs (outbox, retention, deletions, DMS export) are not scheduled until the owner adds the Vault secrets and runs `select private.ensure_cron_jobs();`.**
- **Security:** shared database-backed rate limiter (`check_rate_limit`, migration `0032`; local fallback if the database call fails) replaces the per-instance maps on leads, newsletter, chat, chat handoff and trade-in; `guardOrigin` (CSRF) on cookie-authenticated and public write routes; trusted client IP everywhere; no raw `err.message` returned from API routes; CSP drops `unsafe-eval` in production builds; production env checks cover the publishable key, `RESEND_API_KEY`, `CRON_SECRET` and `TRUSTED_PROXY` (skipped in CI via `SKIP_ENV_VALIDATION=1`).
- **UI states:** error boundaries for admin, staff, auth and the public pages that lacked one, shared `ConsoleSkeleton`, and `global-error.tsx`.
- **Admin:** Showrooms & bays can now add showrooms, workshops and demo cars (create only; deactivation is deliberately not offered because leads and slots reference them).
- **CI hygiene:** `db:lint` is green (four already-applied migrations are allow-listed, new ones must have BEGIN/COMMIT) and now runs in CI.
- **Known limits / owner steps:** Vault secrets for the HTTP cron jobs; a real WhatsApp/SMS provider; account-deletion cancel (the account is deactivated and signed out at request time, so cancelling needs a verified-identity flow or an admin restore action, not built); PROD promotion of `0028`-`0032`; generated DB types (`src/types/db.ts`) are stale and are cast at three call sites; AI features remain rule/template based.
- **Verification:** 576 unit tests; `pnpm e2e:console` adds a `platform` group (11 checks: public pages, real catalog data, price gate, cross-site refusal, database rate limiter, newsletter round trip, outbox `skipped`, DMS export, admin network create, validation) next to the `chat` group; `pnpm db:lint` clean.

## 13. Remaining-items pass (2026-11-07)

Code complete; **migrations 0033 and 0034 are not yet applied to DEV or PROD** (owner runs `pnpm db:push`).

- **Account-deletion cancel:** `cancel_account_deletion()` (migration 0033) restores a buyer inside the 7-day window and marks the request `cancelled`. A deactivated buyer in the window keeps their session and is routed to `/restore-account` (middleware and `post-verify`); everyone else deactivated is still signed out with "account deactivated". `DELETE /api/me/delete` and `cancelAccountDeletionAction` do the same. Bookings released and leads closed at request time stay that way; marketing consent stays withdrawn.
- **Generated types:** `src/types/database.types.ts` is the single source (the hand-written `db.ts` and its drift test are gone). `@supabase/ssr` upgraded to 0.12.x so the clients type-check without the old `as unknown as SupabaseClient<Database>` casts.
- **Messaging:** WhatsApp (Meta Cloud API) and SMS (MSG91) adapters behind env vars; unchanged "skipped, never sent" behaviour without keys. Needs owner accounts (see `OPERATIONS.md` section 7).
- **Service calls:** `call_logs` + `get_call_metrics()` (migration 0034), `POST /api/webhooks/calls`, a staff log-call form and the unanswered-rate line on the admin Overview.
- **Tooling:** `pnpm check:cron` (lists missing scheduled jobs), `pnpm email:smoke`, `docs/backend/PROD_PROMOTION.md`.
- **Still owner-only:** PROD promotion of 0028-0034, Vault secrets for the HTTP cron jobs, Resend key and domain, WhatsApp and SMS accounts, telephony webhook. AI features remain rule/template based by decision.

