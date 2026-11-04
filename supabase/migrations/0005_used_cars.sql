-- 0005_used_cars.sql
-- Phase 2 Database: Certified Pre-Owned Inventory, Privacy Masking & Valuation History

BEGIN;

-- 1. Vehicle Registration Number Masking Function
CREATE OR REPLACE FUNCTION private.mask_reg_number(reg TEXT)
RETURNS TEXT AS $$
DECLARE
  clean TEXT;
  len INT;
BEGIN
  IF reg IS NULL OR reg = '' THEN
    RETURN '';
  END IF;

  clean := pg_catalog.regexp_replace(pg_catalog.upper(reg), '[^A-Z0-9]', '', 'g');
  len := pg_catalog.length(clean);

  IF len < 8 THEN
    RETURN clean;
  END IF;

  -- Example: UP32BC4120 -> UP32 ** **** 4120
  RETURN pg_catalog.substr(clean, 1, 4) || ' ** **** ' || pg_catalog.substr(clean, len - 3);
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = '';

-- 2. Used Cars Table
CREATE TABLE IF NOT EXISTS public.used_cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id TEXT UNIQUE NOT NULL,
  model_id UUID REFERENCES public.models(id) ON DELETE SET NULL,
  model_name TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  fuel fuel_type NOT NULL,
  year INT NOT NULL CHECK (year >= 2000 AND year <= 2100),
  km INT NOT NULL CHECK (km >= 0),
  owners INT NOT NULL DEFAULT 1 CHECK (owners >= 1),
  price INT NOT NULL CHECK (price > 0),
  status car_status_type NOT NULL DEFAULT 'available',
  reg_no_private TEXT NOT NULL,
  reg_no_masked TEXT GENERATED ALWAYS AS (private.mask_reg_number(reg_no_private)) STORED,
  showroom_id UUID REFERENCES public.showrooms(id) ON DELETE RESTRICT,
  certified BOOLEAN NOT NULL DEFAULT true,
  inspection JSONB NOT NULL DEFAULT '{}'::jsonb,
  inspection_score INT CHECK (inspection_score IS NULL OR (inspection_score >= 0 AND inspection_score <= 100)),
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  listed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_used_cars_status ON public.used_cars(status);
CREATE INDEX IF NOT EXISTS idx_used_cars_showroom ON public.used_cars(showroom_id);
CREATE INDEX IF NOT EXISTS idx_used_cars_model ON public.used_cars(model_id);
CREATE INDEX IF NOT EXISTS idx_used_cars_price ON public.used_cars(price);

DROP TRIGGER IF EXISTS trg_used_cars_updated_at ON public.used_cars;
CREATE TRIGGER trg_used_cars_updated_at
  BEFORE UPDATE ON public.used_cars
  FOR EACH ROW EXECUTE PROCEDURE private.touch_updated_at();

-- 3. Allowed Status Transition Trigger (available -> booked -> available|sold; sold is final)
CREATE OR REPLACE FUNCTION private.check_used_car_transition()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'sold' AND NEW.status != 'sold' THEN
    RAISE EXCEPTION 'A sold vehicle cannot be transitioned back to %', NEW.status USING ERRCODE = 'VR004';
  END IF;

  IF NEW.status = 'sold' AND OLD.status != 'sold' THEN
    NEW.sold_at := pg_catalog.now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_check_used_car_status ON public.used_cars;
CREATE TRIGGER trg_check_used_car_status
  BEFORE UPDATE OF status ON public.used_cars
  FOR EACH ROW EXECUTE PROCEDURE private.check_used_car_transition();

-- 4. Used Car Sales History (Historical valuation data for pricing intelligence)
CREATE TABLE IF NOT EXISTS public.used_car_sales_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  year INT NOT NULL,
  fuel fuel_type NOT NULL,
  km INT NOT NULL,
  sold_price INT NOT NULL CHECK (sold_price > 0),
  sold_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_history_model ON public.used_car_sales_history(model_name, year, fuel);

-- 5. AI Suggested Price Band (Manager / Admin visibility only)
CREATE TABLE IF NOT EXISTS public.used_car_price_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id TEXT NOT NULL REFERENCES public.used_cars(stock_id) ON DELETE CASCADE,
  suggested_min INT NOT NULL CHECK (suggested_min > 0),
  suggested_max INT NOT NULL CHECK (suggested_max >= suggested_min),
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1.0),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_suggestions_stock ON public.used_car_price_suggestions(stock_id);

-- 6. Privacy Column Grant Restrictions
-- Revoke direct selection of reg_no_private from client roles; read masked column only.
REVOKE SELECT ON public.used_cars FROM anon, authenticated;
GRANT SELECT (
  id,
  stock_id,
  model_id,
  model_name,
  variant_name,
  fuel,
  year,
  km,
  owners,
  price,
  status,
  reg_no_masked,
  showroom_id,
  certified,
  inspection,
  inspection_score,
  images,
  listed_at,
  sold_at,
  created_at,
  updated_at
) ON public.used_cars TO anon, authenticated;

COMMIT;
