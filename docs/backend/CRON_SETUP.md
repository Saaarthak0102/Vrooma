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
3. Verify: open `/admin?tab=system`. Every job should show a last-run time. `select * from public.get_cron_status();`
   gives the same data.
4. Update a secret later with `select vault.update_secret(id, 'new value')` and re-run `ensure_cron_jobs()`.

## What each HTTP job does

- `/api/cron/outbox`: sends pending email through Resend (`RESEND_API_KEY`). WhatsApp and SMS rows are marked
  `skipped` (no provider connected), never `sent`.
- `/api/cron/dms-export`: writes `vrooma-dms-YYYY-MM-DD.csv` for the day that just ended into the private
  `dms-exports` Storage bucket. Managers and admins can download it from Storage, or on demand from
  `GET /api/export/daily-csv?date=YYYY-MM-DD` while signed in.
- `/api/cron/data-retention`, `/api/cron/finalize-deletions`: DPDP retention and the 7-day account-deletion queue.

Manual trigger for testing: `curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR-APP-DOMAIN/api/cron/outbox`
