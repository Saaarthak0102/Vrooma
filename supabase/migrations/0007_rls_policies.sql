-- 0007_rls_policies.sql
-- Enable Row Level Security (RLS) on all tables and document policy outlines.
-- Real policy enforcement will be wired in Phase 3 (Backend day).

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE showrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_car_sales_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_car_price_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_in_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_imports ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- POLICY OUTLINES (TODO: Activate on Backend Day 3)
-- =========================================================================

-- 1. PUBLIC READABLE TABLES
-- cities, showrooms, workshops, models, variants, variant_colors, offers, banners:
-- CREATE POLICY "Public can view active catalog and facilities" ON models FOR SELECT USING (is_active = true);
-- CREATE POLICY "Public can view active variants" ON variants FOR SELECT USING (true);
-- CREATE POLICY "Public can view public showrooms" ON showrooms FOR SELECT USING (true);

-- 2. PRICE RULES
-- Only authenticated users can read detailed price rules; anon gets ex-showroom only.
-- CREATE POLICY "Authenticated users can read price rules" ON price_rules FOR SELECT TO authenticated USING (true);

-- 3. USED CARS & PRIVACY RESTRICTIONS
-- reg_no_private must NEVER be selectable by anon or normal buyer roles.
-- CREATE POLICY "Public can read used car listings" ON used_cars FOR SELECT USING (status != 'sold');
-- (Column level security / view without reg_no_private for anon / authenticated buyers).

-- 4. USED CAR PRICE SUGGESTIONS (MANAGER ONLY)
-- CREATE POLICY "Manager can view AI price suggestions" ON used_car_price_suggestions
--   FOR SELECT TO authenticated
--   USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('manager', 'admin')));

-- 5. LEADS AND ASSIGNMENT
-- Leads visible to the assigned consultant and managers/admins only.
-- CREATE POLICY "Consultants see assigned leads; Managers see all leads" ON leads
--   FOR SELECT TO authenticated
--   USING (
--     assigned_to = auth.uid() OR
--     EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('manager', 'admin'))
--   );

-- 6. BUYER BOOKINGS & SAVED ITEMS
-- Buyers see only their own rows.
-- CREATE POLICY "Buyers manage their own bookings" ON bookings
--   FOR ALL TO authenticated
--   USING (user_id = auth.uid());
-- CREATE POLICY "Buyers manage their saved items" ON saved_items
--   FOR ALL TO authenticated
--   USING (user_id = auth.uid());

-- 7. AUDIT LOG & AI LOGS
-- Admins alone can review AI transparency logs and audit records.
-- CREATE POLICY "Admins view audit and AI logs" ON ai_logs
--   FOR SELECT TO authenticated
--   USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

