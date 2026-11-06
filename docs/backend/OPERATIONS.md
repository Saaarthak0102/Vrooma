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

All background maintenance and communication pipelines are exposed via guarded Next.js route handlers requiring `Authorization: Bearer <CRON_SECRET>` headers. Both `GET` and `POST` methods are accepted to accommodate different cron providers.

| Route | Execution Frequency | Primary Trigger | Redundancy / Fallback | Purpose |
|---|---|---|---|---|
| `/api/cron/sla` | Every 1 minute (`* * * * *`) | Supabase `pg_cron` (`cron.job`) | Vercel Cron | Evaluates uncontacted web enquiries, triggers 5-min SLA warnings/breaches, and notifies lead managers. |
| `/api/cron/outbox` | Every 2 minutes (`*/2 * * * *`) | Supabase `pg_cron` (`cron.job`) | Vercel Cron | Dispatches queued customer transactional emails via Resend with exponential retry backoff. |
| `/api/cron/data-retention` | Daily at 02:00 IST (`30 20 * * *` UTC) | Supabase `pg_cron` (`cron.job`) | Vercel Cron / External Cron | Evaluates DPDP statutory data retention periods and anonymizes cold leads. |
| `/api/cron/finalize-deletions` | Daily at 03:00 IST (`30 21 * * *` UTC) | Supabase `pg_cron` (`cron.job`) | Vercel Cron / External Cron | Executes account erasure for user requests whose 7-day statutory cooling-off window has elapsed. |

### 6.1 Configuring pg_cron with Supabase Vault
To configure `pg_cron` jobs invoking Next.js cron endpoints securely over HTTPS:
1. Store `CRON_SECRET` and `APP_URL` in Supabase Vault:
   ```sql
   SELECT vault.create_secret('https://vrooma.in', 'app_url');
   SELECT vault.create_secret('<HIGH_ENTROPY_CRON_SECRET>', 'cron_secret');
   ```
2. Schedule jobs using `pg_net` with headers dynamically resolved from Vault:
   ```sql
   SELECT cron.schedule(
     'dispatch-outbox-every-2-minutes',
     '*/2 * * * *',
     $$
     SELECT net.http_post(
       url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'app_url') || '/api/cron/outbox',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
       )
     );
     $$
   );
   ```
   Secrets are never hardcoded in plaintext SQL migrations or git commits.

