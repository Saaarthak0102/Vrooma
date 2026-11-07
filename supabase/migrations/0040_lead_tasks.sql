-- 0040_lead_tasks.sql
-- Follow-up tasks on leads (AI plan P5). Created by the Lead Desk Agent when a consultant approves a suggestion, and
-- by the automations for stale leads, post-test-drive follow-ups and no-show rebooking. Shown in the lead drawer.
-- Writes go through the server (service role); consultants read only their own tasks, managers and admins all.

BEGIN;

CREATE TABLE IF NOT EXISTS public.lead_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('call_now', 'follow_up', 'post_drive', 'no_show', 'stale', 'escalate', 'custom')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  reason TEXT CHECK (reason IS NULL OR char_length(reason) <= 300),
  due_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'dismissed')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('agent', 'automation', 'manual')),
  idempotency_key TEXT UNIQUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  done_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead ON public.lead_tasks(lead_id, status);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_assignee ON public.lead_tasks(assigned_to, status, due_at) WHERE status = 'open';

ALTER TABLE public.lead_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read own or managed lead tasks" ON public.lead_tasks;
CREATE POLICY "Staff read own or managed lead tasks" ON public.lead_tasks FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR private.is_manager());

COMMIT;
