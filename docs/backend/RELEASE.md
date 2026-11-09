# VROOMA — GO-LIVE CHECKLIST & MANUAL VERIFICATION

**Updated:** 2026-11-09. Two parts: (A) what must be true before real users arrive, (B) the manual walk-through you run on the deployed site. Use a normal window, an incognito window (second person) and your phone; keep the browser console (F12) open: any red error is a FAIL. Tick `[x]` when done.

## Part A — Go-live checklist (owner)

### 1. Domain and URLs
- [ ] Production domain set in Vercel; `NEXT_PUBLIC_SITE_URL` equals it (now `https://vroomacars.vercel.app`; a custom domain later).
- [ ] Supabase PROD, Authentication, URL Configuration: Site URL = the app URL; Redirect URLs `<url>/auth/confirm**` and `<url>/auth/callback**` (no other wildcards). Confirm-signup template pasted from `supabase/templates/confirmation.html` (`ROLE_MATRIX.md` section 6).

### 2. Database and environment
- [ ] Migrations `0001`-`0042` applied to PROD with the guarded runner (`ENVIRONMENTS.md`); dry run read first.
- [ ] Vercel env: Supabase URL/keys for PROD, `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `ALERT_EMAIL`, `APP_ENV=production`, AI vars (`AI_PROVIDER_API_KEY`, `AI_MAX_RPM=8`, `AI_DAILY_CALL_CAP=100`, `AI_TIMEOUT_FAST_MS=30000`). `ALLOW_DEV_LOGIN` absent. `pnpm check:env` clean.
- [ ] Vault secrets `app_url` and `cron_secret` added, `select private.ensure_cron_jobs();` run, `pnpm check:cron` shows all 10 jobs and heartbeats (`OPERATIONS.md` sections 6 and 8).
- [ ] Custom SMTP (Resend, verified domain with SPF/DKIM/DMARC) set in Supabase Auth; Google provider off.
- [ ] First admin created with `node --experimental-strip-types scripts/bootstrap-admin.ts <email>` (uses the Supabase variables of the shell it runs in; point it at PROD only from your own shell).
- [ ] Catalogue, city price rules (valid dates) and slots exist (the demo migration provides fictional ones; replace with real data before launch).

### 3. Demo mode (only if showing a demo)
- [ ] `DEMO_LOGIN=true` and `NEXT_PUBLIC_DEMO_LOGIN=true` set for the demo only (`PROD_DEMO.md`). Afterwards: unset both and run `supabase/remove-demo-data.sql` if real data will be loaded.

### 4. Legal, SEO, continuity
- [ ] Consent boxes unticked on every form; registration numbers masked; data export and deletion work; grievance contact on `/contact`.
- [ ] `/sitemap.xml` lists models and used cars; `/robots.txt` blocks `/dashboard`, `/staff`, `/admin`, `/api`; branded 404 and error pages.
- [ ] Backups: dashboard backup taken; decide on the Pro tier for PITR and no inactivity pause (`OPERATIONS.md` section 2). `/api/health` returns healthy.
- [ ] Keys that were shared in chat (Gemini key, database password) rotated.

## Part B — Manual verification (run on the deployed site)

### S. Setup sanity
| # | Step | Expected |
|---|---|---|
| S1 | `.env.local` Supabase URL contains the DEV ref (`eobtzcwinjmimzisypca`) and not the PROD ref | true |
| S2 | SQL: `select jobname, schedule, active from cron.job;` (target project) | 10 active jobs |
| S3 | Open every page type once with the console open | no console errors, no CSP blocks |

### A. Authentication
| # | Step | Expected |
|---|---|---|
| A1 | `/sign-up` with a new email | confirmation email with a link; clicking opens "Confirm my email"; then onboarding prefilled, consents unticked |
| A2 | Sign in with an existing email | 8-digit code arrives; wrong code gives a clear error; right code lands on your home |
| A3 | Resend code repeatedly / use a code after 10 minutes | button disabled about 60 s / "expired" message |
| A4 | Signed out, open `/book/test-drive`, then `/dashboard` | sign-in, then you return and continue / redirect to `/sign-in?next=/dashboard` |
| A5 | `/sign-in?next=//evil.com` | you end on your own dashboard, never another site |
| A6 | Buyer opens `/staff` and `/admin` | clear no-access page, no loop |
| A7 | Admin invites an email as consultant, later deactivates it | invite arrives and opens `/staff` only; deactivated user is rejected |
| A8 | Production: `/api/auth/dev-login` | 404 |
| A9 | Demo mode on: `/sign-in` shows one-click personas (buyer, consultant, manager, admin) | each opens its own console; with demo off the personas are hidden and `/api/auth/demo-login` is 404 |

