
-- 0004_booking_slots.sql

-- 1. Demo cars
CREATE TABLE IF NOT EXISTS demo_cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showroom_id UUID REFERENCES showrooms(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  reg_label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Booking slots
CREATE TABLE IF NOT EXISTS slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind booking_kind_type NOT NULL,
  showroom_id UUID REFERENCES showrooms(id) ON DELETE CASCADE,
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
  demo_car_id UUID REFERENCES demo_cars(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique expression index:
-- Prevents duplicate booking slots for the same kind,
-- demo car/workshop and start time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_slot_unique_booking
ON public.slots (
  kind,
  (COALESCE(demo_car_id, workshop_id)),
  starts_at
);

-- 3. Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
