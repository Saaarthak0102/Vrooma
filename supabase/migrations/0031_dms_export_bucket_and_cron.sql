-- 0031_dms_export_bucket_and_cron.sql
-- Daily DMS hand-off: a private bucket that holds one CSV per IST day, and a nightly job that fills it.
-- The job uses the same Vault secrets (app_url, cron_secret) as the other HTTP jobs.

BEGIN;

-- Private bucket: only the service role writes; admins and managers read.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('dms-exports', 'dms-exports', false, 10485760, ARRAY['text/csv'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Managers and admins read DMS exports" ON storage.objects;
CREATE POLICY "Managers and admins read DMS exports" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'dms-exports' AND (private.is_manager() OR private.is_admin()));

-- Re-create the scheduler function with the extra job (the list of managed job names grows by one).
CREATE OR REPLACE FUNCTION private.ensure_cron_jobs()
RETURNS TEXT AS $f$
DECLARE
  v_has_secrets BOOLEAN := false;
  v_has_net BOOLEAN := false;
  v_msg TEXT := '';
  v_call TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron is not enabled; no jobs were created.';
    RETURN 'pg_cron missing';
  END IF;

  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN (
    'eval_lead_sla_breaches','daily_slot_generation','purge_expired_idempotency','purge_stale_rate_limits',
    'process_due_anonymisations','process_outbox_queue','daily_data_retention','daily_finalize_deletions',
    'daily_dms_export'
  );

  -- DB-only jobs.
  PERFORM cron.schedule('eval_lead_sla_breaches', '* * * * *', 'SELECT public.flag_sla_breaches();');
  PERFORM cron.schedule('daily_slot_generation', '30 20 * * *', 'SELECT public.generate_slots(CURRENT_DATE, 14);');
  PERFORM cron.schedule('purge_expired_idempotency', '30 21 * * *',
    'DELETE FROM public.idempotency_keys WHERE created_at < NOW() - INTERVAL ''24 hours'';');
  PERFORM cron.schedule('purge_stale_rate_limits', '45 21 * * *',
    'DELETE FROM public.rate_limits WHERE window_start < NOW() - INTERVAL ''2 days'';');
  v_msg := 'db jobs: sla, slots, idempotency purge, rate-limit purge';

  -- HTTP jobs need pg_net and both Vault secrets.
  BEGIN
    v_has_secrets := EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'app_url')
                 AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'cron_secret');
  EXCEPTION WHEN OTHERS THEN
    v_has_secrets := false;
  END;
  v_has_net := EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net');

  IF NOT v_has_secrets OR NOT v_has_net THEN
    RAISE NOTICE 'HTTP cron jobs (outbox, data-retention, finalize-deletions, dms-export) NOT created: vault secrets app_url/cron_secret present=%, pg_net installed=%. Add the secrets, then run: select private.ensure_cron_jobs();', v_has_secrets, v_has_net;
    RETURN v_msg || '; http jobs skipped (secrets present=' || v_has_secrets || ', pg_net=' || v_has_net || ')';
  END IF;

  v_call := $c$SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'app_url') || '%PATH%',
      headers := jsonb_build_object('Content-Type','application/json',
        'Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')),
      body := '{}'::jsonb, timeout_milliseconds := 20000);$c$;

  PERFORM cron.schedule('process_outbox_queue',     '* * * * *',   replace(v_call, '%PATH%', '/api/cron/outbox'));
  PERFORM cron.schedule('daily_data_retention',     '30 20 * * *', replace(v_call, '%PATH%', '/api/cron/data-retention'));
  PERFORM cron.schedule('daily_finalize_deletions', '30 21 * * *', replace(v_call, '%PATH%', '/api/cron/finalize-deletions'));
  -- 18:45 UTC = 00:15 IST: exports the IST day that just ended.
  PERFORM cron.schedule('daily_dms_export',         '45 18 * * *', replace(v_call, '%PATH%', '/api/cron/dms-export'));
  RETURN v_msg || '; http jobs: outbox, data-retention, finalize-deletions, dms-export';
END;
$f$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION private.ensure_cron_jobs() FROM PUBLIC, anon, authenticated;

SELECT private.ensure_cron_jobs();

COMMIT;
