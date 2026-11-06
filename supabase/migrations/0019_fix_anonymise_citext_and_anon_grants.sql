-- 0019_fix_anonymise_citext_and_anon_grants.sql
-- (1) private.anonymise_user used an unqualified ::citext cast under search_path = '' (same class of bug
--     as 0017), so DPDP account erasure would fail. Qualify the type as public.citext.
-- (2) Defence in depth: these RPCs already reject callers with no auth.uid(); also stop anon from executing them.

BEGIN;

CREATE OR REPLACE FUNCTION private.anonymise_user(p_uid UUID)
RETURNS VOID AS $$
DECLARE
  v_now TIMESTAMPTZ := pg_catalog.now();
BEGIN
  -- Validate that user exists in profiles
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_uid) THEN
    RETURN;
  END IF;

  -- 1. Scrub Profile personal details
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

  -- 2. Scrub personal information in Leads
  UPDATE public.leads
  SET
    name = 'Deleted Account',
    phone = '+919999999999',
    email = NULL,
    message = '[REDACTED PER DPDP ACT 2023]'
  WHERE user_id = p_uid;

  -- 3. Scrub personal vehicle registration in Bookings
  UPDATE public.bookings
  SET
    vehicle_info = '{"anonymised": true}'::jsonb,
    notes = NULL
  WHERE user_id = p_uid;

  -- 4. Delete saved items
  DELETE FROM public.saved_items WHERE user_id = p_uid;

  -- 5. Redact Trade-In submissions
  UPDATE public.trade_in_requests
  SET
    notes = NULL,
    photos = '[]'::jsonb
  WHERE user_id = p_uid;

  -- 6. Transition pending deletion requests for this user to 'done'
  UPDATE public.data_requests
  SET status = 'done',
      updated_at = v_now,
      note = COALESCE(note, '') || ' [Anonymised at ' || v_now::text || ']'
  WHERE user_id = p_uid
    AND kind = 'delete'
    AND status IN ('received', 'in_progress');

  -- 7. Log audit event
  INSERT INTO public.audit_log (table_name, record_id, action, new_values, actor_id)
  VALUES ('profiles', p_uid::text, 'ANONYMISED', jsonb_build_object('anonymised_at', v_now), auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION private.anonymise_user(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.anonymise_user(UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION public.complete_profile FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_account_deletion() FROM anon;
REVOKE EXECUTE ON FUNCTION public.reschedule_booking FROM anon;

COMMIT;
