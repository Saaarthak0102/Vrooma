-- 0010_rls_policies.sql
-- Phase 2 Database: Row Level Security (RLS) Policies

BEGIN;

-- 1. Enable RLS on all tables
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showroom_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.used_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.used_car_sales_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.used_car_price_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_showrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_rule_consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_in_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 2. PUBLIC CATALOG & FACILITY POLICIES
-- =========================================================================

CREATE POLICY "Public read active cities" ON public.cities FOR SELECT USING (true);
CREATE POLICY "Admin write cities" ON public.cities FOR ALL TO authenticated USING (private.is_admin());

CREATE POLICY "Public read active showrooms" ON public.showrooms FOR SELECT USING (is_active = true);
CREATE POLICY "Admin write showrooms" ON public.showrooms FOR ALL TO authenticated USING (private.is_admin());

CREATE POLICY "Public read active workshops" ON public.workshops FOR SELECT USING (is_active = true);
CREATE POLICY "Admin write workshops" ON public.workshops FOR ALL TO authenticated USING (private.is_admin());

CREATE POLICY "Public read closures" ON public.showroom_closures FOR SELECT USING (true);
CREATE POLICY "Admin write closures" ON public.showroom_closures FOR ALL TO authenticated USING (private.is_admin());

CREATE POLICY "Public read active models" ON public.models FOR SELECT USING (is_active = true);
CREATE POLICY "Admin write models" ON public.models FOR ALL TO authenticated USING (private.is_admin());

CREATE POLICY "Public read active variants" ON public.variants FOR SELECT USING (is_active = true);
CREATE POLICY "Admin write variants" ON public.variants FOR ALL TO authenticated USING (private.is_admin());

CREATE POLICY "Public read variant colors" ON public.variant_colors FOR SELECT USING (true);
CREATE POLICY "Admin write variant colors" ON public.variant_colors FOR ALL TO authenticated USING (private.is_admin());

CREATE POLICY "Public read active demo cars" ON public.demo_cars FOR SELECT USING (is_active = true);
CREATE POLICY "Admin write demo cars" ON public.demo_cars FOR ALL TO authenticated USING (private.is_admin());

CREATE POLICY "Public read service types" ON public.service_types FOR SELECT USING (is_active = true);
CREATE POLICY "Admin write service types" ON public.service_types FOR ALL TO authenticated USING (private.is_admin());

CREATE POLICY "Public read active offers" ON public.offers FOR SELECT USING (is_active = true AND valid_until >= CURRENT_DATE);
CREATE POLICY "Admin write offers" ON public.offers FOR ALL TO authenticated USING (private.is_admin());

CREATE POLICY "Public read active banners" ON public.banners FOR SELECT USING (is_active = true);
CREATE POLICY "Admin write banners" ON public.banners FOR ALL TO authenticated USING (private.is_admin());

-- =========================================================================
-- 3. PRICING & USED CAR INVENTORY POLICIES
-- =========================================================================

-- price_rules: anon / buyer have NO direct select access; accessed via get_onroad_teaser / get_onroad_breakup RPCs
CREATE POLICY "Staff read price rules" ON public.price_rules FOR SELECT TO authenticated
  USING (private.is_staff());
CREATE POLICY "Admin write price rules" ON public.price_rules FOR ALL TO authenticated
  USING (private.is_admin());

-- used_cars: public reads listed cars (safe columns only per column grant in 0005)
CREATE POLICY "Public read listed used cars" ON public.used_cars FOR SELECT
  USING (status IN ('available', 'booked', 'sold'));
CREATE POLICY "Manager and Admin write used cars" ON public.used_cars FOR ALL TO authenticated
  USING (private.is_manager());

-- used_car_sales_history & price_suggestions: Manager & Admin only (consultants and buyers have NONE)
CREATE POLICY "Manager read write sales history" ON public.used_car_sales_history FOR ALL TO authenticated
  USING (private.is_manager());

CREATE POLICY "Manager read write price suggestions" ON public.used_car_price_suggestions FOR ALL TO authenticated
  USING (private.is_manager());

-- =========================================================================
-- 4. CAPACITY & SLOTS POLICIES
-- =========================================================================

-- slots: anyone can read future active slots
CREATE POLICY "Public read future active slots" ON public.slots FOR SELECT
  USING (is_active = true AND starts_at > NOW());
