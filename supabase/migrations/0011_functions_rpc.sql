-- 0011_functions_rpc.sql
-- Phase 2 Database: Security Definer Stored Procedures & Business Logic RPCs

BEGIN;

-- Helper to generate unambiguous reference codes (e.g. VR-7K2M9X)
CREATE OR REPLACE FUNCTION private.generate_ref(prefix TEXT DEFAULT 'VR-')
RETURNS TEXT AS $$
DECLARE
  alphabet TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  res TEXT := prefix;
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    res := res || pg_catalog.substr(alphabet, pg_catalog.floor(pg_catalog.random() * pg_catalog.length(alphabet) + 1)::int, 1);
  END LOOP;
  RETURN res;
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = '';

-- 1. Complete Profile (Atomic Profile + DPDP Consents)
CREATE OR REPLACE FUNCTION public.complete_profile(
  p_full_name TEXT,
  p_phone TEXT,
  p_whatsapp TEXT,
  p_city_id UUID,
  p_locale TEXT,
  p_address TEXT DEFAULT NULL,
  p_pincode TEXT DEFAULT NULL,
  p_marketing_consent BOOLEAN DEFAULT FALSE,
  p_policy_version TEXT DEFAULT '2026.1'
)
RETURNS public.profiles AS $$
DECLARE
  v_uid UUID;
  v_now TIMESTAMPTZ := pg_catalog.now();
  v_profile public.profiles;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'VR005';
  END IF;

  UPDATE public.profiles
  SET
    full_name = p_full_name,
    phone = p_phone,
    whatsapp = COALESCE(p_whatsapp, p_phone),
    city_id = p_city_id,
    locale = COALESCE(p_locale, 'en'),
    address = p_address,
    pincode = p_pincode,
    onboarding_completed_at = v_now,
    updated_at = v_now
  WHERE id = v_uid
  RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (
      id, email, full_name, phone, whatsapp, city_id, locale, address, pincode, role, is_active, onboarding_completed_at, updated_at
    )
    VALUES (
      v_uid, (SELECT email FROM auth.users WHERE id = v_uid), p_full_name, p_phone, COALESCE(p_whatsapp, p_phone), p_city_id, COALESCE(p_locale, 'en'), p_address, p_pincode, 'buyer', true, v_now, v_now
    )
    RETURNING * INTO v_profile;
  END IF;

  -- Append DPDP statutory consents
  INSERT INTO public.consents (user_id, purpose, granted, policy_version, source)
  VALUES
    (v_uid, 'terms_privacy', true, p_policy_version, 'signup'),
    (v_uid, 'service_contact', true, p_policy_version, 'signup'),
    (v_uid, 'marketing', COALESCE(p_marketing_consent, false), p_policy_version, 'signup');

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.complete_profile(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_profile(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated, service_role;

-- 2. Pricing RPC: Public On-Road Teaser (Total & Validity Date Only)
CREATE OR REPLACE FUNCTION public.get_onroad_teaser(
  p_variant_id UUID,
  p_city_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_variant public.variants;
  v_rule public.price_rules;
  v_road_tax INT;
  v_tcs INT := 0;
  v_total INT;
BEGIN
  SELECT * INTO v_variant FROM public.variants WHERE id = p_variant_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_rule := public.resolve_price_rule(p_city_id, p_variant_id, v_variant.model_id, v_variant.fuel);
  IF v_rule IS NULL THEN
    RETURN NULL;
  END IF;

  v_road_tax := pg_catalog.round(v_variant.ex_showroom * (v_rule.road_tax_pct / 100.0));
  IF v_variant.ex_showroom > 1000000 THEN
    v_tcs := pg_catalog.round(v_variant.ex_showroom * (v_rule.tcs_pct / 100.0));
  END IF;

  v_total := v_variant.ex_showroom + v_road_tax + v_rule.registration + v_rule.insurance + v_rule.handling + v_rule.accessories + v_tcs;

  RETURN jsonb_build_object(
    'total', v_total,
    'valid_until', v_rule.valid_until,
    'is_estimate', true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.get_onroad_teaser(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_onroad_teaser(UUID, UUID) TO anon, authenticated, service_role;

-- 3. Pricing RPC: Authenticated Full On-Road Breakup (Itemized Lines)
CREATE OR REPLACE FUNCTION public.get_onroad_breakup(
  p_variant_id UUID,
  p_city_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_variant public.variants;
  v_rule public.price_rules;
  v_road_tax INT;
  v_tcs INT := 0;
  v_total INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Itemized price breakup requires authentication' USING ERRCODE = 'VR005';
  END IF;

  SELECT * INTO v_variant FROM public.variants WHERE id = p_variant_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_rule := public.resolve_price_rule(p_city_id, p_variant_id, v_variant.model_id, v_variant.fuel);
  IF v_rule IS NULL THEN
    RETURN NULL;
  END IF;

  v_road_tax := pg_catalog.round(v_variant.ex_showroom * (v_rule.road_tax_pct / 100.0));
  IF v_variant.ex_showroom > 1000000 THEN
    v_tcs := pg_catalog.round(v_variant.ex_showroom * (v_rule.tcs_pct / 100.0));
  END IF;

  v_total := v_variant.ex_showroom + v_road_tax + v_rule.registration + v_rule.insurance + v_rule.handling + v_rule.accessories + v_tcs;

  RETURN jsonb_build_object(
    'ex_showroom', v_variant.ex_showroom,
    'road_tax', v_road_tax,
    'road_tax_pct', v_rule.road_tax_pct,
    'registration', v_rule.registration,
    'insurance', v_rule.insurance,
    'handling', v_rule.handling,
    'accessories', v_rule.accessories,
    'tcs', v_tcs,
    'total', v_total,
    'valid_from', v_rule.valid_from,
    'valid_until', v_rule.valid_until,
    'notes', v_rule.notes
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.get_onroad_breakup(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_onroad_breakup(UUID, UUID) TO authenticated, service_role;

-- 4. Lead Creation with 24-Hour Deduplication & 5-Minute SLA
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
    v_ref, p_source, p_source_ref, auth.uid(), p_name, p_phone, p_email::citext, p_showroom_id,
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

REVOKE ALL ON FUNCTION public.create_lead(TEXT, TEXT, UUID, UUID, UUID, TEXT, TEXT, public.lead_source_type, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_lead(TEXT, TEXT, UUID, UUID, UUID, TEXT, TEXT, public.lead_source_type, TEXT, UUID) TO anon, authenticated, service_role;

-- 5. Lead Reassignment RPC
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

REVOKE ALL ON FUNCTION public.reassign_lead(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reassign_lead(UUID, UUID, TEXT) TO authenticated, service_role;

-- 6. Update Lead Status RPC (Records first_contacted_at on transition from new)
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

REVOKE ALL ON FUNCTION public.set_lead_status(UUID, public.lead_status_type, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_lead_status(UUID, public.lead_status_type, TEXT) TO authenticated, service_role;

-- 7. Atomic Slot Booking RPC (Concurrency-safe via booked_count check)
CREATE OR REPLACE FUNCTION public.book_slot(
  p_slot_id UUID,
  p_kind public.booking_kind_type,
  p_vehicle_info JSONB DEFAULT '{}'::jsonb,
  p_service_type_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_consent_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS public.bookings AS $$
DECLARE
  v_slot public.slots;
  v_booking public.bookings;
  v_ref TEXT;
BEGIN
  -- Validate slot exists and lead time window (minimum 2 hours in advance)
  SELECT * INTO v_slot FROM public.slots WHERE id = p_slot_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking slot not found' USING ERRCODE = 'VR007';
  END IF;

  -- Validate requested booking kind matches target slot type
  IF v_slot.kind != p_kind THEN
    RAISE EXCEPTION 'Booking kind (%) does not match slot type (%)', p_kind, v_slot.kind USING ERRCODE = 'VR002';
  END IF;

  IF v_slot.starts_at <= pg_catalog.now() + INTERVAL '2 hours' THEN
    RAISE EXCEPTION 'Booking lead time required: appointment must be at least 2 hours in advance' USING ERRCODE = 'VR002';
  END IF;

  -- Atomic capacity decrement
  UPDATE public.slots
  SET booked_count = booked_count + 1
  WHERE id = p_slot_id
    AND is_active = true
    AND booked_count < capacity
  RETURNING * INTO v_slot;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected booking slot is unavailable or fully booked' USING ERRCODE = 'VR001';
  END IF;

  v_ref := private.generate_ref('BK-');

  INSERT INTO public.bookings (
    ref, user_id, slot_id, kind, status, vehicle_info, service_type_id,
    notes, consent_id, idempotency_key
  )
  VALUES (
    v_ref, auth.uid(), p_slot_id, p_kind, 'confirmed', p_vehicle_info,
    p_service_type_id, p_notes, p_consent_id, p_idempotency_key
  )
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.book_slot(UUID, public.booking_kind_type, JSONB, UUID, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_slot(UUID, public.booking_kind_type, JSONB, UUID, TEXT, UUID, TEXT) TO anon, authenticated, service_role;

-- 8. Cancel Booking RPC (Enforces ownership & releases slot capacity)
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
  SET booked_count = pg_catalog.greatest(0, booked_count - 1)
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

REVOKE ALL ON FUNCTION public.cancel_booking(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_booking(UUID, TEXT) TO authenticated, service_role;

-- 9. Reschedule Booking RPC (Atomic swap in one transaction with ownership check)
CREATE OR REPLACE FUNCTION public.reschedule_booking(
  p_booking_id UUID,
  p_new_slot_id UUID
)
RETURNS public.bookings AS $$
DECLARE
  v_old_booking public.bookings;
  v_new_slot public.slots;
  v_new_booking public.bookings;
BEGIN
  SELECT * INTO v_old_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original booking not found' USING ERRCODE = 'VR007';
  END IF;

  -- Enforce authorization: must be authenticated and own the booking, or be authorized staff
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to reschedule booking' USING ERRCODE = 'VR005';
  END IF;

  IF v_old_booking.user_id != auth.uid() AND NOT private.is_staff() THEN
    RAISE EXCEPTION 'Permission denied: Cannot reschedule another customer appointment' USING ERRCODE = 'VR005';
  END IF;

  -- Validate target slot
  SELECT * INTO v_new_slot FROM public.slots WHERE id = p_new_slot_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target booking slot not found' USING ERRCODE = 'VR007';
  END IF;

  IF v_new_slot.kind != v_old_booking.kind THEN
    RAISE EXCEPTION 'Target slot type (%) does not match existing booking kind (%)', v_new_slot.kind, v_old_booking.kind USING ERRCODE = 'VR002';
  END IF;

  -- 1. Book new slot
  v_new_booking := public.book_slot(
    p_new_slot_id,
    v_old_booking.kind,
    v_old_booking.vehicle_info,
    v_old_booking.service_type_id,
    'Rescheduled from ' || v_old_booking.ref
  );

  -- 2. Cancel old booking and release capacity
  PERFORM public.cancel_booking(p_booking_id, 'Rescheduled to ' || v_new_booking.ref);

  -- Link lineage and preserve original customer ownership
  UPDATE public.bookings
  SET rescheduled_from = p_booking_id,
      user_id = v_old_booking.user_id
  WHERE id = v_new_booking.id;

  RETURN v_new_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.reschedule_booking(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reschedule_booking(UUID, UUID) TO authenticated, service_role;

-- 10. Generate 14-Day Slots (Idempotent Generator - Service Role / Cron only)
CREATE OR REPLACE FUNCTION public.generate_slots(
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_days INT DEFAULT 14
)
RETURNS INT AS $$
DECLARE
  v_day_offset INT;
  v_curr_date DATE;
  v_created_count INT := 0;
  v_showroom RECORD;
  v_workshop RECORD;
  v_demo RECORD;
  v_hour INT;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
BEGIN
  FOR v_day_offset IN 0..(p_days - 1) LOOP
    v_curr_date := p_start_date + v_day_offset;

    -- Test Drive Slots for Active Demo Cars (10:00 to 18:00 hourly)
    FOR v_demo IN SELECT * FROM public.demo_cars WHERE is_active = true LOOP
      -- Check closure
      IF NOT EXISTS (
        SELECT 1 FROM public.showroom_closures
        WHERE facility_id = v_demo.showroom_id AND closed_date = v_curr_date
      ) THEN
        FOR v_hour IN 10..17 LOOP
          v_start := (v_curr_date::text || ' ' || v_hour || ':00:00 Asia/Kolkata')::timestamptz;
          v_end := v_start + INTERVAL '1 hour';

          INSERT INTO public.slots (kind, showroom_id, demo_car_id, starts_at, ends_at, capacity, is_active)
          VALUES ('test_drive', v_demo.showroom_id, v_demo.id, v_start, v_end, 1, true)
          ON CONFLICT (kind, resource_id, starts_at) DO NOTHING;

          v_created_count := v_created_count + 1;
        END LOOP;
      END IF;
    END LOOP;

    -- Service Workshop Slots (09:00 to 17:00 hourly, capacity = bays)
    FOR v_workshop IN SELECT * FROM public.workshops WHERE is_active = true LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.showroom_closures
        WHERE facility_id = v_workshop.id AND closed_date = v_curr_date
      ) THEN
        FOR v_hour IN 9..16 LOOP
          v_start := (v_curr_date::text || ' ' || v_hour || ':00:00 Asia/Kolkata')::timestamptz;
          v_end := v_start + INTERVAL '1 hour';

          INSERT INTO public.slots (kind, workshop_id, starts_at, ends_at, capacity, is_active)
          VALUES ('service', v_workshop.id, v_start, v_end, v_workshop.bays, true)
          ON CONFLICT (kind, resource_id, starts_at) DO NOTHING;

          v_created_count := v_created_count + 1;
        END LOOP;
      END IF;
    END LOOP;

  END LOOP;

  RETURN v_created_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.generate_slots(DATE, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_slots(DATE, INT) TO service_role;

-- 11. SLA Breach Evaluator Worker (Internal Background Routine)
CREATE OR REPLACE FUNCTION public.flag_sla_breaches()
RETURNS INT AS $$
DECLARE
  v_lead RECORD;
  v_count INT := 0;
BEGIN
  FOR v_lead IN
    SELECT l.*, s.name as showroom_name
    FROM public.leads l
    JOIN public.showrooms s ON l.showroom_id = s.id
    WHERE l.status = 'new'
      AND l.first_contacted_at IS NULL
      AND l.sla_breached_at IS NULL
      AND l.sla_due_at < pg_catalog.now()
    FOR UPDATE OF l SKIP LOCKED
  LOOP
    UPDATE public.leads
    SET sla_breached_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE id = v_lead.id;

    INSERT INTO public.lead_events (lead_id, type, payload)
    VALUES (v_lead.id, 'sla_breached', jsonb_build_object('breached_at', pg_catalog.now(), 'due_at', v_lead.sla_due_at));

    -- Alert Showroom Manager
    INSERT INTO public.messages_outbox (
      channel, to_address, template, body, lead_id, idempotency_key
    )
    VALUES (
      'email',
      'manager@vrooma.in',
      'sla_breach_alert',
      'URGENT: Lead ' || v_lead.ref || ' (' || v_lead.name || ') breached 5-minute response SLA at ' || v_lead.showroom_name,
      v_lead.id,
      'outbox_' || v_lead.id::text || '_breach'
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.flag_sla_breaches() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flag_sla_breaches() TO service_role;

-- 12. Dealer Principal Leak Metrics Function (Calculates brief formulas)
CREATE OR REPLACE FUNCTION public.get_leak_metrics(
  p_from TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
  p_to TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  v_total_leads INT;
  v_contacted_in_sla INT;
  v_sla_pct NUMERIC(5,2);
  v_lost_leads INT;
  v_estimated_lost_rev BIGINT;
BEGIN
  IF NOT private.is_staff() THEN
    RAISE EXCEPTION 'Permission denied: Only dealership staff can access performance metrics' USING ERRCODE = 'VR005';
  END IF;

  SELECT count(*) INTO v_total_leads
  FROM public.leads
  WHERE created_at BETWEEN p_from AND p_to;

  SELECT count(*) INTO v_contacted_in_sla
  FROM public.leads
  WHERE created_at BETWEEN p_from AND p_to
    AND first_contacted_at IS NOT NULL
    AND first_contacted_at <= sla_due_at;

  IF v_total_leads > 0 THEN
    v_sla_pct := pg_catalog.round((v_contacted_in_sla::numeric / v_total_leads::numeric) * 100.0, 2);
  ELSE
    v_sla_pct := 100.0;
  END IF;

  SELECT count(*) INTO v_lost_leads
  FROM public.leads
  WHERE created_at BETWEEN p_from AND p_to AND status = 'lost';

  -- Brief assumption: each lost car sale represents ₹25,000 dealer contribution margin
  v_estimated_lost_rev := v_lost_leads * 25000;

  RETURN jsonb_build_object(
    'total_leads', v_total_leads,
    'contacted_in_sla', v_contacted_in_sla,
    'sla_compliance_pct', v_sla_pct,
    'lost_leads', v_lost_leads,
    'estimated_lost_dealer_contribution', v_estimated_lost_rev
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.get_leak_metrics(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leak_metrics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;

-- 13. Staff Privileged RPC: Retrieve Unmasked Vehicle Registration Number
CREATE OR REPLACE FUNCTION public.get_used_car_reg(p_stock_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_reg TEXT;
BEGIN
  IF NOT private.is_staff() THEN
    RAISE EXCEPTION 'Privilege denied: Only staff members can view unmasked registration numbers' USING ERRCODE = 'VR005';
  END IF;

  SELECT reg_no_private INTO v_reg
  FROM public.used_cars
  WHERE stock_id = p_stock_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle not found' USING ERRCODE = 'VR007';
  END IF;

  -- Audit access to personal registration data
  INSERT INTO public.audit_log (table_name, record_id, action, new_values, actor_id)
  VALUES ('used_cars', p_stock_id, 'VIEW_UNMASKED_REG', jsonb_build_object('accessed_at', pg_catalog.now()), auth.uid());

  RETURN v_reg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.get_used_car_reg(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_used_car_reg(TEXT) TO authenticated, service_role;

-- 14. Admin User Management RPCs
CREATE OR REPLACE FUNCTION public.admin_set_role(
  p_user_id UUID,
  p_new_role public.role_type
)
RETURNS VOID AS $$
DECLARE
  v_admin_count INT;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can assign user roles' USING ERRCODE = 'VR005';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Administrators cannot alter their own role' USING ERRCODE = 'VR005';
  END IF;

  -- Prevent demoting the last active admin
  SELECT count(*) INTO v_admin_count
  FROM public.profiles
  WHERE role = 'admin' AND is_active = true;

  IF v_admin_count <= 1 AND EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'admin') AND p_new_role != 'admin' THEN
    RAISE EXCEPTION 'Cannot demote the last active system administrator' USING ERRCODE = 'VR005';
  END IF;

  UPDATE public.profiles
  SET role = p_new_role,
      updated_at = pg_catalog.now()
  WHERE id = p_user_id;

  INSERT INTO public.audit_log (table_name, record_id, action, new_values, actor_id)
  VALUES ('profiles', p_user_id::text, 'ROLE_CHANGED', jsonb_build_object('new_role', p_new_role), auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.admin_set_role(UUID, public.role_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role(UUID, public.role_type) TO authenticated, service_role;

COMMIT;
