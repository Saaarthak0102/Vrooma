-- 0023_booking_integrity_and_erasure.sql
-- (1) cancel_booking: lock the row so two concurrent cancels cannot both release capacity, refuse to cancel
--     completed / no-show / already-started appointments (buyers), and move the linked test-drive lead back
--     from 'test_drive_booked' to 'contacted'.
-- (2) A unique index on bookings.idempotency_key (active bookings only) so the check-then-insert in the
--     booking action cannot race. Cancelled bookings keep their key, so the same slot can be re-booked.
-- (3) private.anonymise_user also erases support-chat history (added in 0021).

BEGIN;

CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.bookings AS $$
DECLARE
  v_booking public.bookings;
  v_slot_starts TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to cancel booking' USING ERRCODE = 'VR005';
  END IF;

  -- Row lock: serialises concurrent cancels of the same booking.
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'VR007';
  END IF;

  IF v_booking.user_id != auth.uid() AND NOT private.is_staff() THEN
    RAISE EXCEPTION 'Permission denied: Cannot cancel another customer appointment' USING ERRCODE = 'VR005';
  END IF;

  IF v_booking.status = 'cancelled' THEN
    RETURN v_booking; -- Idempotent no-op
  END IF;

  IF v_booking.status::text IN ('completed', 'no_show') THEN
    RAISE EXCEPTION 'This appointment is already closed and cannot be cancelled' USING ERRCODE = 'VR002';
  END IF;

  SELECT starts_at INTO v_slot_starts FROM public.slots WHERE id = v_booking.slot_id;
  IF v_slot_starts IS NOT NULL AND v_slot_starts <= pg_catalog.now() AND NOT private.is_staff() THEN
    RAISE EXCEPTION 'This appointment has already started and cannot be cancelled online' USING ERRCODE = 'VR002';
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

  -- The lead created for this booking is no longer waiting on a test drive.
  IF v_booking.kind::text = 'test_drive' THEN
    UPDATE public.leads
    SET status = 'contacted',
        status_changed_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE source_ref = v_booking.ref
      AND status::text = 'test_drive_booked';
  END IF;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.cancel_booking(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking(UUID, TEXT) TO authenticated, service_role;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_active_idempotency_key
  ON public.bookings (idempotency_key)
  WHERE idempotency_key IS NOT NULL AND status::text <> 'cancelled';

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
    address = NULL,
    pincode = NULL,
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
    notes = NULL
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

COMMIT;
