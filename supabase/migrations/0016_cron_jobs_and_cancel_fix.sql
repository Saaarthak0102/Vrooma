-- 0016_cron_jobs_and_cancel_fix.sql
-- Fix cancel_booking pg_catalog.greatest syntax and configure Vault-guarded pg_cron scheduled jobs.

BEGIN;

-- 1. Fix cancel_booking RPC: replace invalid pg_catalog.greatest with standard GREATEST()
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.bookings AS $$
DECLARE
  v_booking public.bookings;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'VR007';
  END IF;

  -- Enforce authorization: must be authenticated and own the booking, or be authorized staff
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to cancel booking' USING ERRCODE = 'VR005';
  END IF;

  IF v_booking.user_id != auth.uid() AND NOT private.is_staff() THEN
    RAISE EXCEPTION 'Permission denied: Cannot cancel another customer appointment' USING ERRCODE = 'VR005';
  END IF;

  IF v_booking.status = 'cancelled' THEN
    RETURN v_booking; -- Idempotent no-op
  END IF;

  -- Release slot capacity
  UPDATE public.slots
  SET booked_count = GREATEST(0, booked_count - 1)
  WHERE id = v_booking.slot_id;

  UPDATE public.bookings
  SET status = 'cancelled',
      cancelled_at = pg_catalog.now(),
      cancel_reason = p_reason,
      updated_at = pg_catalog.now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.cancel_booking(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking(UUID, TEXT) TO authenticated, service_role;

-- 2. Configure Background Scheduler Jobs (pg_cron + pg_net + Supabase Vault)
DO $$
DECLARE
  v_has_vault_secrets BOOLEAN := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron extension not available; skipping cron job creation.';
    RETURN;
  END IF;

  -- Unschedule previous job definitions for clean idempotency
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN (
    'eval_lead_sla_breaches',
    'daily_slot_generation',
    'purge_expired_idempotency',
    'purge_stale_rate_limits',
    'process_due_anonymisations',
    'process_outbox_queue',
    'daily_data_retention',
    'daily_finalize_deletions'
  );

  -- Job A: 5-Minute Lead SLA Breaches Evaluator (Every minute directly in DB)
  PERFORM cron.schedule(
    'eval_lead_sla_breaches',
    '* * * * *',
    'SELECT public.flag_sla_breaches();'
  );

  -- Job B: 14-Day Rolling Capacity Slot Generation (Daily at 02:00 IST / 20:30 UTC)
  PERFORM cron.schedule(
    'daily_slot_generation',
    '30 20 * * *',
    'SELECT public.generate_slots(CURRENT_DATE, 14);'
  );

  -- Job C: Purge Expired Idempotency Keys (>24h) and Rate Limits (>48h) (Daily at 03:00 IST / 21:30 UTC)
  PERFORM cron.schedule(
    'purge_expired_idempotency',
    '30 21 * * *',
    'DELETE FROM public.idempotency_keys WHERE created_at < NOW() - INTERVAL ''24 hours''; DELETE FROM public.rate_limits WHERE window_start < NOW() - INTERVAL ''2 days'';'
  );

  -- Check if Supabase Vault exists and has required secrets (app_url, cron_secret)
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'vault' AND tablename = 'decrypted_secrets') THEN
      IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'app_url')
         AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'cron_secret') THEN
        v_has_vault_secrets := true;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_has_vault_secrets := false;
  END;

  -- Schedule HTTP endpoint calls via pg_net if Vault secrets exist
  IF v_has_vault_secrets AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    -- Job D: Outbox Email & Message Processing (Every minute)
    PERFORM cron.schedule(
      'process_outbox_queue',
      '* * * * *',
      $cron_call$
      SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'app_url') || '/api/cron/outbox',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
        )
      );
      $cron_call$
    );

    -- Job E: Statutory DPDP Data Retention Purge (Daily at 02:00 IST / 20:30 UTC)
    PERFORM cron.schedule(
      'daily_data_retention',
      '30 20 * * *',
      $cron_call$
      SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'app_url') || '/api/cron/data-retention',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
        )
      );
      $cron_call$
    );

    -- Job F: Finalise 7-Day Cooling Off Deletions (Daily at 03:00 IST / 21:30 UTC)
    PERFORM cron.schedule(
      'daily_finalize_deletions',
      '30 21 * * *',
      $cron_call$
      SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'app_url') || '/api/cron/finalize-deletions',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
        )
      );
      $cron_call$
    );

    RAISE NOTICE 'Successfully configured pg_cron HTTP jobs with Vault credentials.';
  ELSE
    RAISE NOTICE 'Vault secrets (app_url, cron_secret) not configured in vault.decrypted_secrets. Web-hook cron jobs not scheduled in pg_cron; relying on local dev runner or external cron until configured.';
  END IF;

END $$;

COMMIT;
