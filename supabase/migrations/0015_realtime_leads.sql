-- 0015_realtime_leads.sql
-- Ensure public.leads is included in supabase_realtime publication for live inbox updates
-- and set REPLICA IDENTITY FULL so RLS filters UPDATE/DELETE events for subscribed consultants.

BEGIN;

ALTER TABLE public.leads REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'leads' AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
END $$;

COMMIT;
