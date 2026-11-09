# VROOMA BACKEND: SECURITY MODEL

**Document:** `docs/backend/SECURITY.md`  
**Updated:** 2026-11-09  

How the platform is protected today, with the original hardening findings (section 7) kept as the record of what was fixed. The role-by-role matrix is in `ROLE_MATRIX.md`; privacy is in `docs/DPDP.md`.

## 1. Layers at a glance

| Layer | Control |
|---|---|
| Database | RLS on every table; column privileges (`reg_no_private` not readable by public roles); RPCs run `SECURITY DEFINER` with explicit role checks; `tests/rls-matrix.test.ts` |
| Server | `requireRole` / `requireUser` in layouts, pages and actions; `server-only` on the admin client; `zod` validation on every input; origin check on mutating routes (`verifyRequestOrigin`) |
| Secrets | Service role key, `CRON_SECRET`, AI and mail keys only in server environment; the project guard (`src/lib/project-guard.ts`) refuses the wrong Supabase project; production credentials never in `.env.local` |
| Rate limits | Database-backed `check_rate_limit` per IP / user / action; AI calls also limited by `AI_MAX_RPM` and `AI_DAILY_CALL_CAP` |
| Cron and webhooks | Bearer `CRON_SECRET` (503 if unset in production), `CALLS_WEBHOOK_SECRET`; heartbeats prove delivery |
| Migrations | Guarded runner, fail-closed, hard-coded project refs (`ENVIRONMENTS.md`) |
| AI | Redacted prompts, discount and price-promise guard, grounding of every rupee figure, prompt-injection short-circuit, staff-only and manager-only features, no tool calls, audit log with 90-day retention (`docs/AI.md`) |
| Browser | CSP, HSTS, frame denial, nosniff, strict referrer and permissions policies (`next.config.ts`, section 4) |
| Output | `jsonLdString` escapes `<`, U+2028, U+2029; CSV export neutralises formula characters |

## Demo-mode risk (read before enabling)
`DEMO_LOGIN=true` lets anyone with the link sign in as any demo persona, including admin, with no passcode. It exists only for short, announced demos on a project that holds fictional data. Turn it off (and remove the demo data) before real customers arrive. `ALLOW_DEV_LOGIN` must never be set in production; `scripts/check-env.mjs` warns about both.

## 2. Secrets Scan & Key Segregation

### 2.1 Git Repository & History Scan
- **Command:** `git grep -i "sb_secret_"`, `git grep -i "service_role"`, `git grep -i "eyJ"`
- **Result:** **0 leaked secrets**.
- Secret keys appear strictly in non-tracked `.env.local`, dummy test strings in test suites, and documentation examples. No production or live project secret has ever been committed to git history (`git log -S "sb_secret_KUUdb" --oneline` -> 0 commits).

