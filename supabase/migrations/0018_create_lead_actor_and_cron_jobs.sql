-- 0018_create_lead_actor_and_cron_jobs.sql
-- Follow-up items 1 and 2.
--  (1) create_lead gains an explicit p_user_id so trusted server code (service role) can attribute a
--      lead to the already-authenticated buyer. The id is IGNORED for every non-service role, so a
--      browser session can never attribute a lead to someone else.
--  (2) Create ALL scheduled jobs through one idempotent function, private.ensure_cron_jobs().
--      HTTP jobs (outbox, data-retention, finalize-deletions) are created only when the Vault secrets
--      app_url and cron_secret exist; otherwise a clear NOTICE is raised and nothing is scheduled.
--      After adding the Vault secrets the owner runs:  select private.ensure_cron_jobs();

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. create_lead with explicit acting user (service role only)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_lead(TEXT, TEXT, UUID, UUID, UUID, TEXT, TEXT, public.lead_source_type, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.create_lead(
  p_name TEXT,
  p_phone TEXT,
  p_showroom_id UUID,
  p_model_id UUID DEFAULT NULL,
  p_used_car_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_source public.lead_source_type DEFAULT 'web',
  p_source_ref TEXT DEFAULT NULL,
  p_consent_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS public.leads AS $$
DECLARE
  v_existing public.leads;
  v_new_lead public.leads;
  v_assigned_consultant UUID := NULL;
  v_sla_due TIMESTAMPTZ := pg_catalog.now() + INTERVAL '5 minutes';
  v_ref TEXT;
  v_actor UUID;
BEGIN
  -- Acting user: the JWT subject. A caller-supplied p_user_id is honoured ONLY for the service role
  -- (trusted server code that has already authenticated the user); for every other role it is ignored.
  IF (SELECT auth.role()) = 'service_role' THEN
    v_actor := COALESCE(p_user_id, auth.uid());
  ELSE
    v_actor := auth.uid();
  END IF;

  -- Deduplication check: Open lead for same phone & model within 24 hours
  IF p_model_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.leads
    WHERE phone = p_phone
      AND model_id = p_model_id
      AND status NOT IN ('won', 'lost')
      AND (created_at AT TIME ZONE 'UTC')::date >= ((pg_catalog.now() AT TIME ZONE 'UTC')::date - 1)
      AND created_at >= pg_catalog.now() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
      -- Append repeat enquiry event and bump updated_at
      INSERT INTO public.lead_events (lead_id, type, payload, actor_id)
      VALUES (v_existing.id, 'repeat_enquiry', jsonb_build_object('message', p_message, 'source', p_source), v_actor);

      UPDATE public.leads SET updated_at = pg_catalog.now() WHERE id = v_existing.id;
      RETURN v_existing;
    END IF;
  END IF;

  -- Select the least-loaded active, available consultant.
  -- Tier 0 = rules for this exact model or catch-all rules (the original pool).
  -- Tier 1 = any other active rule of the showroom. Without it, an enquiry with NO model (the generic
  -- contact form, every booking-attached lead, trade-ins) at a showroom whose rules are all model-specific
  -- matched nothing and was left unassigned, breaking "every enquiry reaches a named consultant".
  SELECT c.consultant_id INTO v_assigned_consultant
  FROM public.assignment_rules r
  JOIN public.assignment_rule_consultants c ON r.id = c.rule_id
  JOIN public.profiles p ON c.consultant_id = p.id
  JOIN public.staff_showrooms ss ON ss.profile_id = p.id AND ss.showroom_id = p_showroom_id
  LEFT JOIN public.consultant_availability a ON a.profile_id = p.id
  LEFT JOIN (
    SELECT assigned_to, count(*) AS active_load
    FROM public.leads
    WHERE status IN ('new', 'contacted', 'test_drive_booked', 'negotiating')
    GROUP BY assigned_to
  ) loads ON loads.assigned_to = c.consultant_id
  WHERE r.showroom_id = p_showroom_id
    AND r.is_active = true
    AND p.is_active = true
    AND (a.is_available IS NULL OR (a.is_available = true AND (a.until IS NULL OR a.until > pg_catalog.now())))
  ORDER BY
    CASE WHEN r.model_id IS NULL OR r.model_id = p_model_id THEN 0 ELSE 1 END ASC,
    COALESCE(loads.active_load, 0) ASC,
    p.created_at ASC
  LIMIT 1
  FOR UPDATE OF c SKIP LOCKED;

  v_ref := private.generate_ref('LD-');

  INSERT INTO public.leads (
    ref, source, source_ref, user_id, name, phone, email, showroom_id,
    model_id, used_car_id, message, status, assigned_to, assigned_at,
    sla_due_at, consent_id
  )
  VALUES (
    v_ref, p_source, p_source_ref, v_actor, p_name, p_phone, p_email, p_showroom_id,
    p_model_id, p_used_car_id, p_message, 'new', v_assigned_consultant,
    CASE WHEN v_assigned_consultant IS NOT NULL THEN pg_catalog.now() ELSE NULL END,
    v_sla_due, p_consent_id
  )
  RETURNING * INTO v_new_lead;

  -- Create initial event & notifications
  IF v_assigned_consultant IS NULL THEN
    INSERT INTO public.lead_events (lead_id, type, payload, actor_id)
    VALUES (
      v_new_lead.id,
      'created',
      jsonb_build_object('source', p_source, 'status', 'unassigned'),
      v_actor
    );

    -- Alert Showroom Manager about unassigned lead
    INSERT INTO public.messages_outbox (
      channel, to_address, template, body, lead_id, idempotency_key
    )
    VALUES (
      'email',
      'manager@vrooma.in',
      'unassigned_lead_alert',
      'ALERT: New unassigned lead received without available consultant: ' || v_ref,
      v_new_lead.id,
      'outbox_' || v_new_lead.id::text || '_unassigned'
    );
  ELSE
    INSERT INTO public.lead_events (lead_id, type, payload, actor_id)
    VALUES (
      v_new_lead.id,
      'created',
      jsonb_build_object('source', p_source, 'assigned_to', v_assigned_consultant),
      v_actor
    );
  END IF;

  -- Queue automated buyer acknowledgement message
  INSERT INTO public.messages_outbox (
    channel, to_address, template, body, lead_id, idempotency_key
  )
  VALUES (
    'whatsapp',
    p_phone,
    'lead_acknowledgement',
    'Namaste ' || p_name || '! Thank you for your interest in Vrooma. Our dedicated consultant will reach out to you within 5 minutes.',
    v_new_lead.id,
    'outbox_' || v_new_lead.id::text || '_ack'
  );

  RETURN v_new_lead;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.create_lead(TEXT, TEXT, UUID, UUID, UUID, TEXT, TEXT, public.lead_source_type, TEXT, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_lead(TEXT, TEXT, UUID, UUID, UUID, TEXT, TEXT, public.lead_source_type, TEXT, UUID, UUID) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1b. Lead RPCs: a consultant may only act on a lead assigned to them.
--     Before this, set_lead_status / reassign_lead checked only "is staff", so any consultant could
--     change or re-route any other consultant's (or showroom's) lead by calling the RPC directly.
--     Managers and admins keep full access. Re-assignment targets must be active staff of the lead's
--     showroom, except for admins.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_lead_status(
  p_lead_id UUID,
  p_status public.lead_status_type,
  p_lost_reason TEXT DEFAULT NULL
)
RETURNS public.leads AS $$
DECLARE
  v_lead public.leads;
  v_now TIMESTAMPTZ := pg_catalog.now();
BEGIN
  IF NOT private.is_staff() THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = 'VR005';
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found' USING ERRCODE = 'VR007';
  END IF;

  IF private.current_role() = 'consultant' AND v_lead.assigned_to IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Permission denied: lead is not assigned to you' USING ERRCODE = 'VR005';
  END IF;

  UPDATE public.leads
  SET
    status = p_status,
    lost_reason = CASE WHEN p_status = 'lost' THEN p_lost_reason ELSE lost_reason END,
    first_contacted_at = CASE WHEN first_contacted_at IS NULL AND p_status != 'new' THEN v_now ELSE first_contacted_at END,
    status_changed_at = v_now,
    updated_at = v_now
  WHERE id = p_lead_id
  RETURNING * INTO v_lead;

  INSERT INTO public.lead_events (lead_id, type, payload, actor_id)
  VALUES (
    p_lead_id,
    'status_changed',
    jsonb_build_object('status', p_status, 'first_contact', v_lead.first_contacted_at),
    auth.uid()
  );

  RETURN v_lead;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.set_lead_status(UUID, public.lead_status_type, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_lead_status(UUID, public.lead_status_type, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reassign_lead(
  p_lead_id UUID,
  p_to_consultant_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.leads AS $$
DECLARE
  v_lead public.leads;
  v_old_assigned UUID;
BEGIN
  IF NOT private.is_staff() THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = 'VR005';
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found' USING ERRCODE = 'VR007';
  END IF;

  IF private.current_role() = 'consultant' AND v_lead.assigned_to IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Permission denied: lead is not assigned to you' USING ERRCODE = 'VR005';
  END IF;

  -- Target must be an active consultant/manager; outside admin, also a member of the lead's showroom
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_to_consultant_id
      AND p.is_active = true
      AND p.deleted_at IS NULL
      AND p.role IN ('consultant', 'manager')
      AND (
        private.current_role() = 'admin'
        OR EXISTS (
          SELECT 1 FROM public.staff_showrooms ss
          WHERE ss.profile_id = p.id AND ss.showroom_id = v_lead.showroom_id
        )
      )
  ) THEN
    RAISE EXCEPTION 'Invalid re-assignment target for this showroom' USING ERRCODE = 'VR002';
  END IF;

  v_old_assigned := v_lead.assigned_to;

  UPDATE public.leads
  SET assigned_to = p_to_consultant_id,
      assigned_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  WHERE id = p_lead_id
  RETURNING * INTO v_lead;

  INSERT INTO public.lead_events (lead_id, type, payload, actor_id)
  VALUES (
    p_lead_id,
    'reassigned',
    jsonb_build_object('from', v_old_assigned, 'to', p_to_consultant_id, 'reason', p_reason),
    auth.uid()
  );

  RETURN v_lead;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.reassign_lead(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reassign_lead(UUID, UUID, TEXT) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1c. anonymise_user was only defined in the `private` schema, which PostgREST does not expose, so
--     /api/cron/finalize-deletions (admin.rpc("anonymise_user")) failed for every real erasure request.
--     Expose a service-role-only public wrapper.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.anonymise_user(p_uid UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM private.anonymise_user(p_uid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.anonymise_user(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymise_user(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Scheduled jobs
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

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
    'process_due_anonymisations','process_outbox_queue','daily_data_retention','daily_finalize_deletions'
  );

  -- DB-only jobs.
  -- SLA: this is the ONLY scheduler for SLA breaches (/api/cron/sla is a manual, idempotent trigger).
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
    RAISE NOTICE 'HTTP cron jobs (outbox, data-retention, finalize-deletions) NOT created: vault secrets app_url/cron_secret present=%, pg_net installed=%. Add the secrets, then run: select private.ensure_cron_jobs();', v_has_secrets, v_has_net;
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
  RETURN v_msg || '; http jobs: outbox, data-retention, finalize-deletions';
END;
$f$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION private.ensure_cron_jobs() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. messages_outbox bookkeeping columns.
--    /api/cron/outbox has always written updated_at; the column did not exist, so its optimistic
--    "claim" update failed for every row and the worker silently sent nothing.
-- ---------------------------------------------------------------------------
ALTER TABLE public.messages_outbox
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 4. Read-only job status for the admin System page (service role only).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cron_status()
RETURNS TABLE (
  jobname TEXT,
  schedule TEXT,
  active BOOLEAN,
  last_run_at TIMESTAMPTZ,
  last_status TEXT,
  last_message TEXT
) AS $f$
  SELECT j.jobname::text, j.schedule::text, j.active, d.start_time, d.status::text, pg_catalog.left(d.return_message, 200)
  FROM cron.job j
  LEFT JOIN LATERAL (
    SELECT r.start_time, r.status, r.return_message
    FROM cron.job_run_details r
    WHERE r.jobid = j.jobid
    ORDER BY r.start_time DESC
    LIMIT 1
  ) d ON true
  ORDER BY j.jobname;
$f$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.get_cron_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_status() TO service_role;

SELECT private.ensure_cron_jobs();

COMMIT;
