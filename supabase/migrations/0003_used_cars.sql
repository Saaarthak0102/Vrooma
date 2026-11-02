-- 0003_used_cars.sql

CREATE TABLE IF NOT EXISTS used_cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id TEXT UNIQUE NOT NULL,
  model_id UUID REFERENCES models(id) ON DELETE RESTRICT,
  variant_name TEXT NOT NULL,
  fuel fuel_type NOT NULL,
  year INT NOT NULL,
  km INT NOT NULL,
  owners INT NOT NULL DEFAULT 1,
  price INT NOT NULL, -- Integer rupees
  status car_status_type NOT NULL DEFAULT 'available',
  reg_no_private TEXT NOT NULL,
  reg_no_masked TEXT NOT NULL,
  showroom_id UUID REFERENCES showrooms(id) ON DELETE SET NULL,
  inspection JSONB NOT NULL DEFAULT '{}'::jsonb,
  certified BOOLEAN NOT NULL DEFAULT TRUE,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS used_car_sales_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID REFERENCES models(id) ON DELETE SET NULL,
  year INT NOT NULL,
  km INT NOT NULL,
  sold_price INT NOT NULL,
  sold_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS used_car_price_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  used_car_id UUID REFERENCES used_cars(id) ON DELETE CASCADE,
  low INT NOT NULL,
  high INT NOT NULL,
  rationale TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

