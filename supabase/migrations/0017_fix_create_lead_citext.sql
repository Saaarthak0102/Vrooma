-- 0017_fix_create_lead_citext.sql
-- Fix type resolution in create_lead RPC: remove unqualified ::citext cast inside search_path = ''

BEGIN;

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
  p_consent_id UUID DEFAULT NULL
)
RETURNS public.leads AS $$
DECLARE
  v_existing public.leads;
  v_new_lead public.leads;
  v_assigned_consultant UUID := NULL;
  v_sla_due TIMESTAMPTZ := pg_catalog.now() + INTERVAL '5 minutes';
  v_ref TEXT;
BEGIN
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
      VALUES (v_existing.id, 'repeat_enquiry', jsonb_build_object('message', p_message, 'source', p_source), auth.uid());

      UPDATE public.leads SET updated_at = pg_catalog.now() WHERE id = v_existing.id;
      RETURN v_existing;
    END IF;
  END IF;

  -- Select least-loaded active, available consultant in the rule pool
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
    AND (r.model_id IS NULL OR r.model_id = p_model_id)
    AND r.is_active = true
    AND p.is_active = true
    AND (a.is_available IS NULL OR (a.is_available = true AND (a.until IS NULL OR a.until > pg_catalog.now())))
  ORDER BY COALESCE(loads.active_load, 0) ASC, p.created_at ASC
  LIMIT 1
  FOR UPDATE OF c SKIP LOCKED;

  v_ref := private.generate_ref('LD-');

  INSERT INTO public.leads (
    ref, source, source_ref, user_id, name, phone, email, showroom_id,
    model_id, used_car_id, message, status, assigned_to, assigned_at,
    sla_due_at, consent_id
  )
  VALUES (
    v_ref, p_source, p_source_ref, auth.uid(), p_name, p_phone, p_email, p_showroom_id,
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
      auth.uid()
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
      auth.uid()
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

REVOKE ALL ON FUNCTION public.create_lead(TEXT, TEXT, UUID, UUID, UUID, TEXT, TEXT, public.lead_source_type, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_lead(TEXT, TEXT, UUID, UUID, UUID, TEXT, TEXT, public.lead_source_type, TEXT, UUID) TO authenticated, service_role;

COMMIT;

