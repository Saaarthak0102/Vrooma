-- 0012_cron_jobs.sql
-- Phase 2 Database: Scheduled Background Jobs (SLA evaluation, slot generation, TTL purges)

BEGIN;

-- Create extension pg_cron if supported in environment
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "pg_cron";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron extension not available in this environment; skipping automated scheduler setup.';
END $$;

-- Scheduled Maintenance & Evaluation Jobs (executed only if pg_cron is enabled)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

    -- 1. Evaluate 5-Minute Lead SLA Breaches Every Minute
    PERFORM cron.schedule(
      'eval_lead_sla_breaches',
      '* * * * *',
      'SELECT public.flag_sla_breaches();'
    );

    -- 2. Generate 14-Day Rolling Capacity Slots Daily at 02:00 IST (20:30 UTC)
    PERFORM cron.schedule(
      'daily_slot_generation',
      '30 20 * * *',
      'SELECT public.generate_slots(CURRENT_DATE, 14);'
    );

    -- 3. Purge Expired Idempotency Keys (>24 hours) Daily at 03:00 IST (21:30 UTC)
    PERFORM cron.schedule(
      'purge_expired_idempotency',
      '30 21 * * *',
      'DELETE FROM public.idempotency_keys WHERE created_at < NOW() - INTERVAL ''24 hours'';'
    );

    -- 4. Purge Stale Rate Limits (>2 days) Daily
    PERFORM cron.schedule(
      'purge_stale_rate_limits',
      '0 0 * * *',
      'DELETE FROM public.rate_limits WHERE window_start < NOW() - INTERVAL ''2 days'';'
    );

    -- 5. Process Due Account Erasures Daily
    PERFORM cron.schedule(
      'process_due_anonymisations',
      '0 1 * * *',
      'SELECT private.anonymise_user(user_id) FROM public.data_requests WHERE kind = ''delete'' AND status = ''received'' AND due_at <= NOW();'
    );

  END IF;
END $$;

COMMIT;

