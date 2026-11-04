# PHASE 6: HARDENING, TESTS, OBSERVABILITY, PERFORMANCE, RELEASE

Prerequisite: Phases 1-5 accepted. Goal: make it safe to put real users on it. Treat this phase as a review by a skeptical senior engineer.

## 1. SECURITY REVIEW (write findings to docs/backend/SECURITY.md; fix everything fixable)
1. **Secrets:** `git grep` for `sb_secret_`, `service_role`, `eyJ`, `re_` (Resend) across the repo and history; the secret key appears only in server files that start with `import "server-only"`; the browser bundle contains no secret (inspect `.next/static` for the key prefix). Rotate any key that was ever committed.
2. **Admin client usage:** list every call site of the admin client and justify each; no user-controlled table names, column names or filters reach it.
3. **RLS re-check:** rerun `pnpm rls:test`; additionally try REST calls with the publishable key from outside the app for every table (anon and signed-in buyer) and record results. Run Supabase Advisors again; zero errors.
4. **Auth settings review (human, with the guide):** Site URL and redirect allow-list exact (no wildcards in production except preview hosts you explicitly accept), email templates correct, OTP length/expiry, rate limits, CAPTCHA decision recorded, "Confirm email" behaviour, Google consent screen published (not "Testing" with a test-user list) before real users.
5. **Web security headers** in `next.config`: `Content-Security-Policy` (report-only first, then enforce; allow your Supabase project URL, Google fonts if used, the image hosts you use, Turnstile if enabled), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation off unless used), `frame-ancestors 'none'` (clickjacking). Check that the Lenis/GSAP/inline styles still work under the policy (use nonces or hashes, not `unsafe-inline` for scripts).
6. **CSRF/origin:** cookie-authenticated mutating route handlers verify `Origin`/`Sec-Fetch-Site` and require `Content-Type: application/json`; server actions rely on the framework's origin check (verify it is on); cookies are `Secure`, `HttpOnly` where the SSR helper allows, `SameSite=Lax`.
7. **Input and output:** every route handler and action parses with zod and caps body size; no `dangerouslySetInnerHTML` with user text; admin-entered rich text (if any) is sanitised; file uploads validated by content; CSV exports escape formula cells; open-redirect tests on `next`, `redirectTo` and callback params; SSRF check (no server-side fetch of user-supplied URLs).
8. **Enumeration and abuse:** sign-in and unsubscribe responses do not reveal whether an email exists; per-IP and per-identity rate limits on OTP requests (Supabase), lead creation, newsletter, data requests, CSV import; consider Turnstile on public forms.
9. **Authorisation tests per role** (matrix file `docs/backend/ROLE_MATRIX.md`): for each server action and route handler list the allowed roles and the test that proves a lower role gets 401/403.
10. **PII review:** logs, error pages, analytics events and the AI logs table contain no raw phone numbers/emails; staff lists mask registration numbers; the staff UI shows only what the role needs.

## 2. TEST SUITE (keep it small, reliable and meaningful)
- Unit: price engine, EMI, phone, `safeNext`, masking, SLA, tag selectors, error mapping, CSV row validation.
- Integration against the DEV project (skipped without env; unique test prefixes; cleanup in `afterAll`): auth guards per role; RLS matrix; booking concurrency; lead assignment spread; SLA breach job; outbox retry/idempotency; consent immutability; deletion/anonymisation; CSV import limits.
- A smoke script `pnpm smoke` that hits the main public pages and APIs of a running build and checks status codes and key text in English and Hindi.
- Document how to run each suite and their runtime in docs/backend/TESTING.md. CI (GitHub Actions): typecheck, lint, unit tests, build on every push; integration tests on demand with secrets from the repository settings.

## 3. OBSERVABILITY AND OPERATIONS
- Structured JSON logs with a request id; log levels; error boundary pages that show a reference id; one error reporter (Sentry or similar) behind an env flag with PII scrubbing; health endpoint `/api/health` (checks DB reachability with a cheap query, returns no sensitive detail).
- Admin "System" screen: outbox queue depth and dead letters, last cron runs, SLA breaches today, failed imports, pending data requests. Alert path: dead letters and cron failures create a notification for admins.
- Backups and recovery: document what the current Supabase plan provides (free-tier projects have limited backup and can pause after inactivity; point-in-time recovery needs a paid plan), add `scripts/backup-schema.sh` (schema + seed dump) and a restore rehearsal checklist in docs/backend/OPERATIONS.md. Put the plan decision (upgrade before launch or accept risk) in the report for the client.
- Environments: DEV and PROD are separate Supabase projects with separate keys, Auth URLs, SMTP, Google OAuth clients and cron secrets; migrations are applied to PROD only through the guarded push script after DEV passes; document the promotion steps and a rollback note (forward-fix migrations, never edit applied ones).

## 4. PERFORMANCE
- Verify with the real data: `/` and catalog pages static/ISR (no dynamic opt-out); first-load JS unchanged from before the backend work (report); LCP and TBT targets from the brief on mobile (run a REAL Lighthouse mobile audit on `/`, `/cars`, `/used-cars`, a model page and a used-car page and report actual numbers).
- Database: run `EXPLAIN (ANALYZE)` on the five heaviest queries (catalog list with search, used-car list, lead inbox, slots by day, leak metrics) against a larger seed (generate 5,000 leads and 2,000 slots with a script) and confirm index use; add missing indexes; keep list endpoints bounded.
- Realtime: one channel per consultant view, unsubscribe on unmount, no subscriptions on public pages.
- Images: Supabase Storage public bucket behind `next/image` with the project host allow-listed; sensible sizes; no unbounded originals served directly.

## 5. RELEASE CHECKLIST (docs/backend/RELEASE.md, each item ticked with evidence)
Domain and HTTPS; PROD project created with its own keys; Site URL/redirects set; SMTP with SPF/DKIM verified and a deliverability test to Gmail/Outlook; Google OAuth consent screen published and prod redirect URI added; first admin bootstrapped; staff invited; seed replaced by real catalog data (no demo prices in PROD; any placeholder price rule removed or clearly labelled); price rules valid dates reviewed; slots generated; cron jobs present and secrets set in Vault; outbox sending verified end to end; sitemap and robots correct (`/dashboard`, `/staff`, `/admin`, `/api` disallowed); canonical/hreflang; privacy notice and terms texts approved by the client; grievance/contact details in the footer; analytics (if any) behind consent; 404/500 pages; `ALLOW_DEV_LOGIN` absent; dev users absent from PROD; backups decision recorded; support and incident contacts documented.

## 6. FINAL REPORT
Security findings table (severity, status), test results, Lighthouse numbers, query plans, what remains risky, the client decisions still open, and a go / no-go recommendation with reasons.