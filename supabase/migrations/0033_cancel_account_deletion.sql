-- 0033_cancel_account_deletion.sql
-- Lets a buyer undo an account-erasure request during the 7-day cooling-off window.
-- Reverses request_account_deletion() (0009). Bookings already released and leads already closed stay that way;
-- the marketing-consent withdrawal also stays (the user can opt in again from their profile).

BEGIN;


ALTER TYPE data_request_status ADD VALUE IF NOT EXISTS 'cancelled';

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS UUID AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_req_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'VR001';
  END IF;

  -- Latest open deletion request that is still inside the 7-day window (finalize-deletions uses created_at too).
  SELECT id INTO v_req_id
  FROM public.data_requests
  WHERE user_id = v_uid
    AND kind = 'delete'
    AND status = 'received'
    AND created_at > pg_catalog.now() - INTERVAL '7 days'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_req_id IS NULL THEN
    RAISE EXCEPTION 'No pending deletion request can be cancelled' USING ERRCODE = 'VR006';
  END IF;

  UPDATE public.profiles
  SET deleted_at = NULL,
      is_active = true
  WHERE id = v_uid
    AND anonymised_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account has already been anonymised' USING ERRCODE = 'VR006';
  END IF;

  UPDATE public.data_requests
  SET status = 'cancelled',
      note = COALESCE(note, '') || ' [Cancelled by user at ' || pg_catalog.now()::text || ']'
  WHERE id = v_req_id;

  INSERT INTO public.audit_log (table_name, record_id, action, new_values, actor_id)
  VALUES ('profiles', v_uid::text, 'DELETION_CANCELLED', jsonb_build_object('request_id', v_req_id), v_uid);

  RETURN v_req_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.cancel_account_deletion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated, service_role;

COMMIT;
