-- 0009_privacy_requests.sql
-- Phase 2 Database: DPDP Data Rights, Account Erasure & User Anonymization

BEGIN;

-- 1. Data Rights Requests Table (Export, Deletion, Grievance)
CREATE TABLE IF NOT EXISTS public.data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind data_request_kind NOT NULL,
  status data_request_status NOT NULL DEFAULT 'received',
  due_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_requests_user ON public.data_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_requests_due ON public.data_requests(status, due_at) WHERE status = 'received';

DROP TRIGGER IF EXISTS trg_data_requests_updated_at ON public.data_requests;
CREATE TRIGGER trg_data_requests_updated_at
  BEFORE UPDATE ON public.data_requests
  FOR EACH ROW EXECUTE PROCEDURE private.touch_updated_at();

-- 2. User Deletion Self-Service Request Function
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS UUID AS $$
DECLARE
  v_uid UUID;
  v_req_id UUID;
  v_role role_type;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'VR005';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role != 'buyer' THEN
    RAISE EXCEPTION 'Staff and Administrator accounts cannot self-delete. Contact dealership principal.' USING ERRCODE = 'VR005';
  END IF;

  -- Mark profile soft-deleted
  UPDATE public.profiles
  SET deleted_at = NOW(),
      is_active = false
  WHERE id = v_uid;

  -- Withdraw marketing consent
  INSERT INTO public.consents (user_id, purpose, granted, policy_version, source)
  VALUES (v_uid, 'marketing', false, '2026.1', 'onboarding');

  -- Create formal deletion tracking record
  INSERT INTO public.data_requests (user_id, kind, status, note)
  VALUES (v_uid, 'delete', 'received', 'Self-service account deletion request')
  RETURNING id INTO v_req_id;

  RETURN v_req_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Permanent PII Anonymization Function (Executed after cooling-off period)
CREATE OR REPLACE FUNCTION private.anonymise_user(p_uid UUID)
RETURNS VOID AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Scrub Profile personal details
  UPDATE public.profiles
  SET
    email = ('anonymised_' || substr(p_uid::text, 1, 8) || '@vrooma.internal')::citext,
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

  -- 6. Log audit event
  INSERT INTO public.audit_log (table_name, record_id, action, new_values, actor_id)
  VALUES ('profiles', p_uid::text, 'ANONYMISED', jsonb_build_object('anonymised_at', v_now), auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

