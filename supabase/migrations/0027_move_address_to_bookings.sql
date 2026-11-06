-- 0027_move_address_to_bookings.sql
-- The customer's address is no longer kept on the profile. It is asked only when a booking needs it
-- (home test drive, vehicle pickup) and stored on that booking.
--
--  (1) bookings gets address + pincode (both NULL for showroom / workshop visits).
--  (2) book_slot takes p_address / p_pincode.
--  (3) complete_profile loses p_address / p_pincode.
--  (4) private.anonymise_user stops touching the removed profile columns and wipes booking addresses.
--  (5) profiles.address and profiles.pincode are dropped (existing values are lost, by request).

BEGIN;

-- 1. Booking address -------------------------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_address_len,
  DROP CONSTRAINT IF EXISTS bookings_pincode_fmt;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_address_len CHECK (address IS NULL OR char_length(address) BETWEEN 5 AND 255),
  ADD CONSTRAINT bookings_pincode_fmt CHECK (pincode IS NULL OR pincode ~ '^[1-9][0-9]{5}$');

-- 2. book_slot with address ------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.book_slot(UUID, public.booking_kind_type, JSONB, UUID, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.book_slot(
  p_slot_id UUID,
  p_kind public.booking_kind_type,
  p_vehicle_info JSONB DEFAULT '{}'::jsonb,
  p_service_type_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_consent_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_pincode TEXT DEFAULT NULL
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

  -- An address needs a pincode and the other way round (home visit details travel together)
  IF (p_address IS NULL) <> (p_pincode IS NULL) THEN
    RAISE EXCEPTION 'Address and pincode must be provided together' USING ERRCODE = 'VR002';
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
    notes, consent_id, idempotency_key, address, pincode
  )
  VALUES (
    v_ref, auth.uid(), p_slot_id, p_kind, 'confirmed', p_vehicle_info,
    p_service_type_id, p_notes, p_consent_id, p_idempotency_key, p_address, p_pincode
  )
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.book_slot(UUID, public.booking_kind_type, JSONB, UUID, TEXT, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_slot(UUID, public.booking_kind_type, JSONB, UUID, TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 3. complete_profile without address / pincode -----------------------------------------------------
DROP FUNCTION IF EXISTS public.complete_profile(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT);

CREATE OR REPLACE FUNCTION public.complete_profile(
  p_full_name TEXT,
  p_phone TEXT,
  p_whatsapp TEXT,
  p_city_id UUID,
  p_locale TEXT,
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
    onboarding_completed_at = v_now,
    updated_at = v_now
  WHERE id = v_uid
  RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (
      id, email, full_name, phone, whatsapp, city_id, locale, role, is_active, onboarding_completed_at, updated_at
    )
    VALUES (
      v_uid, (SELECT email FROM auth.users WHERE id = v_uid), p_full_name, p_phone, COALESCE(p_whatsapp, p_phone), p_city_id, COALESCE(p_locale, 'en'), 'buyer', true, v_now, v_now
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

REVOKE ALL ON FUNCTION public.complete_profile(TEXT, TEXT, TEXT, UUID, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_profile(TEXT, TEXT, TEXT, UUID, TEXT, BOOLEAN, TEXT) TO authenticated, service_role;

-- 4. Erasure: no removed columns, and booking addresses are wiped ----------------------------------
CREATE OR REPLACE FUNCTION private.anonymise_user(p_uid UUID)
RETURNS VOID AS $$
DECLARE
  v_now TIMESTAMPTZ := pg_catalog.now();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_uid) THEN
    RETURN;
  END IF;

  UPDATE public.profiles
  SET
    email = ('anonymised_' || pg_catalog.substr(p_uid::text, 1, 8) || '@vrooma.internal')::public.citext,
    full_name = 'Deleted Account',
    phone = NULL,
    whatsapp = NULL,
    anonymised_at = v_now,
    is_active = false
  WHERE id = p_uid;

  UPDATE public.leads
  SET
    name = 'Deleted Account',
    phone = '+919999999999',
    email = NULL,
    message = '[REDACTED PER DPDP ACT 2023]'
  WHERE user_id = p_uid;

  UPDATE public.bookings
  SET
    vehicle_info = '{"anonymised": true}'::jsonb,
    notes = NULL,
    address = NULL,
    pincode = NULL
  WHERE user_id = p_uid;

  DELETE FROM public.saved_items WHERE user_id = p_uid;

  -- Support chats can contain personal details typed by the buyer: erase them (messages cascade).
  DELETE FROM public.chat_conversations WHERE user_id = p_uid;

  UPDATE public.trade_in_requests
  SET
    notes = NULL,
    photos = '[]'::jsonb
  WHERE user_id = p_uid;

  UPDATE public.data_requests
  SET status = 'done',
      updated_at = v_now,
      note = COALESCE(note, '') || ' [Anonymised at ' || v_now::text || ']'
  WHERE user_id = p_uid
    AND kind = 'delete'
    AND status IN ('received', 'in_progress');

  INSERT INTO public.audit_log (table_name, record_id, action, new_values, actor_id)
  VALUES ('profiles', p_uid::text, 'ANONYMISED', jsonb_build_object('anonymised_at', v_now), auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION private.anonymise_user(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.anonymise_user(UUID) TO service_role;

-- 5. Drop the profile columns ------------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS pincode;

COMMIT;
