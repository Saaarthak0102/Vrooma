-- supabase/seed-consultant-routing.sql
-- =============================================================================
-- VROOMA — DEV CONSULTANT ROUTING RULES SEED SCRIPT
-- =============================================================================
-- Target Environment: DEV Supabase Project ONLY (eobtzcwinjmimzisypca)
-- Hard-Guards:        zdasktnbdjkjtoncojsy (PRODUCTION - FORBIDDEN), ajumkjokagqfdikfguti (retired production - FORBIDDEN)
--                     gmyrehlrmifxckszrdje (DELETED LEGACY - FORBIDDEN)
-- Idempotency:        Safe to rerun repeatedly (ON CONFLICT DO UPDATE / DO NOTHING)
-- Dependencies:       1. Geo & Catalog seed data (showrooms, models)
--                     2. Staff auth users & profiles (scripts/seed-dev-users.ts)
--                     3. Staff showroom memberships (public.staff_showrooms)
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. PRE-FLIGHT ENVIRONMENT & SECURITY GUARD
-- =============================================================================
DO $$
DECLARE
  v_expected_dev_ref     CONSTANT text := 'eobtzcwinjmimzisypca';
  v_forbidden_prod_ref   CONSTANT text := 'zdasktnbdjkjtoncojsy';
  v_forbidden_old_prod_ref CONSTANT text := 'ajumkjokagqfdikfguti';
  v_forbidden_legacy_ref CONSTANT text := 'gmyrehlrmifxckszrdje';

  v_current_user  text := current_user;
  v_session_user  text := session_user;
  v_setting_ref   text;
  v_missing_shows int;
  v_missing_mods  int;
BEGIN
  -- Guard 1: Detect production or legacy ref in database role or session user
  IF v_session_user ~* v_forbidden_prod_ref OR v_current_user ~* v_forbidden_prod_ref THEN
    RAISE EXCEPTION 'CRITICAL SECURITY BLOCK: Execution on PRODUCTION project ref (%) is strictly forbidden! (session_user: %)',
      v_forbidden_prod_ref, v_session_user;
  END IF;

  IF v_session_user ~* v_forbidden_old_prod_ref OR v_current_user ~* v_forbidden_old_prod_ref THEN
    RAISE EXCEPTION 'CRITICAL SECURITY BLOCK: Execution on the retired production project ref (%) is strictly forbidden! (session_user: %)',
      v_forbidden_old_prod_ref, v_session_user;
  END IF;

  IF v_session_user ~* v_forbidden_legacy_ref OR v_current_user ~* v_forbidden_legacy_ref THEN
    RAISE EXCEPTION 'CRITICAL SECURITY BLOCK: Execution on deleted legacy project ref (%) is strictly forbidden! (session_user: %)',
      v_forbidden_legacy_ref, v_session_user;
  END IF;

  -- Guard 2: Detect production or legacy ref in session configuration parameters
  v_setting_ref := NULLIF(current_setting('vrooma.project_ref', true), '');
  IF v_setting_ref IS NULL THEN
    v_setting_ref := NULLIF(current_setting('app.settings.project_ref', true), '');
  END IF;

  IF v_setting_ref IS NOT NULL THEN
    IF v_setting_ref = v_forbidden_prod_ref THEN
      RAISE EXCEPTION 'CRITICAL SECURITY BLOCK: Parameter vrooma.project_ref is set to PRODUCTION (%)!', v_forbidden_prod_ref;
    END IF;
    IF v_setting_ref = v_forbidden_legacy_ref THEN
      RAISE EXCEPTION 'CRITICAL SECURITY BLOCK: Parameter vrooma.project_ref is set to LEGACY (%)!', v_forbidden_legacy_ref;
    END IF;
    IF v_setting_ref <> v_expected_dev_ref THEN
      RAISE EXCEPTION 'CRITICAL SECURITY BLOCK: Invalid project ref parameter (%). Expected DEV ref: %',
        v_setting_ref, v_expected_dev_ref;
    END IF;
  END IF;

  -- Guard 3: In pooled connections (postgres.<project-ref>), verify matching DEV ref
  IF v_session_user ~ '^postgres\.' THEN
    IF NOT (v_session_user ~ v_expected_dev_ref) THEN
      RAISE EXCEPTION 'CRITICAL SECURITY BLOCK: Connected pooler user (%) does not match DEV project ref (%)!',
        v_session_user, v_expected_dev_ref;
    END IF;
  END IF;

  -- Guard 4: Catalog prerequisite check (showrooms & models must exist)
  SELECT count(*) INTO v_missing_shows
  FROM (
    VALUES
      ('a0000001-0000-0000-0000-000000000001'::uuid), -- Hazratganj
      ('a0000001-0000-0000-0000-000000000002'::uuid), -- Gomti Nagar
      ('a0000001-0000-0000-0000-000000000003'::uuid)  -- Kanpur City Center
  ) AS req(id)
  LEFT JOIN public.showrooms s ON s.id = req.id
  WHERE s.id IS NULL;

  IF v_missing_shows > 0 THEN
    RAISE EXCEPTION 'PREREQUISITE CHECK FAILED: % required showroom(s) are missing. Run seed.sql Sections 1-2 first.', v_missing_shows;
  END IF;

  SELECT count(*) INTO v_missing_mods
  FROM (
    VALUES
      ('d0000001-0000-0000-0000-000000000001'::uuid), -- Model H
      ('d0000001-0000-0000-0000-000000000002'::uuid)  -- Model C
  ) AS req(id)
  LEFT JOIN public.models m ON m.id = req.id
  WHERE m.id IS NULL;

  IF v_missing_mods > 0 THEN
    RAISE EXCEPTION 'PREREQUISITE CHECK FAILED: % required model(s) are missing. Run seed.sql Section 3 first.', v_missing_mods;
  END IF;

  RAISE NOTICE 'Pre-flight checks PASSED. Target DEV project ref confirmed: %', v_expected_dev_ref;
