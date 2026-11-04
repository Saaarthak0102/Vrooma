-- 0008_messaging_audit_ops.sql
-- Phase 2 Database: Messaging Outbox, Audit Trail, Rate Limiter, AI Logs, Saved Items & CMS

BEGIN;

-- 1. Communication Outbox (WhatsApp / SMS / Email queue)
CREATE TABLE IF NOT EXISTS public.messages_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel message_channel_type NOT NULL,
  to_address TEXT NOT NULL,
  template TEXT NOT NULL,
  body TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  status message_status_type NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_queue ON public.messages_outbox(status, next_attempt_at) WHERE status = 'pending';

-- 2. Dealership Operations Audit Log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_table ON public.audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at DESC);

-- Generic Audit Trigger Function
CREATE OR REPLACE FUNCTION private.audit()
RETURNS trigger AS $$
DECLARE
  v_old JSONB := NULL;
  v_new JSONB := NULL;
  v_id TEXT := '';
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_id := COALESCE(OLD.id::text, '');
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_id := COALESCE(NEW.id::text, '');
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_id := COALESCE(NEW.id::text, '');
  END IF;

  INSERT INTO public.audit_log (table_name, record_id, action, old_values, new_values, actor_id)
  VALUES (TG_TABLE_NAME, v_id, TG_OP, v_old, v_new, auth.uid());

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit critical operational tables
DROP TRIGGER IF EXISTS trg_audit_price_rules ON public.price_rules;
CREATE TRIGGER trg_audit_price_rules
  AFTER INSERT OR UPDATE OR DELETE ON public.price_rules
  FOR EACH ROW EXECUTE PROCEDURE private.audit();

DROP TRIGGER IF EXISTS trg_audit_assignment_rules ON public.assignment_rules;
CREATE TRIGGER trg_audit_assignment_rules
  AFTER INSERT OR UPDATE OR DELETE ON public.assignment_rules
  FOR EACH ROW EXECUTE PROCEDURE private.audit();

DROP TRIGGER IF EXISTS trg_audit_models ON public.models;
CREATE TRIGGER trg_audit_models
  AFTER INSERT OR UPDATE OR DELETE ON public.models
  FOR EACH ROW EXECUTE PROCEDURE private.audit();

DROP TRIGGER IF EXISTS trg_audit_variants ON public.variants;
CREATE TRIGGER trg_audit_variants
  AFTER INSERT OR UPDATE OR DELETE ON public.variants
  FOR EACH ROW EXECUTE PROCEDURE private.audit();

-- 3. Distributed Rate Limiter
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

CREATE OR REPLACE FUNCTION private.hit_rate_limit(
  p_key TEXT,
  p_limit INT,
  p_window_seconds INT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_window TIMESTAMPTZ;
  v_count INT;
BEGIN
  v_window := to_timestamp(floor(extract(epoch from NOW()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.rate_limits (key, window_start, count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Newsletter Subscribers (DPDP compliant double-opt-in / withdrawal)
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  consent_id UUID REFERENCES public.consents(id) ON DELETE SET NULL,
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscribers(email);

-- 5. Bulk CSV Imports
CREATE TABLE IF NOT EXISTS public.csv_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  imported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rows_count INT NOT NULL DEFAULT 0,
  leads_created INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. AI Agent Transparency & Execution Logs
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  prompt TEXT,
  response TEXT,
  latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_lead ON public.ai_logs(lead_id);

-- 7. Saved Items (Buyer Shortlist - Disjoint foreign keys with check constraint)
CREATE TABLE IF NOT EXISTS public.saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE,
  used_car_id UUID REFERENCES public.used_cars(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_saved_item_target CHECK (
    (model_id IS NOT NULL AND used_car_id IS NULL) OR
    (model_id IS NULL AND used_car_id IS NOT NULL)
  ),
  CONSTRAINT uq_saved_user_model UNIQUE (user_id, model_id),
  CONSTRAINT uq_saved_user_used_car UNIQUE (user_id, used_car_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_user ON public.saved_items(user_id);

-- 8. Trade-In Valuation Requests
CREATE TABLE IF NOT EXISTS public.trade_in_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT NOT NULL CHECK (year >= 2000 AND year <= EXTRACT(YEAR FROM NOW()) + 1),
  km INT NOT NULL CHECK (km >= 0),
  condition TEXT NOT NULL,
  notes TEXT,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_in_user ON public.trade_in_requests(user_id);

-- 9. Showroom Offers Table (Multilingual)
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_hi TEXT,
  body TEXT NOT NULL,
  body_hi TEXT,
  model_id UUID REFERENCES public.models(id) ON DELETE SET NULL,
  badge TEXT,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_offers_dates CHECK (valid_until >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_offers_active ON public.offers(is_active, valid_until);

-- 10. Showcase Banners (Hero Banners)
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_hi TEXT,
  image_url TEXT NOT NULL,
  href TEXT NOT NULL,
  sort INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_sort ON public.banners(sort, is_active);

COMMIT;

