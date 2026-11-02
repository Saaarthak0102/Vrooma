-- 0002_catalog_and_pricing.sql

CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  body_type TEXT NOT NULL,
  tagline TEXT NOT NULL,
  hero_image TEXT NOT NULL,
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fuel fuel_type NOT NULL,
  transmission transmission_type NOT NULL,
  ex_showroom INT NOT NULL, -- Integer rupees
  specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS variant_colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  model_id UUID REFERENCES models(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES variants(id) ON DELETE SET NULL,
  fuel fuel_type,
  road_tax_pct NUMERIC(5,2) NOT NULL,
  registration INT NOT NULL,
  insurance INT NOT NULL,
  handling INT NOT NULL,
  accessories INT NOT NULL,
  tcs_pct NUMERIC(4,2),
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_price_rule_target CHECK (model_id IS NOT NULL OR variant_id IS NOT NULL OR city_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_price_rules_city_validity ON price_rules(city_id, valid_from, valid_until);