### 2.2 Client Bundle Inspection
- **Target:** Production build output directory `.next/static/**/*.js`.
- **Scan:** `Select-String -Path ".next/static/**/*.js" -Pattern "sb_secret_KUUdb"`
- **Result:** **0 matches**. The real service role secret key is completely absent from browser bundles.
- Only the public key `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is present in browser chunks, which is strictly designed and safe for client consumption.

### 2.3 Server-Only Isolation
- `src/lib/supabase/admin.ts` enforces `import "server-only";` at line 1, alongside runtime validation `if (typeof window !== "undefined") throw new Error(...)`.
- Any accidental import into a client component immediately aborts compilation during `next build`.

---

## 3. Administrative Client Usage & Justification

Every call site of `createAdminClient()` has been inventoried and verified against the principle of least privilege:

| Location | Purpose | Security Controls |
|---|---|---|
| `src/server/actions/admin-catalog.ts` | Model catalog, price rules, and showroom CMS | Protected by `requireRole(["manager", "admin"])`. |
| `src/server/actions/admin-leak.ts` | Dealer Principal ₹2.11 cr operational leak dashboard | Protected by `requireRole(["admin"])`. |
| `src/server/actions/booking.ts` | Atomic calendar slot locking & capacity decrements | Invokes security definer RPC `book_slot` which enforces serializable concurrency. |
| `src/server/actions/trade-in.ts` | Photo signing & trade-in intake | Generates short-lived signed upload URLs (5 MB limit, verified MIME); creates lead via RPC. |
| `src/server/actions/profile.ts` | DPDP erasure request & profile updates | Verifies user ownership via `requireUser()`; staff accounts blocked from self-deletion. |
| `src/server/actions/data-rights.ts` | DPDP Section 11 personal data docket generation | Verifies user ownership via `requireUser()`; sanitized JSON dump. |
| `src/app/api/newsletter/route.ts` | Newsletter subscription & double opt-in outbox | Public route; honeypot spam protection; sliding-window rate limiting; unticked consent required. |
| `src/app/api/cron/*` | Background outbox, SLA, retention, and deletion jobs | Protected by `Authorization: Bearer CRON_SECRET`. |
| `src/app/api/export/daily-csv/route.ts` | Dealership DMS daily export feed | Protected by `CRON_SECRET` or Dealership Admin/Manager session; formula injection sanitized. |

**Zero** user-supplied dynamic table names, column names, or raw SQL queries reach the admin client. All queries target static string table literals and validated Zod schemas.

---

## 4. Web Security Headers & Content Security Policy (CSP)

Configured in `next.config.ts`:

```typescript
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];
```

- **Clickjacking:** Hard-blocked via `X-Frame-Options: DENY` and `frame-ancestors 'none'`.
- **MIME Sniffing:** Blocked via `X-Content-Type-Options: nosniff`.
- **SSL Downgrade:** Prevented via HSTS with 2-year duration and preload.
- **Hardware API Leaks:** Camera, microphone, and geolocation permanently denied.

---

## 5. CSRF, Origin & Injection Protections

1. **Origin Verification (`src/lib/security.ts`):**
   - API endpoints verify `Sec-Fetch-Site` (rejecting `cross-site`) and cross-check `Origin` against request `Host`.
2. **Open Redirect Immunity (`src/server/auth/actions.ts`):**
   - `safeNext(rawNext)` enforces strict allow-lists. Any parameter starting with `//`, `/\`, `\\`, external schemes (`https:`, `javascript:`), or encoded bypasses (`%2F%2F`) defaults safely to `/dashboard` or `/`.
3. **CSV Formula Injection Sanitization (`src/app/api/export/daily-csv/route.ts`):**
   - In accordance with CWE-1236, all cells in exported CSVs starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are prefixed with an apostrophe (`'`), preventing Excel/Sheets remote code execution.
4. **Input Sanitization (`src/lib/security.ts`):**
   - User text inputs are stripped of HTML tags and `<script>` blocks via `sanitizePlainText`.
   - `dangerouslySetInnerHTML` is restricted exclusively to static JSON-LD Schema in `JsonLd.tsx`.

---

## 6. Personal Data Protection (DPDP Act 2023) Review

1. **Used Car Registration Masking:**
   - Public queries and unauthenticated listings return `reg_no_masked` (`UP32 ** **** 1234`).
   - The raw `reg_no_private` column has `REVOKE ALL ON COLUMN public.used_cars.reg_no_private FROM anon, authenticated`. Accessing raw registration numbers requires calling security definer RPC `get_used_car_reg`, restricted strictly to authorized staff.
2. **Immutable Consent Ledger:**
   - `public.consents` is append-only.
   - Revoking consent appends a row with `granted = false`.
   - Every consent record captures policy version (`2026.1`) and deterministic SHA-256 text hashes.
3. **Automated Cooling-Off & Erasure Finalization:**
   - Account deletion initiates a 7-day grace period.
   - Logging in during the 7 days cancels deletion.
   - After 7 days, `/api/cron/finalize-deletions` calls `private.anonymise_user(p_uid)` to permanently overwrite names, phone numbers, and vehicle details while retaining anonymized business aggregate counts.

---

## 7. Hardening findings (resolved)

| Finding ID | Component | Vulnerability / Check | Severity | Status | Mitigation Applied |
|:---:|---|---|:---:|:---:|---|
| **SEC-01** | `next.config.ts` | Missing Web Security Headers | High | **RESOLVED** | Added CSP, HSTS, X-Frame-Options, Permissions-Policy, nosniff. |
| **SEC-02** | `next.config.ts` | Wildcard image remotePattern | Medium | **RESOLVED** | Restricted `remotePatterns` to `*.supabase.co` and `images.unsplash.com`. |
| **SEC-03** | `src/lib/supabase/admin.ts` | Missing Next.js `server-only` | Medium | **RESOLVED** | Added `import "server-only";` preventing any client bundle bundling. |
| **SEC-04** | `src/lib/security.ts` | Cross-Site Origin & CSRF | Medium | **RESOLVED** | Added `verifyRequestOrigin` checking `sec-fetch-site` and `origin`. |
| **SEC-05** | `src/server/actions/trade-in.ts` | Unbounded Photo Uploads | Medium | **RESOLVED** | Enforced 6 photos max, <= 5 MB each, MIME whitelist (JPEG, PNG, WebP). |
| **SEC-06** | `src/app/api/newsletter` | Email Enumeration | Low | **RESOLVED** | Generic success messages returned on existing/duplicate subscriptions. |
| **SEC-07** | `src/server/privacy/consent.ts` | Unsubscribe Token Forgery | High | **RESOLVED** | Implemented HMAC-SHA256 signature verification on tokens. |
| **SEC-08** | `/api/export/daily-csv` | CSV Formula Injection | High | **RESOLVED** | Single-quote escaping on all formula characters (`=`, `+`, `-`, `@`). |
