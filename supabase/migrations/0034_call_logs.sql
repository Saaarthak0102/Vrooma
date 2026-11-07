-- 0034_call_logs.sql
-- Service-desk phone calls, so the brief's "unanswered service calls" metric (20% -> under 5%) can be measured.
-- Rows arrive from a telephony vendor webhook (/api/webhooks/calls, service role) or from staff typing a call in.
-- Callers are stored pseudonymously: a masked number for display and a salted SHA-256 for repeat-caller counting.

BEGIN;


DO $$ BEGIN
  CREATE TYPE call_outcome AS ENUM ('answered', 'missed', 'voicemail');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID REFERENCES public.workshops(id) ON DELETE SET NULL,
  direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  outcome call_outcome NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'webhook')),
  /** Vendor call id; unique per source so a retried webhook cannot double count. */
  external_id TEXT,
  caller_masked TEXT,
  caller_hash TEXT,
  handled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  duration_seconds INT CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_call_logs_external ON public.call_logs(source, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_call_logs_started ON public.call_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_workshop ON public.call_logs(workshop_id, started_at DESC);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read call logs" ON public.call_logs;
CREATE POLICY "Staff read call logs" ON public.call_logs FOR SELECT TO authenticated USING (private.is_staff());

-- Staff may log their own calls; they cannot edit or delete history. Webhook rows use the service role (bypasses RLS).
DROP POLICY IF EXISTS "Staff log own calls" ON public.call_logs;
CREATE POLICY "Staff log own calls" ON public.call_logs FOR INSERT TO authenticated
  WITH CHECK (private.is_staff() AND source = 'manual' AND handled_by = auth.uid());

DROP POLICY IF EXISTS "Admin manage call logs" ON public.call_logs;
CREATE POLICY "Admin manage call logs" ON public.call_logs FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

REVOKE ALL ON public.call_logs FROM anon;

-- Unanswered rate for a period. Unanswered = missed or went to voicemail. Inbound calls only.
CREATE OR REPLACE FUNCTION public.get_call_metrics(
  p_from TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
  p_to TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  v_total INT;
  v_answered INT;
  v_unanswered INT;
BEGIN
  IF NOT private.is_staff() THEN
    RAISE EXCEPTION 'Permission denied: Only dealership staff can access call metrics' USING ERRCODE = 'VR005';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE outcome = 'answered'),
         count(*) FILTER (WHERE outcome IN ('missed', 'voicemail'))
  INTO v_total, v_answered, v_unanswered
  FROM public.call_logs
  WHERE direction = 'inbound' AND started_at BETWEEN p_from AND p_to;

  RETURN jsonb_build_object(
    'total_calls', v_total,
    'answered', v_answered,
    'unanswered', v_unanswered,
    'unanswered_pct', CASE WHEN v_total = 0 THEN NULL ELSE pg_catalog.round(v_unanswered::numeric / v_total::numeric * 100.0, 2) END
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.get_call_metrics(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_call_metrics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;

COMMIT;
