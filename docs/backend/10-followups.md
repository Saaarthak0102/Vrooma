# FOLLOW-UPS AFTER THE AUDIT-FLAGS REPORT

Rules: DEV project only (`eobtzcwinjmimzisypca`). No visual changes. Every fix gets a regression test. Append results to `docs/backend/VERIFY_REPORT.md`.

## 1. Prove the buyer, staff and admin flows still work after migration 0014
Migration `0014_rpc_privilege_hardening` revoked direct execution of several functions. For each revoked function (`resolve_price_rule`, `create_lead`, `book_slot`, `get_used_car_reg`, and any other that was revoked), document: which code path calls it now, and with which client (user session or admin client). Where the admin client is used, the app code must (a) check the user and role first, (b) pass the acting user id explicitly, and (c) the SQL function must not trust a caller-supplied user id unless the caller is the service role. Then write ONE end-to-end integration test per flow using real dev users:
- signed-out visitor: model page teaser works; full breakup NOT returned;
- signed-in buyer: full breakup works; test-drive booking creates a booking with the buyer's id and a lead assigned to a consultant; cancel and reschedule work;
- anonymous contact form: lead created through the route handler only;
- consultant: reveal of a used car's registration number works and is audit-logged; a buyer calling it is refused;
- two buyers cannot book or cancel for each other (try passing the other user's id).
Report any flow that broke and fix it.

## 2. Create the scheduled jobs, not just the documentation
List `cron.job`. Make sure there is a job for each of: SLA check (one place only), outbox processing (every minute), data retention (daily), finalisation of deletion requests (daily), slot generation (daily), purge of idempotency keys and rate limits (daily). Jobs that need the app (outbox, data-retention, finalize-deletions) call the route with the secret via `pg_net`, reading the app URL and secret from Supabase Vault. Write the SQL in a new migration that creates the jobs only if the Vault secrets exist (otherwise it raises a clear notice and does nothing). Give the owner exact steps to add the Vault secrets (`app_url`, `cron_secret`) for DEV and PROD.
Important: Supabase's servers cannot reach `http://localhost:3000`. For local development add `scripts/dev-cron.mjs` and `pnpm dev:cron`: a loop that calls `/api/cron/outbox` and `/api/cron/sla` on localhost every 60 seconds with the DEV `CRON_SECRET`; it refuses to run unless `APP_ENV` is not production and the URL is localhost. Document both paths in `docs/backend/OPERATIONS.md` and add a "last run" line per job to the admin System page if it is missing.

## 3. Trusted client IP must depend on the host
Replace the fixed header priority in `src/lib/network.ts` with a setting `TRUSTED_PROXY` (`vercel` | `cloudflare` | `none`), default `none` locally. `vercel`: use only `x-vercel-forwarded-for` (and the platform's own forwarded value); `cloudflare`: use only `cf-connecting-ip`; `none`: ignore all forwarded headers and use the socket address (or a fixed "unknown" bucket that is rate-limited globally). A client-sent `cf-connecting-ip` or `x-forwarded-for` must never be trusted unless the matching proxy setting is on. Add the variable to `.env.example` and `docs/backend/ENVIRONMENTS.md` (`vercel` on the Vercel production and preview scopes). Tests: spoofed `cf-connecting-ip` ignored under `vercel`; spoofed `x-vercel-forwarded-for` can't beat the platform value (document the assumption); each mode picks the right header.

## 4. Discount filter: show the rules
Print the exact patterns used (English and Hindi) in `docs/backend/ROLE_MATRIX.md` or a new `docs/backend/DISCOUNT_RULES.md`, and add a table of at least 30 test sentences with the expected result (blocked or allowed), including: "कम कीमत में" (blocked), "कम दाम" (blocked), "कम समय में" (allowed), "कम से कम दो दिन" (allowed), "10% off" (blocked), "Our office opens at 9" (allowed), "special offer on accessories" (decide and document: allowed, since the rule is about quoting discounts; flag for the owner), "छूट मिलेगी" (blocked), "डिस्काउंट" (blocked). Make sure the UI warning and the server action use the exact same function.

## 5. Extend the console check to signed-in screens
Extend `scripts/console-check.mjs` (DEV only) to sign in with the dev users (buyer, consultant, manager, admin) and visit: dashboard (including `?view=` panels), profile, test-drive and service booking, trade-in, staff leads and lead detail, staff bookings, admin pages (models, prices, used cars, slots, users, system). Also open the sign-in sheet and the chat widget. Print console errors, page errors, failed requests and CSP violations per URL. Report the CSP mode and whether `script-src` allows `'unsafe-inline'` (it should use a nonce or hashes). Google sign-in cannot be automated; list it as a manual step.

## 6. Honest status of the unfinished items
In `VERIFY_REPORT.md` add a table: Lighthouse mobile numbers per page (run them for real or write "not run"), EXPLAIN plans on a large generated dataset (run or "not run"), auth edge cases from `02-auth.md` section 2.7 (tested / manual only / not done), email delivery to a real inbox (owner step), PROD database check (owner step).

## 7. Report
For each item: what changed, evidence, and what still needs the owner (Vault secrets, domain, Google OAuth for prod, plan upgrade).
