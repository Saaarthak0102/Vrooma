-- 0039_owner_garage.sql
-- Owner "garage" and service history (AI plan P4). Lets the platform know which cars a buyer owns, when each is next
-- due for service, and when insurance / PUC / warranty end, so service-due and expiry reminders can be sent.
--
-- DPDP: a registration number is personal data. Rows are owner-only (RLS) plus staff read; they are included in the
-- data export, and erased when the account is anonymised (trigger below). Reminders are only sent to owners who
-- ticked the unticked-by-default `service_contact` consent (checked in the automation, see src/server/automations).

BEGIN;

CREATE TABLE IF NOT EXISTS public.owner_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reg_no_private TEXT NOT NULL CHECK (char_length(reg_no_private) BETWEEN 6 AND 14),
  reg_masked TEXT NOT NULL,
  model_name TEXT NOT NULL CHECK (char_length(model_name) BETWEEN 1 AND 80),
  variant_name TEXT CHECK (variant_name IS NULL OR char_length(variant_name) <= 80),
  purchase_date DATE,
  bought_from_vrooma BOOLEAN NOT NULL DEFAULT false,
  odometer_km INT CHECK (odometer_km IS NULL OR odometer_km BETWEEN 0 AND 999999),
  insurance_expiry DATE,
  puc_expiry DATE,
  warranty_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_owner_vehicles_reg ON public.owner_vehicles(user_id, reg_no_private);
CREATE INDEX IF NOT EXISTS idx_owner_vehicles_insurance ON public.owner_vehicles(insurance_expiry) WHERE insurance_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_owner_vehicles_puc ON public.owner_vehicles(puc_expiry) WHERE puc_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_owner_vehicles_warranty ON public.owner_vehicles(warranty_end) WHERE warranty_end IS NOT NULL;

DROP TRIGGER IF EXISTS trg_owner_vehicles_updated_at ON public.owner_vehicles;
CREATE TRIGGER trg_owner_vehicles_updated_at BEFORE UPDATE ON public.owner_vehicles
  FOR EACH ROW EXECUTE PROCEDURE private.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.owner_vehicles(id) ON DELETE CASCADE,
  booking_id UUID UNIQUE REFERENCES public.bookings(id) ON DELETE SET NULL,
  serviced_on DATE NOT NULL,
  odometer_km INT NOT NULL CHECK (odometer_km BETWEEN 0 AND 999999),
  summary TEXT CHECK (summary IS NULL OR char_length(summary) <= 300),
  next_due_on DATE,
  next_due_km INT CHECK (next_due_km IS NULL OR next_due_km BETWEEN 0 AND 999999),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_records_vehicle ON public.service_records(vehicle_id, serviced_on DESC);
CREATE INDEX IF NOT EXISTS idx_service_records_due ON public.service_records(next_due_on) WHERE next_due_on IS NOT NULL;

ALTER TABLE public.owner_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage own vehicles" ON public.owner_vehicles;
CREATE POLICY "Owners manage own vehicles" ON public.owner_vehicles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff read vehicles" ON public.owner_vehicles;
CREATE POLICY "Staff read vehicles" ON public.owner_vehicles FOR SELECT TO authenticated
  USING (private.is_staff());

-- Service records are written by staff through the server (service role bypasses RLS); owners may read their own.
DROP POLICY IF EXISTS "Owners read own service records" ON public.service_records;
CREATE POLICY "Owners read own service records" ON public.service_records FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.owner_vehicles v WHERE v.id = vehicle_id AND v.user_id = auth.uid()));

DROP POLICY IF EXISTS "Staff read service records" ON public.service_records;
CREATE POLICY "Staff read service records" ON public.service_records FOR SELECT TO authenticated
  USING (private.is_staff());

-- Account erasure (private.anonymise_user) keeps the profile row, so cascade alone would leave the garage behind.
CREATE OR REPLACE FUNCTION private.erase_garage_on_anonymise()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.owner_vehicles WHERE user_id = NEW.id; -- service_records cascade
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_profiles_erase_garage ON public.profiles;
CREATE TRIGGER trg_profiles_erase_garage
  AFTER UPDATE OF anonymised_at ON public.profiles
  FOR EACH ROW
  WHEN (OLD.anonymised_at IS NULL AND NEW.anonymised_at IS NOT NULL)
  EXECUTE FUNCTION private.erase_garage_on_anonymise();

COMMIT;
