# Vrooma backend: how to run these phases

Put this folder at `docs/backend/` in the repo. For each phase tell the agent exactly:

> Read `docs/backend/00-README.md`, then execute `docs/backend/0X-<name>.md`. Stop at the end of the phase and send the report.

Run the phases IN ORDER. Do not start a phase until the previous report is clean and the human steps for it are done.

| Phase | File | Result |
|---|---|---|
| 0 | `01-audit.md` | Written audit of every screen, form and type (no code changes) |
| 1 | `02-auth.md` | Real sign-in, sign-up, onboarding, sessions, roles, guards |
| 2 | `03-schema.md` | Production schema, RLS, functions, cron, storage, seed |
| 3 | `04-data-layer-catalog.md` | Mock removed; catalog, pricing, admin CRUD for cars and prices on real data |
| 4 | `05-booking-leads.md` | Slots, test drives, service, leads, SLA, CSV import/export, outbox |
| 5 | `06-account-privacy.md` | Profile, saved, enquiries, trade-in, consent, data rights, newsletter |
| 6 | `07-hardening-release.md` | Security review, tests, observability, performance, release checklist |

AI features (lead copilot, chat assistant, used-car price band) and real WhatsApp/SMS are a LATER phase. Phases 1-6 only leave the tables and hooks they need.

## HUMAN STEPS
Whenever a phase needs a dashboard action (Supabase, Google Cloud, email provider), the agent must STOP, list the exact steps and wait for the user to confirm. Never invent keys, never commit secrets.

## Global conventions (apply to every phase)
1. **Keys.** Use the new Supabase keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (browser-safe), `SUPABASE_SECRET_KEY` (server only). The legacy anon/service_role keys are being retired; do not use them. Update `.env.example` and `src/lib/env.ts` (zod). The app must refuse to start in production if a required variable is missing.
2. **Four Supabase clients, no more.** (a) browser client; (b) server client with the cookie adapter, for anything user-specific; (c) PUBLIC client: anon, NO cookies, for ISR/cached catalog reads; (d) admin client with the secret key in a file that starts with `import "server-only"`, used only by a short allow-listed set of functions (list them in docs/backend/STATUS.md). Never import (d) from a client component.
3. **Auth checks on the server use `supabase.auth.getClaims()`**, never `getSession()` or the user object from cookies. Authorisation data (role, active flag) is read from the database, never from `user_metadata` (users can edit it).
4. **Caching safety.** ISR and cached pages must never read cookies or user data. Any response that sets an auth cookie must send `Cache-Control: private, no-store`. Never cache a response that contains user data.
5. **RLS everywhere, default deny.** Every table in `public` has RLS enabled. No `using (true)` except for deliberately public catalog reads. Every policy is tested.
6. **SECURITY DEFINER functions:** `set search_path = ''`, fully qualified names, `revoke execute ... from public`, grant only to the roles that need it. Helper functions live in a `private` schema that PostgREST does not expose.
7. **Migrations are the single source of truth** (`supabase/migrations`). The existing migrations were never applied, so they may be rewritten ONCE before the first push; after the first push never edit an applied migration, add a new one. Generate types with `pnpm db:types` into `src/types/db.ts`.
8. **Time and money.** All timestamps are `timestamptz`; display in Asia/Kolkata. Money is integer rupees. Phone numbers are stored as E.164 (`+91XXXXXXXXXX`).
9. **Errors.** One `AppError(code, httpStatus, message, fields?)`. Map Postgres errors (unique, check, FK, custom `RAISE` codes) to AppErrors; never return raw SQL errors or stack traces. Every API/action returns `{ ok: true, data } | { ok: false, error: { code, message, fields? } }`.
10. **Validation twice.** zod at the edge (server action / route handler) AND constraints in the database.
11. **Idempotency and double-submit.** Every create/booking/lead action accepts an idempotency key (client UUID per form mount) and the server stores it.
12. **No PII in logs.** Log request id, user id, action, error code. Never log emails, phones, OTPs or tokens.
13. **UI stays as designed.** New screens (sign-up, onboarding) must follow docs/DESIGN_SYSTEM.md and the shared Button component; no changes to the landing, listing cards or dashboard visuals. Everything must work at 360x740, 390x844, 768x1024, 1280x720, 1920x1080, touch, reduced motion, Hindi.
14. **Mock removal.** Mock data is allowed only as the source for `supabase/seed.sql` and in unit tests. By the end of Phase 3 there must be no in-memory store, no `NEXT_PUBLIC_USE_MOCK`, no localStorage sessions in production code paths.

## Definition of done for each phase
`pnpm typecheck && pnpm lint && pnpm test && pnpm build`, the phase's own checks, `docs/backend/STATUS.md` updated (what is done, what is deferred, open questions), no secrets in git (`git grep` for `sb_secret_`, `service_role`, `eyJ`), report sent.