### B. Public site (incognito)
| # | Step | Expected |
|---|---|---|
| B1 | Landing, `/cars`, a model | real models and prices; on-road number shows validity date and "prices may change" |
| B2 | Cars: filter, sort, reload | filters stay in the URL; clean empty state |
| B3 | Model signed out vs signed in | teaser only vs full breakup (road tax, registration, insurance, handling, accessories, TCS) |
| B4 | Used cars: view page source | only masked registration (`UP32 ** **** 1234`) |
| B5 | EMI calculator 10,00,000 at 9% for 60 months | about ₹20,758 a month |
| B6 | Contact form twice with the same phone in a day / 11 times a minute | one lead (repeat note) / "too many requests" |
| B7 | Newsletter without then with consent; unsubscribe link twice | blocked then success; no error |
| B8 | `/sitemap.xml`, `/robots.txt` | car pages listed; private areas disallowed |
| B9 | Chat widget: ask about EMI, a slot, and "give me a discount" | helpful answers; discount asks are declined; "connect me" creates a lead |

### C. Buyer
| # | Step | Expected |
|---|---|---|
| C1 | Book a test drive | confirmation reference; appears on the dashboard |
| C2 | Two browsers book the last slot at once; double-click confirm | exactly one booking |
| C3 | Overlapping booking, reschedule to a full slot, cancel twice | friendly error / old booking stays / harmless |
| C4 | Service booking with invalid then valid registration | invalid rejected; valid shown masked |
| C5 | After a booking, a lead exists with a named consultant and a 5-minute timer | yes |
| C6 | Trade-in with 6 photos; then a 7th, a 6 MB file, a renamed `.exe` | extras rejected; no valuation number shown to the buyer |
| C7 | Save two cars, unsave one; open dashboard panels and use Back | counts match; panels open in place |
| C8 | My cars: add a vehicle, tick reminders | saved; reminders opt-in recorded |
| C9 | Profile: edit phone in two tabs; download my data; delete account, then restore | second save warns; JSON has only your data; restore works |

### D. Staff
| # | Step | Expected |
|---|---|---|
| D1 | Consultant opens the Lead Desk | sees own leads only; a lead created by a buyer appears within seconds |
| D2 | Open a lead | AI briefing (or "Rule-based") and a draft reply; Next steps card proposes, never acts |
| D3 | Mark contacted | timer stops |
| D4 | Leave a lead 5+ minutes | marked breached; manager notified |
| D5 | Reassign | reason required; event logged |
| D6 | Reply containing "discount", "छूट", or "I can get you a better price" | blocked; "Our office opens at 9" and "कम समय में" are not |
| D7 | CSV import with a duplicate, a bad phone, a formula cell, then over 2,000 rows | row-level report; reimport adds nothing; oversize rejected |
| D8 | Another showroom's lead URL as a consultant | not found |
| D9 | Used stock: consultant vs manager | consultant 403; manager sees the price band and the AI note; registration reveal is audited |
| D10 | Bookings: mark attended and no-show | outcome saved; garage record created on attended |

### E. Admin
| # | Step | Expected |
|---|---|---|
| E1 | Add a model/variant with an image (huge and wrong-type files too) | good accepted, bad rejected |
| E2 | Overlapping price rule; an expired rule | rejected; public page says "Contact showroom" |
| E3 | Generate slots; closure date | no slots on closed days |
| E4 | Routing rule; role changes; demote yourself or the last admin | next lead follows the rule; demotion blocked |
| E5 | Audit log | price and role changes with who and when |
| E6 | Overview and System | metrics match leads created; every cron job shows a last run |
| E7 | AI activity: filters, usage meters, row drawer; "Draft vs sent" view | calls listed with result, latency, tokens; no phone or registration numbers shown |

### F. Jobs, email and AI
| # | Step | Expected |
|---|---|---|
| F1 | `select * from cron.job_run_details order by start_time desc limit 20;` | recent runs succeeded |
| F2 | Call an outbox cron route without then with the secret | 401 then 200 |
| F3 | Make a booking | confirmation email arrives in a real inbox (not for demo addresses) |
| F4 | Remove the Resend key (non-production) | messages marked failed or skipped, never "sent" |
| F5 | `NOTIFY_CHANNEL` unset | replies and reminders go by email |
| F6 | `/api/cron/digests` with the secret | digests queued; nobody with nothing to do is emailed |
| F7 | `pnpm ai:smoke` | at least one model answers; remove the key and every feature falls back to rule-based |

### G. Security
| # | Step | Expected |
|---|---|---|
| G1 | Search loaded files in DevTools for `sb_secret` | not found |
| G2 | Response headers | CSP, HSTS, X-Frame-Options, nosniff present |
| G3 | `pnpm probe` (API probe) | no table or function open that should be closed |

### H. Performance and devices
| # | Step | Expected |
|---|---|---|
| H1 | Lighthouse mobile on landing, cars, a model, used cars, a used car | LCP under 2.5 s on a 4G profile |
| H2 | Phone: landing, booking flow, dashboard | smooth; nothing overlaps or is cut off |
| H3 | 360 px width and 200% zoom | no horizontal overflow |

Send the FAIL rows back when done.
