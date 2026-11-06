# VROOMA BACKEND: OPERATIONS, BACKUP & RUNBOOK MANUAL

**Document:** `docs/backend/OPERATIONS.md`  
**Date:** 2026-11-05  
**Version:** 2026.1  
**Target Architecture:** Supabase Postgres + Next.js App Router  
**Status:** **ACTIVE / PRODUCTION OPERATIONAL**

---

## 1. Supabase Tier & Backup Architecture

### 1.1 Free Tier Limitations vs Production Paid Tier (Pro / Team)
The current development project (`eobtzcwinjmimzisypca`) operates on the **Supabase Free Tier**. The operational differences and risk profile for Company A (Lucknow) are outlined below:

| Feature / Capability | Supabase Free Tier (DEV) | Supabase Pro Tier (\$25/mo) (PROD Recommended) | Production Impact / Risk |
|---|---|---|---|
| **Daily Automated Backups** | None (manual scripts only) | 7-day retention automated daily backups | High risk on Free: database loss requires rebuild from seed. |
| **Point-in-Time Recovery (PITR)** | Not available | Optional add-on (\$100/mo, down to second-level) | Critical for disaster recovery and accidental mass-deletion rollback. |
| **Project Inactivity Pausing** | Auto-pauses after 7 days of inactivity | Never pauses; guaranteed 99.9% uptime SLA | Unacceptable for live dealership: site becomes non-responsive. |
| **Database Compute / Storage** | 500 MB storage, shared micro CPU | 8 GB included (auto-scaling), dedicated RAM | Free tier will exhaust storage within 6 months of lead/photo intake. |
| **Egress Bandwidth** | 2 GB / month | 250 GB / month included | High image traffic from car galleries will exceed Free tier rapidly. |
| **Log Retention** | 1 day | 7 days in dashboard + external log draining | Essential for DPDP audit compliance and security investigations. |

> [!CRITICAL]
> **Production Recommendation:** Company A must upgrade the production Supabase organization to the **Pro Tier (\$25/month)** prior to public cutover. The free tier must strictly remain an ephemeral development sandbox.

---

## 2. Backup Execution & Automated Tooling

