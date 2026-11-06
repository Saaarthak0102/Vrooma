-- 0024_lead_status_sla_semantics.sql
-- (1) Only a genuine contact stops the SLA clock. Marking a brand-new lead 'lost' (or anything that is not a
--     contact) used to set first_contacted_at and count as "response met", which inflated the SLA metrics.
-- (2) Closed leads (won / lost) can be re-opened only by a manager or admin, not silently by a consultant.

BEGIN;

CREATE OR REPLACE FUNCTION public.set_lead_status(
  p_lead_id UUID,
  p_status public.lead_status_type,
  p_lost_reason TEXT DEFAULT NULL
)
RETURNS public.leads AS $$
DECLARE
  v_lead public.leads;
  v_now TIMESTAMPTZ := pg_catalog.now();
  v_is_contact BOOLEAN;
BEGIN
  IF NOT private.is_staff() THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = 'VR005';
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found' USING ERRCODE = 'VR007';
  END IF;

  IF private.current_role() = 'consultant' AND v_lead.assigned_to IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Permission denied: lead is not assigned to you' USING ERRCODE = 'VR005';
  END IF;

  IF v_lead.status::text IN ('won', 'lost')
     AND p_status::text NOT IN ('won', 'lost')
     AND private.current_role() = 'consultant' THEN
    RAISE EXCEPTION 'Closed leads can only be re-opened by a manager' USING ERRCODE = 'VR002';
  END IF;

  v_is_contact := p_status::text IN ('contacted', 'test_drive_booked', 'negotiating', 'won');

  UPDATE public.leads
  SET
    status = p_status,
    lost_reason = CASE WHEN p_status = 'lost' THEN p_lost_reason ELSE lost_reason END,
    first_contacted_at = CASE WHEN first_contacted_at IS NULL AND v_is_contact THEN v_now ELSE first_contacted_at END,
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

COMMIT;
