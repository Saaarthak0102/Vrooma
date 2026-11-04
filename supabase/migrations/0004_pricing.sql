-- 0004_pricing.sql
-- Phase 2 Database: Price Rules with Exclusion Constraint & Resolution Logic

BEGIN;

CREATE TABLE IF NOT EXISTS public.price_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.variants(id) ON DELETE CASCADE,
  fuel fuel_type,
  scope_key TEXT GENERATED ALWAYS AS (
    COALESCE(variant_id::text, model_id::text || '_' || COALESCE(fuel::text, 'all'))
  ) STORED,
  road_tax_pct NUMERIC(5,2) NOT NULL CHECK (road_tax_pct >= 0 AND road_tax_pct <= 100),
  registration INT NOT NULL CHECK (registration >= 0),
  insurance INT NOT NULL CHECK (insurance >= 0),
  handling INT NOT NULL DEFAULT 0 CHECK (handling >= 0),
  accessories INT NOT NULL DEFAULT 0 CHECK (accessories >= 0),
  tcs_pct NUMERIC(5,2) NOT NULL DEFAULT 1.0 CHECK (tcs_pct >= 0 AND tcs_pct <= 100),
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_price_rules_dates CHECK (valid_until >= valid_from),
  CONSTRAINT exclude_overlapping_price_rules EXCLUDE USING gist (
    city_id WITH =,
    scope_key WITH =,
    daterange(valid_from, valid_until, '[]') WITH &&
  )
);

CREATE INDEX IF NOT EXISTS idx_price_rules_lookup ON public.price_rules(city_id, variant_id, model_id, valid_from, valid_until);

DROP TRIGGER IF EXISTS trg_price_rules_updated_at ON public.price_rules;
CREATE TRIGGER trg_price_rules_updated_at
  BEFORE UPDATE ON public.price_rules
  FOR EACH ROW EXECUTE PROCEDURE private.touch_updated_at();

-- Price Resolution Helper: Precedence (variant-specific > model+fuel > model)
CREATE OR REPLACE FUNCTION public.resolve_price_rule(
  p_city_id UUID,
  p_variant_id UUID DEFAULT NULL,
  p_model_id UUID DEFAULT NULL,
  p_fuel fuel_type DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS public.price_rules AS $$
DECLARE
  v_rule public.price_rules;
BEGIN
  -- 1. Variant-specific rule
  IF p_variant_id IS NOT NULL THEN
    SELECT * INTO v_rule
    FROM public.price_rules
    WHERE city_id = p_city_id
      AND variant_id = p_variant_id
      AND p_date >= valid_from AND p_date <= valid_until
    LIMIT 1;

    IF FOUND THEN
      RETURN v_rule;
    END IF;
  END IF;

  -- 2. Model + Fuel rule
  IF p_model_id IS NOT NULL AND p_fuel IS NOT NULL THEN
    SELECT * INTO v_rule
    FROM public.price_rules
    WHERE city_id = p_city_id
      AND model_id = p_model_id
      AND fuel = p_fuel
      AND variant_id IS NULL
      AND p_date >= valid_from AND p_date <= valid_until
    LIMIT 1;

    IF FOUND THEN
      RETURN v_rule;
    END IF;
  END IF;

  -- 3. Model general rule
  IF p_model_id IS NOT NULL THEN
    SELECT * INTO v_rule
    FROM public.price_rules
    WHERE city_id = p_city_id
      AND model_id = p_model_id
      AND variant_id IS NULL
      AND fuel IS NULL
      AND p_date >= valid_from AND p_date <= valid_until
    LIMIT 1;

    IF FOUND THEN
      RETURN v_rule;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMIT;

