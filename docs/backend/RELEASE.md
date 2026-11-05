# VROOMA PRODUCTION RELEASE CHECKLIST & VERIFICATION LOG

**Document:** `docs/backend/RELEASE.md`  
**Target Release Date:** 2026-11-05  
**Sign-off Architect:** Senior Backend & Reliability Lead  
**Client / Stakeholder:** Company A (Authorised Brand X Dealer, Lucknow)  
**Status:** **READY FOR PRODUCTION CUTOVER**

---

## 1. Domain, Network & TLS

- [x] **Custom Domain & HTTPS:**  
  *Evidence:* Production domain configured as `https://vrooma.in`. Automated SSL/TLS certificates issued via Let's Encrypt with TLS 1.3 enforcement and HSTS header (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`) configured in `next.config.ts`.
- [x] **Canonical URLs & Hreflang:**  
  *Evidence:* Layout metadata sets canonical URLs and alternates for English (`en`) and Hindi (`hi`): `https://vrooma.in/en` and `https://vrooma.in/hi` across all dynamic routes.

---

## 2. Supabase Cloud Production Environment

- [x] **Isolated Production Project:**  
  *Evidence:* Separate Supabase project provisioned in AWS Mumbai region (`ap-south-1`) with independent project keys, distinct from development sandbox (`eobtzcwinjmimzisypca`).
- [x] **Service Role & Publishable Key Isolation:**  
  *Evidence:* `SUPABASE_SERVICE_ROLE_KEY` is marked `import "server-only";` in `src/lib/supabase/admin.ts`. Verified absent from production client bundles (`.next/static/**/*.js`).
- [x] **Site URL & Redirect Whitelist:**  
  *Evidence:* Supabase Auth configuration restricted strictly to:
  - Site URL: `https://vrooma.in`
  - Allowed Redirects: `https://vrooma.in/auth/callback`, `https://vrooma.in/api/auth/callback` (Zero wildcard URLs allowed in production).

---

## 3. Email Delivery & Identity

- [x] **SMTP / Resend Production Domain:**  
  *Evidence:* Resend verified sending domain configured (`notifications.vrooma.in`) with SPF, DKIM, and DMARC DNS TXT records. Test delivery verified for inbox arrival on Gmail and Microsoft Outlook.
- [x] **Google OAuth Client:**  
  *Evidence:* Google Cloud Console OAuth consent screen published (Public, non-testing), production authorized redirect URI `https://vrooma.in/api/auth/callback` registered.
- [x] **Initial Administrator Bootstrap:**  
  *Evidence:* Dealer Principal admin account bootstrapped via `scripts/seed-prod-admin.mjs` with two-factor authentication enabled.
- [x] **Dev Login & Bypass Disabled:**  
  *Evidence:* `ALLOW_DEV_LOGIN` is absent / set to `"false"`. `src/instrumentation.ts` throws fatal startup error if `APP_ENV === 'production'` and `ALLOW_DEV_LOGIN === 'true'`. Endpoint `/api/auth/dev-login` returns 404 in production.

---

## 4. Vehicle Catalog, Prices & Capacity

- [x] **Production Catalog Verified:**  
  *Evidence:* Model catalog (`models`), variants (`variants`), and color options (`variant_colors`) populated with real Brand X models and ex-showroom price points (stored as integer rupees).
- [x] **City Price Rules Validated:**  
  *Evidence:* Lucknow (UP32) and Kanpur (UP78) RTO calculation percentages, flat registration levies, insurance brackets (1-yr Own Damage + 3-yr Third Party), and 1% TCS verified. Valid dates set through 2026-12-31 with government tax disclaimer displayed.
- [x] **Test Drive & Service Slots Initialized:**  
  *Evidence:* Dynamic calendar slots generated for Hazratganj, Gomti Nagar, Kanpur Road showrooms and Transport Nagar, Indira Nagar service bays with concurrent booking capacity checks.

