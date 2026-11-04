-- 0007_leads_assignment.sql
-- Phase 2 Database: Inbound Leads, Event Timeline, Auto-Assignment Rules & Buyer Enquiries View

BEGIN;

-- 1. Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref TEXT UNIQUE NOT NULL,
  source lead_source_type NOT NULL DEFAULT 'web',
  source_ref TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL CHECK (phone ~ '^\+91[6-9][0-9]{9}$'),
  email CITEXT,
  showroom_id UUID NOT NULL REFERENCES public.showrooms(id) ON DELETE RESTRICT,
  model_id UUID REFERENCES public.models(id) ON DELETE SET NULL,
  used_car_id UUID REFERENCES public.used_cars(id) ON DELETE SET NULL,
  message TEXT,
  status lead_status_type NOT NULL DEFAULT 'new',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  sla_due_at TIMESTAMPTZ NOT NULL,
  first_contacted_at TIMESTAMPTZ,
  sla_breached_at TIMESTAMPTZ,
  status_changed_at TIMESTAMPTZ,
  lost_reason TEXT,
  consent_id UUID REFERENCES public.consents(id) ON DELETE SET NULL,
  ai_summary TEXT,
  ai_draft TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Portal lead deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_source_ref
  ON public.leads(source, source_ref)
  WHERE source_ref IS NOT NULL;

-- 24-hour enquiry deduplication index
CREATE INDEX IF NOT EXISTS idx_leads_phone_model_date
  ON public.leads(phone, model_id, (created_at::date));

CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_leads_showroom ON public.leads(showroom_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_sla ON public.leads(sla_due_at, first_contacted_at) WHERE status = 'new';

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE PROCEDURE private.touch_updated_at();

-- Link booking back to lead if present
DO $$ BEGIN
  ALTER TABLE public.bookings
    ADD CONSTRAINT fk_bookings_lead FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Append-Only Lead Events Audit Timeline
CREATE TABLE IF NOT EXISTS public.lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type lead_event_type NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON public.lead_events(lead_id, created_at DESC);

-- 3. Lead Routing & Auto-Assignment Rules
CREATE TABLE IF NOT EXISTS public.assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showroom_id UUID NOT NULL REFERENCES public.showrooms(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE,
  priority INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_rules_lookup ON public.assignment_rules(showroom_id, model_id, priority);

DROP TRIGGER IF EXISTS trg_assignment_rules_updated_at ON public.assignment_rules;
CREATE TRIGGER trg_assignment_rules_updated_at
  BEFORE UPDATE ON public.assignment_rules
  FOR EACH ROW EXECUTE PROCEDURE private.touch_updated_at();

-- 4. Assignment Rule Consultant Join Table (Replaces untyped uuid[] array)
CREATE TABLE IF NOT EXISTS public.assignment_rule_consultants (
  rule_id UUID NOT NULL REFERENCES public.assignment_rules(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (rule_id, consultant_id)
);

CREATE INDEX IF NOT EXISTS idx_arc_consultant ON public.assignment_rule_consultants(consultant_id);

-- 5. Buyer-Safe Enquiries View (Own enquiries only, masking internal notes & AI drafts)
CREATE OR REPLACE VIEW public.my_enquiries AS
SELECT
  l.id,
  l.ref,
  l.model_id,
  l.used_car_id,
  l.status,
  l.created_at,
  p.full_name AS consultant_display_name
FROM public.leads l
LEFT JOIN public.profiles p ON l.assigned_to = p.id
WHERE l.user_id = auth.uid();

COMMIT;

