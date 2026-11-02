-- 0004_booking_slots.sql

CREATE TABLE IF NOT EXISTS demo_cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  showroom_id UUID REFERENCES showrooms(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  reg_label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind booking_kind_type NOT NULL,
  showroom_id UUID REFERENCES showrooms(id) ON DELETE CASCADE,
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
  demo_car_id UUID REFERENCES demo_cars(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_slot_unique_booking UNIQUE (kind, COALESCE(demo_car_id, workshop_id), starts_at)
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- references auth.users
  slot_id UUID REFERENCES slots(id) ON DELETE RESTRICT,
  kind booking_kind_type NOT NULL,
  status booking_status_type NOT NULL DEFAULT 'confirmed',
  vehicle_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  consent_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