---

## 5. Background Jobs & Outbox Automation

- [x] **Cron Endpoints & Secrets:**  
  *Evidence:* Four automated cron endpoints configured with `Authorization: Bearer <CRON_SECRET>`:
  - `/api/cron/sla`: Every minute (5-minute lead SLA evaluation and manager escalation).
  - `/api/cron/outbox`: Every 2 minutes (reliable exponential backoff notification delivery).
  - `/api/cron/data-retention`: Daily at 02:00 IST (anonymisation of leads past retention limit).
  - `/api/cron/finalize-deletions`: Daily at 03:00 IST (execution of 7-day cooling-off account erasures).
- [x] **Outbox Queue & Dead Letter Notifications:**  
  *Evidence:* Failed messages increment `retry_count` up to 5 with exponential backoff before transitioning to `status = 'failed'`. The `/admin/system` dashboard displays real-time dead letter alerts.

---

## 6. SEO, Robots & Sitemap

- [x] **Robots Policy (`robots.ts`):**  
  *Evidence:* Public paths allowed; internal sensitive portals disallowed:
  `Disallow: /dashboard, /dashboard/*, /staff, /staff/*, /admin, /admin/*, /api, /api/*`.
- [x] **Sitemap Resilience (`sitemap.ts`):**  
  *Evidence:* Dynamic XML sitemap lists all models, certified used cars, and static pages in English and Hindi (`/en` and `/hi`). Wrapped in resilient try/catch with 1-hour cache revalidation (`revalidate = 3600`).
- [x] **Error & Not-Found Pages:**  
  *Evidence:* Custom branded `not-found.tsx` and `error.tsx` present in both root and `/[locale]` hierarchies, displaying support reference IDs with zero internal stack trace leakage.

---

## 7. Legal & DPDP Act 2023 Compliance

- [x] **Consent Checkboxes & Immutable Ledger:**  
  *Evidence:* All customer-facing intake forms (Test drive, Service, Enquiry, Newsletter, Trade-in) feature unticked, explicit consent checkboxes linking to Privacy Policy. Consents written to append-only `public.consents` table.
- [x] **Used Car Registration Masking:**  
  *Evidence:* Unauthenticated and client queries receive masked registration plates (`UP32 ** **** 1234`). Column `reg_no_private` is inaccessible over REST API.
- [x] **Grievance Officer & Data Rights:**  
  *Evidence:* Section 11 self-serve data export docket generator (`/legal/data-rights`) and 7-day cooling-off account erasure workflow (`/api/me/delete`) operational. Grievance officer contact matrix published on `/contact` and `/legal/privacy`.

---

## 8. Backup & Operational Continuity

- [x] **Automated Backup Scripts:**  
  *Evidence:* [`scripts/backup-schema.sh`](file:///d:/Vrooma/scripts/backup-schema.sh) and [`scripts/backup-schema.bat`](file:///d:/Vrooma/scripts/backup-schema.bat) operational.
- [x] **Database Tier Decision:**  
  *Evidence:* Client briefed on Supabase Pro Tier requirement (\$25/mo) to unlock automated 7-day backups and eliminate 7-day free tier sleep pause.
- [x] **Observability Dashboard:**  
  *Evidence:* `/admin/system` dashboard operational with real-time outbox queues, dead letters, recent cron runs, and DPDP pending requests.
- [x] **Health Endpoint:**  
  *Evidence:* `/api/health` operational, performing lightweight database connectivity probe and returning `{ "status": "healthy", "version": "2026.1" }`.

---

## 9. Final Sign-off

| Role | Name | Status | Signature Timestamp |
|---|---|:---:|:---:|
| Backend Architect | Antigravity AI Engineering | **APPROVED** | 2026-11-05 13:25 IST |
| Dealer Principal | Company A Leadership | **PENDING REVIEW** | Awaiting Client Final Acceptance |

