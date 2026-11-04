-- 0010_auth_profiles.sql
-- Phase 1 Auth: Profile attributes, onboarding completion, DPDP consents, and auth triggers

-- 1. Extend profiles table with required auth and onboarding columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Index on email and role
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 2. Role helper functions
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS role_type AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('consultant', 'manager', 'admin') AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Automatic user provisioning trigger on auth.users insert
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
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'locale', 'en'),
    'buyer', -- NEVER copy role from user metadata
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN public.profiles.full_name = '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Atomic profile completion + DPDP consent RPC
CREATE OR REPLACE FUNCTION public.complete_profile(
  p_full_name TEXT,
  p_phone TEXT,
  p_whatsapp TEXT,
  p_city_id UUID,
  p_locale TEXT,
  p_address TEXT DEFAULT NULL,
  p_pincode TEXT DEFAULT NULL,
  p_marketing_consent BOOLEAN DEFAULT FALSE,
  p_policy_version TEXT DEFAULT '2026.1'
)
RETURNS public.profiles AS $$
DECLARE
  v_user_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_profile public.profiles;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update or insert profile
  UPDATE public.profiles
  SET
    full_name = p_full_name,
    phone = p_phone,
    whatsapp = COALESCE(p_whatsapp, p_phone),
    city_id = p_city_id,
    locale = COALESCE(p_locale, 'en'),
    address = p_address,
    pincode = p_pincode,
    onboarding_completed_at = v_now,
    updated_at = v_now
  WHERE id = v_user_id
  RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      phone,
      whatsapp,
      city_id,
      locale,
      address,
      pincode,
      role,
      is_active,
      onboarding_completed_at,
      updated_at
    )
    VALUES (
      v_user_id,
      (SELECT email FROM auth.users WHERE id = v_user_id),
      p_full_name,
      p_phone,
      COALESCE(p_whatsapp, p_phone),
      p_city_id,
      COALESCE(p_locale, 'en'),
      p_address,
      p_pincode,
      'buyer',
      true,
      v_now,
      v_now
    )
    RETURNING * INTO v_profile;
  END IF;

  -- Insert atomic DPDP consent records
  INSERT INTO public.consents (user_id, purpose, granted, version, granted_at)
  VALUES
    (v_user_id, 'terms_and_privacy', true, p_policy_version, v_now),
    (v_user_id, 'service_communications', true, p_policy_version, v_now),
    (v_user_id, 'marketing_updates', COALESCE(p_marketing_consent, false), p_policy_version, v_now);

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS policies for profiles and consents
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Staff can view profiles" ON profiles;
CREATE POLICY "Staff can view profiles" ON profiles
  FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "Users can view their own consents" ON consents;
CREATE POLICY "Users can view their own consents" ON consents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own consents" ON consents;
CREATE POLICY "Users can insert their own consents" ON consents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