CREATE POLICY "Admin manage slots" ON public.slots FOR ALL TO authenticated
  USING (private.is_admin());

-- =========================================================================
-- 5. IDENTITY & PROFILES POLICIES
-- =========================================================================

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()) AND role = (SELECT private.current_role()));

CREATE POLICY "Staff view profiles" ON public.profiles FOR SELECT TO authenticated
  USING (private.is_staff());

CREATE POLICY "Admin manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (private.is_admin());

CREATE POLICY "Staff read showroom memberships" ON public.staff_showrooms FOR SELECT TO authenticated
  USING (private.is_staff());
CREATE POLICY "Admin write showroom memberships" ON public.staff_showrooms FOR ALL TO authenticated
  USING (private.is_admin());

CREATE POLICY "Consultants view own availability" ON public.consultant_availability FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()) OR private.is_manager());
CREATE POLICY "Consultants update own availability" ON public.consultant_availability FOR UPDATE TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

-- consents: users view own consents; insert via RPC
CREATE POLICY "Users view own consents" ON public.consents FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Admin view consents" ON public.consents FOR SELECT TO authenticated
  USING (private.is_admin());

-- =========================================================================
-- 6. BOOKINGS & SAVED ITEMS POLICIES
-- =========================================================================

CREATE POLICY "Buyers read own bookings" ON public.bookings FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Staff view showroom bookings" ON public.bookings FOR SELECT TO authenticated
  USING (
    private.is_staff() AND (
      slot_id IN (
        SELECT id FROM public.slots WHERE showroom_id IN (SELECT private.user_showrooms())
      ) OR
      private.is_admin()
    )
  );

CREATE POLICY "Buyers manage own saved items" ON public.saved_items FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Buyers manage own trade in requests" ON public.trade_in_requests FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Staff view trade in requests" ON public.trade_in_requests FOR SELECT TO authenticated
  USING (private.is_staff());

-- =========================================================================
-- 7. LEADS & ASSIGNMENT POLICIES
-- =========================================================================

-- Consultants see assigned leads or leads in their showroom pool
CREATE POLICY "Consultants view assigned or showroom leads" ON public.leads FOR SELECT TO authenticated
  USING (
    assigned_to = (SELECT auth.uid())
    OR (
      private.is_staff() AND showroom_id IN (SELECT private.user_showrooms())
    )
    OR private.is_admin()
  );

CREATE POLICY "Consultants update assigned leads" ON public.leads FOR UPDATE TO authenticated
  USING (assigned_to = (SELECT auth.uid()) OR private.is_manager())
  WITH CHECK (assigned_to = (SELECT auth.uid()) OR private.is_manager());

CREATE POLICY "Staff view lead events" ON public.lead_events FOR SELECT TO authenticated
  USING (private.is_staff());

CREATE POLICY "Staff view assignment rules" ON public.assignment_rules FOR SELECT TO authenticated
  USING (private.is_staff());
CREATE POLICY "Admin write assignment rules" ON public.assignment_rules FOR ALL TO authenticated
  USING (private.is_admin());

CREATE POLICY "Staff view assignment consultants" ON public.assignment_rule_consultants FOR SELECT TO authenticated
  USING (private.is_staff());
CREATE POLICY "Admin write assignment consultants" ON public.assignment_rule_consultants FOR ALL TO authenticated
  USING (private.is_admin());

-- =========================================================================
-- 8. OPERATIONS, AUDIT & DATA RIGHTS POLICIES
-- =========================================================================

-- messages_outbox, rate_limits, idempotency_keys have zero client policies (service_role only)

CREATE POLICY "Manager view AI logs" ON public.ai_logs FOR SELECT TO authenticated
  USING (private.is_manager());

CREATE POLICY "Admin view audit logs" ON public.audit_log FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE POLICY "Staff view csv imports" ON public.csv_imports FOR SELECT TO authenticated
  USING (private.is_staff());
CREATE POLICY "Staff insert csv imports" ON public.csv_imports FOR INSERT TO authenticated
  WITH CHECK (private.is_staff());

CREATE POLICY "Users read own data requests" ON public.data_requests FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users insert own data requests" ON public.data_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Admin manage data requests" ON public.data_requests FOR ALL TO authenticated
  USING (private.is_admin());

COMMIT;

