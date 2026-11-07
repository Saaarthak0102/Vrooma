-- 0036_leads_ai_profile.sql
-- Lead copilot (AI P1): the AI buyer profile (urgency, budget, timeline, fuel, finance and trade-in interest,
-- suggested next action) is kept on the lead so the desk, filters and the later Lead Desk Agent can use it, and
-- so a summary is only regenerated when the lead has actually changed.
--
--   ai_profile       structured profile, see src/server/ai/lead-copilot.ts (LeadAiProfile)
--   ai_input_hash    SHA-256 of the facts the last AI summary was built from (never the text itself)
--   ai_generated_at  when the last AI (not rule-based) summary was written; throttles regeneration

BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ai_profile JSONB,
  ADD COLUMN IF NOT EXISTS ai_input_hash TEXT,
  ADD COLUMN IF NOT EXISTS ai_generated_at TIMESTAMPTZ;

COMMIT;
