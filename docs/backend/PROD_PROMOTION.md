# Promoting migrations 0028-0034 to PROD (owner runbook)

Everything below is **owner-only**. `scripts/db-push.mjs` deliberately refuses to touch PROD, and no agent should run
these steps without an explicit go from the owner.

| Migration | What it adds |
|---|---|
| 0028 | Support chat handoff (chat tables, handoff RPCs) |
| 0029 | Chat assignment points at `profiles` |
| 0030 | Outbox status `skipped` |
| 0031 | Private `dms-exports` bucket and DMS export cron support |
| 0032 | `check_rate_limit` RPC (database-backed rate limiter) |
| 0033 | `cancel_account_deletion()` and request status `cancelled` |
| 0034 | `call_logs` table and `get_call_metrics()` |

## Before you start
1. DEV is green: `pnpm typecheck`, `pnpm test`, `pnpm db:lint`, `pnpm e2e:console`.
2. Migrations 0033 and 0034 are applied on DEV: `pnpm db:push` (DEV only, guarded). Then `pnpm db:types` and commit
   `src/types/database.types.ts`.
3. Take a PROD backup (Supabase dashboard, Database, Backups; PITR if on a paid plan). See `OPERATIONS.md` section 2.

## Apply to PROD
1. Link the CLI to PROD: `supabase link --project-ref <PROD_REF>` (the PROD ref is `SUPABASE_PROD_REF`).
2. Dry run, read the list: `supabase db push --dry-run`. It must list exactly 0028 to 0034 and nothing else.
3. Apply: `supabase db push`.
4. Re-link the CLI to DEV afterwards so `pnpm db:push` guards keep working: `supabase link --project-ref eobtzcwinjmimzisypca`.

## Verify on PROD
- Run these against PROD in the SQL editor:
  - `select count(*) from public.call_logs;` (0 rows, no error)
  - `select proname from pg_proc where proname in ('cancel_account_deletion','get_call_metrics','check_rate_limit');` (3 rows)
  - `select unnest(enum_range(null::data_request_status));` includes `cancelled`
- Deploy the app version that matches the migrations, then open `/admin?tab=system` and confirm no red rows other than
  jobs you have not scheduled yet.
- Sign in as a test buyer, request deletion, confirm you land on **Restore my account**, restore, confirm `/dashboard` works.

## Rollback
Migrations are forward-only. If something is wrong, restore the backup from step 3, or write a new migration that
corrects it (never edit an applied migration). Both 0033 and 0034 only add objects, so the old app keeps working if you
roll the app back and leave the database as is.

## After promotion
Schedule the HTTP cron jobs on PROD (`CRON_SETUP.md`), then run `pnpm check:cron` with PROD credentials exported in the
shell (not in `.env.local`) to confirm all 8 jobs exist.
