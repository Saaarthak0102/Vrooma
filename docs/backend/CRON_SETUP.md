# Scheduled jobs: one-time setup (owner step)

Scheduling runs inside Supabase with `pg_cron`. Jobs that call the app over HTTP need two Vault secrets. Without them
only the database-only jobs exist, and **outbox email, data retention, account deletion and the daily DMS export never
run** (the Admin Overview, System tab, shows each missing job in red as "not scheduled").

| Job | Schedule (UTC) | Needs secrets |
|---|---|---|
| `eval_lead_sla_breaches`, `daily_slot_generation`, purges | every minute / daily | no |
| `process_outbox_queue` | every minute | yes |
| `daily_data_retention` | 20:30 | yes |
| `daily_finalize_deletions` | 21:30 | yes |
| `daily_dms_export` | 18:45 (= 00:15 IST) | yes |
| `process_automations` | every 5 minutes | yes (migration `0037`) |
| `daily_digests` | 03:00 UTC (= 08:30 IST) | yes (migration `0041`) |

## Steps (per Supabase project: DEV, then PROD)

1. Vercel (or your host) environment: set `CRON_SECRET` to a long random string. In production an unset `CRON_SECRET`
   makes every cron route return 503.
2. Supabase SQL editor (as the project owner):
   ```sql
   select vault.create_secret('https://YOUR-APP-DOMAIN', 'app_url');      -- no trailing slash
   select vault.create_secret('THE-SAME-CRON_SECRET-VALUE', 'cron_secret');
   select private.ensure_cron_jobs();
   ```
   `pg_cron` and `pg_net` must be enabled (Database, Extensions).
3. Verify: run `pnpm check:cron` (read-only; exits 1 and names any missing job), or open `/admin?tab=system`. Every job should show a last-run time. `select * from public.get_cron_status();`
   gives the same data.
4. Update a secret later with `select vault.update_secret(id, 'new value')` and re-run `ensure_cron_jobs()`.

## What each HTTP job does

- `/api/cron/outbox`: sends pending email through Resend (`RESEND_API_KEY`). WhatsApp and SMS rows are marked
  `skipped` (no provider connected), never `sent`.
- `/api/cron/automations`: queues (never sends) the date-driven messages, de-duplicated by outbox idempotency key:
  24 h and 3 h test-drive / service reminders (email + WhatsApp), "record the outcome" emails for bookings still
  `confirmed` an hour after their slot, escalations for a lead uncontacted after 15 minutes or a chat unanswered after
  10 minutes, and alerts for price rules / offers about to end and DPDP requests due within 5 days. Internal alerts go
  to `ALERT_EMAIL` (also substituted for the old `manager@vrooma.in` / `staff@vrooma.in` placeholders at send time).
- `/api/cron/dms-export`: writes `vrooma-dms-YYYY-MM-DD.csv` for the day that just ended into the private
  `dms-exports` Storage bucket. Managers and admins can download it from Storage, or on demand from
  `GET /api/export/daily-csv?date=YYYY-MM-DD` while signed in.
- `/api/cron/data-retention`, `/api/cron/finalize-deletions`: DPDP retention and the 7-day account-deletion queue.

Manual trigger for testing: `curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR-APP-DOMAIN/api/cron/outbox`


## Is the app actually receiving the HTTP jobs?

pg_cron marks an HTTP job `succeeded` as soon as pg_net has *sent* the request. The app can still answer 401 or 404 and
nothing runs. Since migration `0038` each call that reaches `/api/cron/outbox` or `/api/cron/automations` (after the
secret check) records a heartbeat in `cron_heartbeats`. The admin System page and `pnpm check:cron` report
"scheduled, but the app has never received it" when there is none.

If you see that, check in this order:

| What you see (`select created, status_code, left(content::text,200) from net._http_response order by created desc limit 20;`) | Cause | Fix |
|---|---|---|
| 401, short JSON | `CRON_SECRET` on the deployment differs from Vault `cron_secret` | Make them identical |
| 401/403 with an HTML page, or a redirect to Vercel login | Vercel deployment protection on Preview | Use an unprotected URL for the DEV `app_url` |
| 307/308/404 | `app_url` has a trailing slash or points at an old deployment | Exact public origin, no trailing slash |
| no rows | `pg_net` or the Vault secrets are missing | `select private.ensure_cron_jobs();` and read the notice |

## Outbox safety rules (all environments)

- Time-sensitive messages (acknowledgements, SLA and escalation alerts, reminders, outcome prompts) older than 24 hours
  are marked `skipped` ("stale") instead of being sent late. Confirmations, cancellations, data-rights notices and
  consultant replies are always sent.
- Outside production, `OUTBOX_ALLOWLIST` (addresses or `@domains`) restricts who can ever be contacted; other
  recipients are marked `skipped`. Production ignores it. Set it on DEV and Preview.
