-- 0014_rpc_privilege_hardening.sql
-- Security Hardening: Revoke unauthorized direct PostgREST RPC execution from anon and buyers,
-- and restrict sales consultants from querying all retail buyer profiles.

BEGIN;

-- 1. Alter default privileges for future functions to avoid auto-granting to anon/authenticated
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- 2. Revoke direct anon execution on lead creation and slot booking RPCs
-- Unauthenticated users MUST submit leads and book through the rate-limited, honeypot-guarded server routes
REVOKE EXECUTE ON FUNCTION public.create_lead(TEXT, TEXT, UUID, UUID, UUID, TEXT, TEXT, public.lead_source_type, TEXT, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.book_slot(UUID, public.booking_kind_type, JSONB, UUID, TEXT, UUID, TEXT) FROM anon;

-- 3. Revoke resolve_price_rule from anon and authenticated buyers
-- Buyers must only access computed on-road breakdown via get_onroad_breakup, never raw price margin rules
REVOKE EXECUTE ON FUNCTION public.resolve_price_rule(UUID, UUID, UUID, public.fuel_type, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_price_rule(UUID, UUID, UUID, public.fuel_type, DATE) TO service_role;

-- 4. Tighten profiles RLS policy: prevent sales consultants from reading all retail buyers
DROP POLICY IF EXISTS "Staff view profiles" ON public.profiles;

-- Managers and Admins can view all dealership profiles
CREATE POLICY "Managers view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (private.is_manager());

-- Sales consultants can only view other staff in their showroom, or buyers assigned directly to their leads
CREATE POLICY "Consultants view relevant profiles" ON public.profiles FOR SELECT TO authenticated
  USING (
    private.current_role() = 'consultant' AND (
      -- Other staff in the same showroom
      (role IN ('consultant', 'manager') AND id IN (
        SELECT ss.profile_id FROM public.staff_showrooms ss
        WHERE ss.showroom_id IN (SELECT private.user_showrooms())
      ))
      OR
      -- Retail buyers assigned directly to this consultant
      (role = 'buyer' AND id IN (
        SELECT l.user_id FROM public.leads l
        WHERE l.assigned_to = (SELECT auth.uid()) AND l.user_id IS NOT NULL
      ))
    )
  );

COMMIT;

