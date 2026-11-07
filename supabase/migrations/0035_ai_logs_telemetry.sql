-- 0035_ai_logs_telemetry.sql
-- AI foundation (P0): every LLM call is audited with its feature, model, token use, outcome and the acting user,
-- so cost, latency, fallback rate and blocked outputs can be measured per feature. Existing rows keep working:
-- all new columns are nullable (or defaulted) and the legacy `action` column stays the audit key for reply drafts.
--
-- user_id is SET NULL on profile delete so erasure never leaves a pointer to a person; input_hash is a SHA-256 of
-- the model input (never the text) so identical inputs can be recognised and cached without storing PII twice.

BEGIN;

ALTER TABLE public.ai_logs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS feature TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS input_tokens INT CHECK (input_tokens IS NULL OR input_tokens >= 0),
  ADD COLUMN IF NOT EXISTS output_tokens INT CHECK (output_tokens IS NULL OR output_tokens >= 0),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS input_hash TEXT;

-- ok = model output used; fallback = rule-based path used (disabled, over budget, timeout, error);
-- blocked = model output rejected by a guard (discount word, ungrounded price, registration number, injection).
DO $$ BEGIN
  ALTER TABLE public.ai_logs
    ADD CONSTRAINT ai_logs_status_check CHECK (status IN ('ok', 'fallback', 'blocked', 'error'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_ai_logs_feature_created ON public.ai_logs(feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_lead_hash ON public.ai_logs(lead_id, input_hash) WHERE input_hash IS NOT NULL;

COMMIT;
