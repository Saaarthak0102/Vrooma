-- 0006_slots_bookings.sql
-- Phase 2 Database: Booking Slots, Appointments & Idempotency Store

BEGIN;

-- 1. Demo Cars Table (Test drive fleet)
CREATE TABLE IF NOT EXISTS public.demo_cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showroom_id UUID NOT NULL REFERENCES public.showrooms(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.variants(id) ON DELETE CASCADE,
  reg_label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_cars_showroom ON public.demo_cars(showroom_id);

DROP TRIGGER IF EXISTS trg_demo_cars_updated_at ON public.demo_cars;
CREATE TRIGGER trg_demo_cars_updated_at
  BEFORE UPDATE ON public.demo_cars
  FOR EACH ROW EXECUTE PROCEDURE private.touch_updated_at();

-- 2. Service Types Table
CREATE TABLE IF NOT EXISTS public.service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  duration_min INT NOT NULL DEFAULT 60 CHECK (duration_min > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Capacity & Time Slots Table
CREATE TABLE IF NOT EXISTS public.slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind booking_kind_type NOT NULL,
  showroom_id UUID REFERENCES public.showrooms(id) ON DELETE CASCADE,
  workshop_id UUID REFERENCES public.workshops(id) ON DELETE CASCADE,
  demo_car_id UUID REFERENCES public.demo_cars(id) ON DELETE CASCADE,
  resource_id UUID GENERATED ALWAYS AS (COALESCE(demo_car_id, workshop_id, showroom_id)) STORED,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  capacity INT NOT NULL DEFAULT 1 CHECK (capacity >= 1),
  booked_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_slot_times CHECK (ends_at > starts_at),
  CONSTRAINT chk_slot_capacity CHECK (booked_count >= 0 AND booked_count <= capacity),
  CONSTRAINT uq_slot_resource_time UNIQUE (kind, resource_id, starts_at)
);

CREATE INDEX IF NOT EXISTS idx_slots_query ON public.slots(kind, starts_at, is_active);
CREATE INDEX IF NOT EXISTS idx_slots_showroom ON public.slots(showroom_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_slots_workshop ON public.slots(workshop_id, starts_at);

-- 4. Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  slot_id UUID NOT NULL REFERENCES public.slots(id) ON DELETE RESTRICT,
  kind booking_kind_type NOT NULL,
  status booking_status_type NOT NULL DEFAULT 'confirmed',
  vehicle_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE SET NULL,
  notes TEXT,
  consent_id UUID REFERENCES public.consents(id) ON DELETE SET NULL,
  lead_id UUID,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  rescheduled_from UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Buyer cannot hold duplicate confirmed bookings for the same slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_user_slot_active
  ON public.bookings(user_id, slot_id)
  WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON public.bookings(slot_id);

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE PROCEDURE private.touch_updated_at();

-- 5. Idempotency Key Store (24-hour TTL)
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  user_id UUID NOT NULL,
  key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_created ON public.idempotency_keys(created_at);

COMMIT;

