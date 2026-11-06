# VROOMA — DATA MODEL & SCHEMA

## 1. Overview & Golden Rules

1. **Integer Rupees Convention:** All monetary amounts (`price_ex_showroom`, `rto`, `insurance`, `loan_amount`, etc.) are strictly stored as `BIGINT` representing integer Indian Rupees. Never decimals or floats.
2. **DPDP Compliance:** Registration numbers on `used_cars` are stored internally as full numbers, but queries for public use mask the string (e.g. `UP32 ** **** 1234`). User personal data requires an explicit `consent_given` timestamp and IP.
3. **Database Engine:** Supabase PostgreSQL with Row Level Security (RLS) enabled on all tables.

---

## 2. Enums

> Corrected to match the real migrations (`0001_extensions_schemas_enums.sql`). The authoritative schema is `supabase/migrations/`; `src/types/database.types.ts` is generated from it and `tests/types-match-schema.test.ts` keeps the hand-written `src/types/db.ts` in line.

```sql
CREATE TYPE role_type AS ENUM ('buyer', 'consultant', 'manager', 'admin');  -- 'manager' is also the Used-Car Manager
CREATE TYPE fuel_type AS ENUM ('petrol', 'diesel', 'cng', 'ev', 'hybrid');
CREATE TYPE transmission_type AS ENUM ('manual', 'automatic');
CREATE TYPE body_style AS ENUM ('hatchback', 'sedan', 'suv', 'mpv');
CREATE TYPE vehicle_condition AS ENUM ('fair', 'good', 'excellent');
CREATE TYPE lead_status_type AS ENUM ('new', 'contacted', 'test_drive_booked', 'negotiating', 'won', 'lost');
CREATE TYPE lead_source_type AS ENUM ('web', 'portal', 'social', 'walkin', 'chat', 'trade_in');
CREATE TYPE booking_type AS ENUM ('test_drive', 'service');
CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE used_car_status AS ENUM ('available', 'booked', 'sold');
```

---

## 3. Core Tables

### `models` & `variants`
```sql
CREATE TABLE models (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  body_style body_style NOT NULL,
  hero_image TEXT NOT NULL,
  gallery JSONB NOT NULL DEFAULT '[]',
  price_range_min BIGINT NOT NULL,
  price_range_max BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE variants (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  fuel_type fuel_type NOT NULL,
  transmission transmission_type NOT NULL,
  engine_cc INT NOT NULL,
  mileage_kmpl NUMERIC(4, 1) NOT NULL,
  price_ex_showroom BIGINT NOT NULL,
  colors JSONB NOT NULL DEFAULT '[]',
  specs JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `price_rules`
```sql
CREATE TABLE price_rules (
  id TEXT PRIMARY KEY,
  city_slug TEXT NOT NULL,
  city_name TEXT NOT NULL,
  rto_percentage NUMERIC(5, 2) NOT NULL, -- e.g. 10.00%
  rto_flat_charge BIGINT NOT NULL DEFAULT 12000,
  insurance_base_rate NUMERIC(5, 2) NOT NULL,
  fastag_charge BIGINT NOT NULL DEFAULT 500,
  handling_charge BIGINT NOT NULL DEFAULT 8500,
  default_accessories_price BIGINT NOT NULL DEFAULT 15000,
  tcs_threshold BIGINT NOT NULL DEFAULT 1000000, -- 1% on > ₹10L
  tcs_percentage NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
  valid_until DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `used_cars`
```sql
CREATE TABLE used_cars (
  id TEXT PRIMARY KEY,
  stock_id TEXT UNIQUE NOT NULL, -- e.g. 'UC-1182'
  model_id TEXT NOT NULL REFERENCES models(id),
  variant_name TEXT NOT NULL,
  year INT NOT NULL,
  km INT NOT NULL,
  fuel_type fuel_type NOT NULL,
  transmission transmission_type NOT NULL,
  price BIGINT NOT NULL,
  owners_count INT NOT NULL,
  reg_no_masked TEXT NOT NULL, -- 'UP32 ** **** 1234'
  reg_no_full TEXT NOT NULL,
  status used_car_status NOT NULL DEFAULT 'available',
  inspection_score INT NOT NULL, -- out of 140
  inspection_report JSONB NOT NULL,
  photos JSONB NOT NULL DEFAULT '[]',
  suggested_price_min BIGINT,
  suggested_price_max BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `showrooms` & `slots`
```sql
CREATE TABLE showrooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'showroom', 'workshop', 'used_yard'
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  demo_cars JSONB NOT NULL DEFAULT '[]',
  bay_capacity INT NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE slots (
  id TEXT PRIMARY KEY,
  showroom_id TEXT NOT NULL REFERENCES showrooms(id),
  date DATE NOT NULL,
  time_slot TEXT NOT NULL, -- e.g. '10:00 - 11:00'
  capacity INT NOT NULL,
  booked_count INT NOT NULL DEFAULT 0,
  type booking_type NOT NULL
);
```

### `leads` & `bookings`
```sql
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source lead_source NOT NULL,
  model_id TEXT REFERENCES models(id),
  variant_id TEXT REFERENCES variants(id),
  used_car_id TEXT REFERENCES used_cars(id),
  showroom_id TEXT REFERENCES showrooms(id),
  assigned_to TEXT, -- user_id of sales consultant
  status lead_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sla_target_at TIMESTAMPTZ NOT NULL, -- created_at + 5 minutes
  contacted_at TIMESTAMPTZ,
  notes TEXT,
  ai_summary TEXT,
  consent_given BOOLEAN NOT NULL DEFAULT TRUE,
  consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  lead_id TEXT REFERENCES leads(id),
  type booking_type NOT NULL,
  showroom_id TEXT NOT NULL REFERENCES showrooms(id),
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  status booking_status NOT NULL DEFAULT 'confirmed',
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `ai_logs`
```sql
CREATE TABLE ai_logs (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  action_type TEXT NOT NULL, -- 'summary', 'reply_draft', 'price_estimate'
  prompt TEXT NOT NULL,
  raw_completion TEXT NOT NULL,
  edited_completion TEXT,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

