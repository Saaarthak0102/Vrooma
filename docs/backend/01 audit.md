# PHASE 0: FRONTEND-TO-BACKEND AUDIT (documentation only, no code changes)

Goal: find out exactly what the backend and auth must provide, by reading the real code. Output: `docs/backend/AUDIT.md` (plus `docs/backend/STATUS.md` started). Do not change any source file in this phase.

## 1. Read
context.md, docs/BRIEF.md, docs/ROUTES.md, docs/DATA_MODEL.md, docs/GATING.md, docs/DPDP.md, docs/WIRING.md, supabase/migrations/*, supabase/seed.sql, src/types/*, src/data/mock/*, src/server/repositories/*, src/server/services/*, src/app/api/**, src/lib/validation/*, src/components/auth/*, src/components/forms/*, src/components/dashboard/* (especially ProfileForm), src/components/booking/*, src/components/staff/*, src/components/admin/*, every page under src/app.

## 2. Produce these sections in AUDIT.md

### 2.1 Screen inventory (one row per route, both locales are the same row)
route | who can open it (anon / any signed-in / consultant / manager / admin) | data READ (tables, fields, filters, sort, pagination) | data WRITTEN | auth needed | caching (static/ISR/dynamic, tags to revalidate) | loading/empty/error handled? | notes.
Include the in-place dashboard panel and the bottom sheet, the sign-in sheet, the chat widget, the newsletter form in the footer, and every API route stub.

### 2.2 Form inventory (every form and every button that writes)
form | file | fields (name, type, required, current validation) | consent checkbox present? | who is the actor | resulting rows | gating (AuthGate) | idempotency risk. Include: contact, enquiry, trade-in, test drive, service, newsletter, profile, data-rights/delete request, CSV import, every admin form, staff status/reassign/reply.

### 2.3 PROFILE AND SIGN-UP FIELDS (important)
The product owner added profile details that must be stored AND asked at sign-up. Read ProfileForm, the profile page, AuthProvider, the `Profile` type and the `profiles` table. List EVERY profile field currently in the UI and types, and compare it with the `profiles` table in the migrations. Output a table: field | in UI? | in type? | in DB? | proposed column | required at sign-up? | purpose | DPDP minimisation note (is it really needed?) | validation rule.
Baseline fields to expect: full name, mobile (India), city, preferred language, role, plus consents (terms/privacy, service communication, marketing). Anything beyond that (address, date of birth, gender, alternate phone, preferred showroom, vehicle owned...) must be justified by a feature; mark "optional, ask later" for anything not needed to book or answer an enquiry.
Also state: does a sign-up page exist? Is there an onboarding step? What does the sign-in sheet do today? (Expected: only a sign-in page and sheet with mock sessions. The sign-up and onboarding screens are built in Phase 1.)

### 2.4 Type and schema diff
For each domain type in src/types/domain.ts: matching table/columns in the migrations? Missing columns, wrong types, missing enums. Specifically check and report on these known risks: (a) `assignment_rules.consultant_ids uuid[]` has no foreign keys (propose a join table); (b) no consultant-to-showroom membership table; (c) `saved_items(target_type, target_id)` is polymorphic with no integrity (propose two nullable FKs with a check that exactly one is set); (d) booking and lead reference codes are derived from the id in the UI (`bookingRef`), propose real unique `ref` columns; (e) buyers see consultant names (Specialist / Assigned: name): propose a public view that exposes display name only; (f) `price_rules` has no protection against overlapping validity ranges; (g) `slots` capacity and booked counts; (h) money columns and phone formats; (i) timezone handling.

### 2.5 Mock leftovers
Grep for `USE_MOCK`, the in-memory store, localStorage sessions, the dev role switcher, `notWired`, hardcoded demo data in components, and every repository function's real-branch TODO. List them with file and line, and say what replaces each.

### 2.6 Personal-data inventory (DPDP)
Table: data item | where collected | purpose | lawful basis/consent purpose | who can see it | retention proposal | deletion behaviour. Include full registration numbers (used cars and the user's own vehicle at service booking), phone numbers, lead messages, trade-in photos.

### 2.7 Gaps and decisions
(1) Everything the frontend needs that has no table/endpoint yet. (2) Everything in the DB with no UI. (3) Anything in the frontend that would be a security hole once real (for example data fetched client-side that must be server-only, price breakup that the UI gates but an API would leak). (4) Public pages that call cookies() and would therefore break ISR. (5) The Next.js version (is the request interceptor `middleware.ts` or `proxy.ts`?), next-intl version and how its middleware is composed. (6) Open questions for the product owner, each with a recommended default.

### 2.8 Estimate
Rough size per phase (S/M/L) and the riskiest items.

## 3. Report
A short summary of AUDIT.md: counts of screens, forms and gaps; the profile field table; the five biggest risks; the questions that block Phase 1 (if none, say so).