-- 0003_geo_catalog.sql
-- Phase 2 Database: Geographic Facilities, Showroom Closures, Vehicle Models & Variants

BEGIN;

-- 1. Cities Table
CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_cities_updated_at ON public.cities;
CREATE TRIGGER trg_cities_updated_at
  BEFORE UPDATE ON public.cities
  FOR EACH ROW EXECUTE PROCEDURE private.touch_updated_at();

-- 2. Operating Hours JSONB Validation Function
CREATE OR REPLACE FUNCTION private.validate_hours(hours JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  IF jsonb_typeof(hours) != 'object' THEN
    RETURN FALSE;
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Showrooms Table
CREATE TABLE IF NOT EXISTS public.showrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  hours JSONB NOT NULL DEFAULT '{"Mon - Sat": "09:30 AM - 08:00 PM"}'::jsonb CHECK (private.validate_hours(hours)),
  lat NUMERIC(9,6),
  lng NUMERIC(9,6),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_showrooms_city ON public.showrooms(city_id);

DROP TRIGGER IF EXISTS trg_showrooms_updated_at ON public.showrooms;
CREATE TRIGGER trg_showrooms_updated_at
  BEFORE UPDATE ON public.showrooms
  FOR EACH ROW EXECUTE PROCEDURE private.touch_updated_at();

-- Add deferred foreign keys from profiles & staff_showrooms to cities & showrooms
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT fk_profiles_city FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT fk_profiles_pref_showroom FOREIGN KEY (preferred_showroom_id) REFERENCES public.showrooms(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.staff_showrooms
    ADD CONSTRAINT fk_staff_showrooms_showroom FOREIGN KEY (showroom_id) REFERENCES public.showrooms(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Workshops Table
CREATE TABLE IF NOT EXISTS public.workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  bays INT NOT NULL DEFAULT 8 CHECK (bays > 0),
  hours JSONB NOT NULL DEFAULT '{"Mon - Sat": "08:30 AM - 07:00 PM"}'::jsonb CHECK (private.validate_hours(hours)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workshops_city ON public.workshops(city_id);

DROP TRIGGER IF EXISTS trg_workshops_updated_at ON public.workshops;
CREATE TRIGGER trg_workshops_updated_at
  BEFORE UPDATE ON public.workshops
  FOR EACH ROW EXECUTE PROCEDURE private.touch_updated_at();

-- 5. Showroom & Workshop Closures (Holidays / Maintenance)
CREATE TABLE IF NOT EXISTS public.showroom_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_type TEXT NOT NULL CHECK (facility_type IN ('showroom', 'workshop')),
  facility_id UUID NOT NULL,
  closed_date DATE NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (facility_type, facility_id, closed_date)
);

CREATE INDEX IF NOT EXISTS idx_closures_facility ON public.showroom_closures(facility_type, facility_id, closed_date);

-- 6. Models Table
CREATE TABLE IF NOT EXISTS public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  body_type body_type NOT NULL,
  tagline TEXT NOT NULL,
  tagline_hi TEXT,
  hero_image TEXT NOT NULL,
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_models_body_type ON public.models(body_type);
CREATE INDEX IF NOT EXISTS idx_models_active ON public.models(is_active);

DROP TRIGGER IF EXISTS trg_models_updated_at ON public.models;
CREATE TRIGGER trg_models_updated_at
  BEFORE UPDATE ON public.models
  FOR EACH ROW EXECUTE PROCEDURE private.touch_updated_at();

-- 7. Variants Table
CREATE TABLE IF NOT EXISTS public.variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fuel fuel_type NOT NULL,
  transmission transmission_type NOT NULL,
  ex_showroom INT NOT NULL CHECK (ex_showroom > 0),
  specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variants_model ON public.variants(model_id);
CREATE INDEX IF NOT EXISTS idx_variants_fuel_trans ON public.variants(fuel, transmission);

DROP TRIGGER IF EXISTS trg_variants_updated_at ON public.variants;
CREATE TRIGGER trg_variants_updated_at
  BEFORE UPDATE ON public.variants
  FOR EACH ROW EXECUTE PROCEDURE private.touch_updated_at();

-- 8. Variant Colors Table
CREATE TABLE IF NOT EXISTS public.variant_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.variants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variant_colors_variant ON public.variant_colors(variant_id);

COMMIT;

