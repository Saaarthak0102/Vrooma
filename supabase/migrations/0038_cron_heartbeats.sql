-- 0038_cron_heartbeats.sql
-- pg_cron marks an HTTP job "succeeded" once pg_net has sent the request, even if the app answers 401/404
-- (wrong CRON_SECRET, wrong app_url, Vercel deployment protection). Each HTTP cron route now records a heartbeat
-- when an authorised call actually reaches it, so "the app is not receiving this job" is visible on the admin
-- System page and in `pnpm check:cron`. Service role only: RLS is on with no policies.

BEGIN;

CREATE TABLE IF NOT EXISTS public.cron_heartbeats (
  job TEXT PRIMARY KEY,
  last_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cron_heartbeats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cron_heartbeats FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cron_heartbeats TO service_role;

COMMIT;