Two platform backup scripts are provided in the repository root:
- Linux / macOS: [`scripts/backup-schema.sh`](file:///d:/Vrooma/scripts/backup-schema.sh)
- Windows: [`scripts/backup-schema.bat`](file:///d:/Vrooma/scripts/backup-schema.bat)

### 2.1 Generating a Schema & Seed Dump
```bash
# Set Supabase project or let default project execute
export SUPABASE_PROJECT_ID="eobtzcwinjmimzisypca"

# On Linux/macOS:
chmod +x scripts/backup-schema.sh
./scripts/backup-schema.sh

# On Windows:
scripts\backup-schema.bat
```
Dumps are timestamped and preserved in `supabase/backups/`:
- `schema_YYYYMMDD_HHMMSS.sql`: DDL for all 35 tables, custom schemas (`private`), constraints, triggers, and RLS policies.
- `roles_YYYYMMDD_HHMMSS.sql`: Database roles, anon/authenticated grants.
- `data_YYYYMMDD_HHMMSS.sql`: Complete catalog data, city price rules, showroom definitions, and active demo slots.

---

## 3. Disaster Recovery & Restore Rehearsal Checklist

When restoring a database from backup or spinning up a warm standby, follow this sequential runbook:

1. **Provision New Clean Project:**
   - Create a clean Supabase project in `ap-south-1` (AWS Mumbai, lowest latency to Uttar Pradesh).
2. **Apply Schema Migrations Sequentially:**
   ```bash
   node scripts/db-push.mjs
   ```
   Ensures migrations `0001` through `0014` are applied in exact deterministic order without drift.
3. **Restore Catalog & Seed Data:**
   ```bash
   psql "$PROD_DATABASE_URL" -f supabase/seed.sql
   ```
4. **Verify RLS Security Policies:**
   ```bash
   npm run rls:test
   ```
   Must pass 100% of the 35 table RLS assertions before public traffic is routed.
5. **Verify Database Storage Buckets & Policies:**
   - Confirm buckets `used-car-photos` and `vehicle-assets` exist with appropriate public/private ACLs (`supabase/migrations/0013_storage.sql`).
6. **Set Supabase Auth & Site URLs:**
   - Site URL: `https://vrooma.in`
   - Additional Redirect URLs:
     - `https://vrooma.in/auth/callback`
     - `https://vrooma.in/api/auth/callback`
7. **Verify Service Health:**
   - Execute `curl -i https://vrooma.in/api/health`
   - Expect `{ "status": "healthy", "database": "connected" }`.

---

## 4. Multi-Environment Segregation (DEV vs PROD)

| Environment Attribute | DEV Project | PROD Project |
|---|---|---|
| **Supabase Project Ref** | `eobtzcwinjmimzisypca` | Unique production ref (e.g. `vrooma-prod-xyz`) |
| **AWS Region** | `ap-south-1` (Mumbai) | `ap-south-1` (Mumbai) |
| **Site URL** | `http://localhost:3000` / Preview URLs | `https://vrooma.in` (Strict - no wildcards) |
| **SMTP Delivery** | Resend Test API Key / Sandbox domain | Resend Verified Domain (`mailer.vrooma.in`) with DKIM/SPF/DMARC |
| **Google OAuth Client** | Web App (Redirect: `http://localhost:3000/auth/callback`) | Production Client ID with Published Verified Consent Screen |
| **CRON_SECRET** | Random local string | 64-character high-entropy secret in Vercel & Supabase Vault |
| **Dev Bypass Login** | Allowed (`ALLOW_DEV_LOGIN=true`, `APP_ENV=development`) | **Strictly Forbidden** (`APP_ENV=production` forces 404 & build guard) |

### 4.1 Schema Migration Promotion Policy
1. All schema modifications MUST be written as forward migrations in `supabase/migrations/NNNN_name.sql`.
2. **Never modify or edit an applied migration.** Always author a new incremental migration file.
3. Run `npm run db:lint` to verify no breaking syntax or missing down-migrations.
4. Apply and test on DEV first via `node scripts/db-push.mjs`.
5. Run the full regression test suite (`npm run test`).
6. Once merged to `main`, apply to PROD using the deployment pipeline with `DATABASE_URL` pointing to the PROD database pooler (Port 6543 / 5432).

---

## 5. Operational Incident Runbook

### 5.1 Outbox Queue Congestion or Dead Letters
- **Symptom:** Customers report not receiving booking confirmations; admin dashboard shows dead letters $> 0$.
- **Inspection:** Open `/admin/system` or run:
  ```sql
  SELECT status, retry_count, last_error, count(*) 
  FROM public.messages_outbox 
  GROUP BY status, retry_count, last_error;
  ```
- **Remediation:**
  - Check Resend API status or rate limits.
  - Reset failed messages with valid payloads:
    ```sql
    UPDATE public.messages_outbox 
    SET status = 'pending', retry_count = 0 
    WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours';
    ```
  - Trigger manual flush:
    ```bash
    curl -X POST https://vrooma.in/api/cron/outbox -H "Authorization: Bearer $CRON_SECRET"
    ```

### 5.2 Lead Response SLA Breaches
- **Symptom:** Admin dashboard indicates $< 90\%$ SLA compliance.
- **Root Cause Analysis:**
  - Check if Hazratganj or Gomti Nagar showroom consultants are overwhelmed.
  - Review `sla_breached` count in `leads` table.
- **Remediation:**
  - Manager reassigns pending uncontacted leads via `/staff/leads` using the Reassign modal.
  - Review consultant working schedules and update active consultant pool in `assignment_rules`.

### 5.3 DPDP Personal Data Erasure Incident
- **Scenario:** Customer requests immediate deletion or reports data concern.
- **Procedure:**
  - Self-service: Direct user to `https://vrooma.in/dashboard/profile` or `/legal/data-rights` to trigger 7-day cooling-off erasure.
  - Expedited manual execution (Authorized DPO only):
    ```sql
    SELECT private.anonymise_user('<USER_UUID>');
    ```
  - Generates immutable entry in `public.audit_log` with timestamp, masking all PII.

---

## 6. Background Pipeline Scheduler Architecture

Source of truth: migration `0018_create_lead_actor_and_cron_jobs.sql`, which defines `private.ensure_cron_jobs()`. The function is idempotent (it unschedules and recreates the named jobs), so it is safe to re-run.

### 6.1 The seven jobs

| Job (`cron.job.jobname`) | Schedule (UTC) | What runs | Needs Vault secrets |
|---|---|---|---|
| `eval_lead_sla_breaches` | every minute | `SELECT public.flag_sla_breaches()` **in the database** | no |
| `process_outbox_queue` | every minute | `pg_net` POST to `/api/cron/outbox` | yes |
| `daily_data_retention` | 20:30 daily (02:00 IST) | `pg_net` POST to `/api/cron/data-retention` | yes |
| `daily_finalize_deletions` | 21:30 daily (03:00 IST) | `pg_net` POST to `/api/cron/finalize-deletions` | yes |
| `daily_slot_generation` | 20:30 daily | `SELECT public.generate_slots(CURRENT_DATE, 14)` | no |
| `purge_expired_idempotency` | 21:30 daily | delete idempotency keys older than 24 h | no |
| `purge_stale_rate_limits` | 21:45 daily | delete rate limits older than 2 days | no |

**SLA runs in one place only:** the `eval_lead_sla_breaches` pg_cron job. `flag_sla_breaches()` is idempotent (it only touches leads whose `sla_breached_at` is still NULL), so `/api/cron/sla` is kept purely as a manual / diagnostic trigger and is **not** scheduled anywhere in production. Do not add it to Vercel Cron.

All `/api/cron/*` routes require `Authorization: Bearer <CRON_SECRET>`. In production a missing `CRON_SECRET` makes them answer `503` (they never fall back to a default secret). In development, with no `CRON_SECRET` set, the documented local default is accepted so `pnpm dev` works.

### 6.2 Owner steps: add the Vault secrets (DEV, then PROD)

The three HTTP jobs are created only when **both** secrets exist. Until then the migration prints a NOTICE and the System page shows those jobs as "not scheduled (add Vault secrets)".

1. Pick the project: DEV is `eobtzcwinjmimzisypca`, PROD is `ajumkjokagqfdikfguti`. Never paste PROD values into a DEV project or the reverse.
2. Choose the values:
   - `app_url`: the public base URL of **that environment's** deployment, with no trailing slash. DEV needs a URL Supabase can reach, so use a Vercel Preview URL; **`http://localhost:3000` will not work** (see 6.3). PROD: `https://vrooma.in`.
   - `cron_secret`: a long random string (for example `openssl rand -hex 32`). It must be the **same value** as the `CRON_SECRET` environment variable of that deployment on Vercel.
3. Open Supabase Dashboard > the project > SQL Editor and run (replace the placeholders):
   ```sql
   select vault.create_secret('https://<your-deployment-host>', 'app_url');
   select vault.create_secret('<the-same-value-as-CRON_SECRET-on-Vercel>', 'cron_secret');
   select private.ensure_cron_jobs();   -- creates the three HTTP jobs
   ```
4. Verify:
   ```sql
   select jobname, schedule, active from cron.job order by jobname;           -- expect 7 rows
   select * from public.get_cron_status();                                    -- last run per job
   ```
   Then open **Admin > System Health**: every job should show a last-run time (the daily ones show "never" until their first run).
5. To rotate a secret: `select vault.update_secret(id, '<new value>') from vault.secrets where name = 'cron_secret';`, then update the Vercel env var to the same value. No SQL job needs editing, because jobs read the secret at run time.
6. Roll back / pause a job: `select cron.unschedule('process_outbox_queue');`. Re-running `private.ensure_cron_jobs()` recreates it.

### 6.3 Local development (Supabase cannot reach localhost)

Supabase's servers cannot call `http://localhost:3000`, so the HTTP jobs cannot drive a local server. Use the local runner instead:

```bash
# .env.local must contain the DEV CRON_SECRET (any random string; the dev server reads the same value)
pnpm dev        # terminal 1
pnpm dev:cron   # terminal 2: calls /api/cron/outbox and /api/cron/sla every 60 seconds
pnpm dev:cron --once   # single pass
```

`scripts/dev-cron.mjs` refuses to start when `APP_ENV`/`NODE_ENV` is production, when the target host is not `localhost` / `127.0.0.1` / `[::1]`, or when `CRON_SECRET` is missing. Because the pg_cron SLA job already runs in the DEV database, the runner's `/api/cron/sla` call is a harmless no-op duplicate of an idempotent function; it is included so SLA behaviour can still be exercised against a database without pg_cron.

### 6.4 Where to see that jobs ran

- **Admin > System Health** shows one line per job: last run time, or "not scheduled", or the failing status.
- SQL: `select * from public.get_cron_status();` (service role / SQL editor only).
- Raw history: `select * from cron.job_run_details order by start_time desc limit 20;`.
- HTTP jobs record only that the request was **sent**. `pg_net` responses are in `net._http_response`; a 401/503 there means the secrets do not match the app's `CRON_SECRET`.
