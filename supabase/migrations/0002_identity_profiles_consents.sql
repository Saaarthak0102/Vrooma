-- 0002_identity_profiles_consents.sql
-- Phase 2 Database: Profiles, Staff Showroom Membership, Consents, Views & Auth Triggers

BEGIN;

-- 1. Profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email CITEXT,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT CHECK (phone IS NULL OR phone ~ '^\+91[6-9][0-9]{9}$'),
  whatsapp TEXT CHECK (whatsapp IS NULL OR whatsapp ~ '^\+91[6-9][0-9]{9}$'),
  phone_verified_at TIMESTAMPTZ,
  city_id UUID,
  preferred_showroom_id UUID,
  locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'hi')),
  role role_type NOT NULL DEFAULT 'buyer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  address TEXT,
  pincode TEXT CHECK (pincode IS NULL OR pincode ~ '^[1-9][0-9]{5}$'),
  onboarding_completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  anonymised_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE private.touch_updated_at();

-- 2. Staff Showroom Membership (Consultant & Manager mapping)
CREATE TABLE IF NOT EXISTS public.staff_showrooms (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  showroom_id UUID NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, showroom_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_showrooms_showroom ON public.staff_showrooms(showroom_id);

-- 3. Consultant Availability (Roster / Leave status)
CREATE TABLE IF NOT EXISTS public.consultant_availability (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Append-Only Consents Table (DPDP Act 2023)
CREATE TABLE IF NOT EXISTS public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject_email CITEXT,
  subject_phone TEXT CHECK (subject_phone IS NULL OR subject_phone ~ '^\+91[6-9][0-9]{9}$'),
  purpose consent_purpose_type NOT NULL,
  granted BOOLEAN NOT NULL,
  policy_version TEXT NOT NULL DEFAULT '2026.1',
  text_hash TEXT,
  source consent_source_type NOT NULL DEFAULT 'signup',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consents_user ON public.consents(user_id, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consents_email ON public.consents(subject_email, purpose, created_at DESC) WHERE subject_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consents_phone ON public.consents(subject_phone, purpose, created_at DESC) WHERE subject_phone IS NOT NULL;

-- 5. Latest Consents View (per subject and purpose)
CREATE OR REPLACE VIEW public.current_consents AS
SELECT DISTINCT ON (COALESCE(user_id::text, subject_email::text, subject_phone), purpose)
  id,
  user_id,
  subject_email,
  subject_phone,
  purpose,
  granted,
  policy_version,
  source,
  created_at
FROM public.consents
ORDER BY COALESCE(user_id::text, subject_email::text, subject_phone), purpose, created_at DESC;

-- 6. Buyer-Safe Consultant Public View (No personal contact information)
CREATE OR REPLACE VIEW public.consultant_public AS
SELECT
  id,
  full_name AS display_name,
  role
FROM public.profiles
WHERE role IN ('consultant', 'manager')
  AND is_active = true
  AND deleted_at IS NULL;

-- 7. Internal Role & Membership Helper Functions
CREATE OR REPLACE FUNCTION private.current_role()
RETURNS public.role_type AS $$
  SELECT role FROM public.profiles
  WHERE id = auth.uid()
    AND is_active = true
    AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION private.is_staff()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('consultant', 'manager', 'admin')
      AND is_active = true
      AND deleted_at IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION private.is_manager()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('manager', 'admin')
      AND is_active = true
      AND deleted_at IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
      AND deleted_at IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION private.user_showrooms()
RETURNS TABLE (showroom_id UUID) AS $$
  SELECT showroom_id FROM public.staff_showrooms
  WHERE profile_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION private.current_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_role() TO authenticated, service_role;

REVOKE ALL ON FUNCTION private.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_staff() TO authenticated, service_role;

REVOKE ALL ON FUNCTION private.is_manager() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_manager() TO authenticated, service_role;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION private.user_showrooms() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.user_showrooms() TO authenticated, service_role;

-- 8. Trigger to Provision Minimal Profile on auth.users Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    locale,
    role,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'locale', 'en'),
    'buyer', -- NEVER copy role from user metadata
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN public.profiles.full_name = '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. Column-Level Permissions on Profiles (Prevent Self-Role Escalation)
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  full_name,
  phone,
  whatsapp,
  city_id,
  preferred_showroom_id,
  locale,
  address,
  pincode
) ON public.profiles TO authenticated;

COMMIT;
