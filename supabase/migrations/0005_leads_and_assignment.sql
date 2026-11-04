
-- 0005_leads_and_assignment.sql

-- 1. User profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY, -- references auth.users(id)
  full_name TEXT NOT NULL,
  phone TEXT,
  city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
  role role_type NOT NULL DEFAULT 'buyer',
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source lead_source_type NOT NULL DEFAULT 'web',
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  showroom_id UUID REFERENCES showrooms(id) ON DELETE RESTRICT,
  model_id UUID REFERENCES models(id) ON DELETE SET NULL,
  used_car_id UUID REFERENCES used_cars(id) ON DELETE SET NULL,
  message TEXT,
  status lead_status_type NOT NULL DEFAULT 'new',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sla_due_at TIMESTAMPTZ NOT NULL,
  first_contacted_at TIMESTAMPTZ,
  ai_summary TEXT,
  ai_draft TEXT,
  consent_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Deduplication index
-- Explicit UTC conversion makes the date expression IMMUTABLE.
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_dedupe
ON public.leads (
  phone,
  model_id,
  ((created_at AT TIME ZONE 'UTC')::date)
);

-- 4. Lead events
CREATE TABLE IF NOT EXISTS lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Assignment rules
CREATE TABLE IF NOT EXISTS assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showroom_id UUID REFERENCES showrooms(id) ON DELETE CASCADE,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  consultant_ids UUID[] NOT NULL DEFAULT '{}',
  priority INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