END $$;

-- =============================================================================
-- 2. SEED ASSIGNMENT RULES (IDEMPOTENT VIA ON CONFLICT DO UPDATE)
-- =============================================================================
-- Rule 1: Hazratganj Flagship -> Model H (Priority 1)
-- Rule 2: Hazratganj Flagship -> Model C (Priority 1)
-- Rule 3: Gomti Nagar Experience Center -> Model H (Priority 1)
-- Rule 4: Kanpur City Center -> Catch-all (All Models, Priority 1)
-- =============================================================================
INSERT INTO public.assignment_rules (
  id,
  showroom_id,
  model_id,
  priority,
  is_active
) VALUES
  (
    '0000000c-0000-0000-0000-000000000001'::uuid,
    'a0000001-0000-0000-0000-000000000001'::uuid,
    'd0000001-0000-0000-0000-000000000001'::uuid,
    1,
    true
  ),
  (
    '0000000c-0000-0000-0000-000000000002'::uuid,
    'a0000001-0000-0000-0000-000000000001'::uuid,
    'd0000001-0000-0000-0000-000000000002'::uuid,
    1,
    true
  ),
  (
    '0000000c-0000-0000-0000-000000000003'::uuid,
    'a0000001-0000-0000-0000-000000000002'::uuid,
    'd0000001-0000-0000-0000-000000000001'::uuid,
    1,
    true
  ),
  (
    '0000000c-0000-0000-0000-000000000004'::uuid,
    'a0000001-0000-0000-0000-000000000003'::uuid,
    NULL,
    1,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  showroom_id = EXCLUDED.showroom_id,
  model_id    = EXCLUDED.model_id,
  priority    = EXCLUDED.priority,
  is_active   = EXCLUDED.is_active,
  updated_at  = NOW();

-- =============================================================================
-- 3. SEED CONSULTANT ASSIGNMENT POOLS (IDEMPOTENT JOIN RECORDS)
-- =============================================================================
-- Joins the 6 canonical DEV consultant personas to their respective rules:
--   Hazratganj Pool:
--     - 00000000-0000-0000-0000-000000000010 (dev-consultant@vrooma.in)   -> Rule 1 & 2
--     - 00000000-0000-0000-0000-000000000011 (rohit.verma@vrooma.in)      -> Rule 1 & 2
--     - 00000000-0000-0000-0000-000000000012 (ananya.shukla@vrooma.in)    -> Rule 1
--   Gomti Nagar Pool:
--     - 00000000-0000-0000-0000-000000000013 (faizan.khan@vrooma.in)      -> Rule 3
--     - 00000000-0000-0000-0000-000000000014 (deepak.tripathi@vrooma.in)  -> Rule 3
--   Kanpur City Center Pool:
--     - 00000000-0000-0000-0000-000000000015 (pooja.singh@vrooma.in)      -> Rule 4
--
-- Strict filtering:
--   1. Profile must exist in public.profiles.
--   2. Profile role must be strictly 'consultant'.
--   3. Profile must be active (is_active = true).
--   4. Profile must be mapped to the rule's showroom in public.staff_showrooms.
-- =============================================================================
DO $$
DECLARE
  v_inserted_count int := 0;
  v_skipped_count  int := 0;
  v_total_targets  int := 8;
BEGIN
  -- Perform guarded insertion
  WITH candidate_consultants AS (
    SELECT
      c.rule_id,
      c.consultant_id,
      r.showroom_id
    FROM (
      VALUES
        -- Rule 1: Hazratganj Flagship -> Model H
        ('0000000c-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000010'::uuid),
        ('0000000c-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000011'::uuid),
        ('0000000c-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000012'::uuid),
        -- Rule 2: Hazratganj Flagship -> Model C
        ('0000000c-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000010'::uuid),
        ('0000000c-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000011'::uuid),
        -- Rule 3: Gomti Nagar -> Model H
        ('0000000c-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000013'::uuid),
        ('0000000c-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000014'::uuid),
        -- Rule 4: Kanpur -> Catch-all
        ('0000000c-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000015'::uuid)
    ) AS c(rule_id, consultant_id)
    JOIN public.assignment_rules r ON r.id = c.rule_id
  ),
  inserted_rows AS (
    INSERT INTO public.assignment_rule_consultants (rule_id, consultant_id)
    SELECT
      cc.rule_id,
      cc.consultant_id
    FROM candidate_consultants cc
    JOIN public.profiles p
      ON p.id = cc.consultant_id
     AND p.role = 'consultant'
     AND p.is_active = true
    JOIN public.staff_showrooms ss
      ON ss.profile_id = p.id
     AND ss.showroom_id = cc.showroom_id
    ON CONFLICT (rule_id, consultant_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted_count FROM inserted_rows;

  -- Verify how many candidate records met all foreign key & role criteria
  SELECT count(*) INTO v_skipped_count
  FROM (
    VALUES
      ('0000000c-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000010'::uuid, 'a0000001-0000-0000-0000-000000000001'::uuid),
      ('0000000c-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000011'::uuid, 'a0000001-0000-0000-0000-000000000001'::uuid),
      ('0000000c-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000012'::uuid, 'a0000001-0000-0000-0000-000000000001'::uuid),
      ('0000000c-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000010'::uuid, 'a0000001-0000-0000-0000-000000000001'::uuid),
      ('0000000c-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000011'::uuid, 'a0000001-0000-0000-0000-000000000001'::uuid),
      ('0000000c-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000013'::uuid, 'a0000001-0000-0000-0000-000000000002'::uuid),
      ('0000000c-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000014'::uuid, 'a0000001-0000-0000-0000-000000000002'::uuid),
      ('0000000c-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000015'::uuid, 'a0000001-0000-0000-0000-000000000003'::uuid)
  ) AS t(rule_id, consultant_id, showroom_id)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.staff_showrooms ss ON ss.profile_id = p.id AND ss.showroom_id = t.showroom_id
    WHERE p.id = t.consultant_id
      AND p.role = 'consultant'
      AND p.is_active = true
  );

  IF v_skipped_count > 0 THEN
    RAISE NOTICE 'NOTICE: % of % consultant pool mapping(s) were deferred because corresponding profiles or staff_showrooms entries do not exist yet. Run scripts/seed-dev-users.ts first to activate full pools.',
      v_skipped_count, v_total_targets;
  ELSE
    RAISE NOTICE 'SUCCESS: All % consultant assignment mappings verified and active.', v_total_targets;
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- 4. VERIFICATION & AUDIT QUERIES (READ-ONLY)
-- =============================================================================

-- Query A: Routing rules overview with assigned showroom and model names
SELECT
  r.id AS rule_id,
  r.priority,
  r.is_active,
  s.name AS showroom_name,
  s.address AS showroom_address,
  COALESCE(m.name, 'ALL MODELS (Catch-all)') AS model_scope,
  count(c.consultant_id) AS consultant_pool_size
FROM public.assignment_rules r
JOIN public.showrooms s ON s.id = r.showroom_id
LEFT JOIN public.models m ON m.id = r.model_id
LEFT JOIN public.assignment_rule_consultants c ON c.rule_id = r.id
GROUP BY r.id, r.priority, r.is_active, s.name, s.address, m.name
ORDER BY s.name ASC, r.priority ASC, model_scope ASC;

-- Query B: Detailed consultant membership across rules
SELECT
  r.id AS rule_id,
  s.name AS showroom_name,
  COALESCE(m.name, 'ALL MODELS') AS model_scope,
  p.id AS consultant_id,
  p.email,
  p.full_name,
  p.role,
  p.is_active AS profile_active,
  ss.is_primary AS primary_showroom
FROM public.assignment_rules r
JOIN public.showrooms s ON s.id = r.showroom_id
LEFT JOIN public.models m ON m.id = r.model_id
JOIN public.assignment_rule_consultants arc ON arc.rule_id = r.id
JOIN public.profiles p ON p.id = arc.consultant_id
JOIN public.staff_showrooms ss ON ss.profile_id = p.id AND ss.showroom_id = r.showroom_id
ORDER BY s.name ASC, r.id ASC, p.full_name ASC;

-- Query C: Auto-assignment test probe (verifies least-loaded query against seed)
SELECT
  r.id AS matched_rule_id,
  s.name AS showroom_name,
  COALESCE(m.name, 'ALL') AS model_name,
  p.id AS consultant_id,
  p.full_name AS consultant_name,
  p.email AS consultant_email,
  COALESCE(loads.active_load, 0) AS simulated_active_load
FROM public.assignment_rules r
JOIN public.assignment_rule_consultants c ON r.id = c.rule_id
JOIN public.profiles p ON c.consultant_id = p.id
JOIN public.staff_showrooms ss ON ss.profile_id = p.id AND ss.showroom_id = r.showroom_id
JOIN public.showrooms s ON s.id = r.showroom_id
LEFT JOIN public.models m ON m.id = r.model_id
LEFT JOIN public.consultant_availability a ON a.profile_id = p.id
LEFT JOIN (
  SELECT assigned_to, count(*) AS active_load
  FROM public.leads
  WHERE status IN ('new', 'contacted', 'test_drive_booked', 'negotiating')
  GROUP BY assigned_to
) loads ON loads.assigned_to = c.consultant_id
WHERE r.is_active = true
  AND p.is_active = true
  AND (a.is_available IS NULL OR (a.is_available = true AND (a.until IS NULL OR a.until > NOW())))
ORDER BY r.showroom_id, r.priority, COALESCE(loads.active_load, 0) ASC, p.created_at ASC;

