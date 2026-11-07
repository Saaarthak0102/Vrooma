-- 0028_support_chat_handoff.sql
-- Support chat: AI bot first, then (on request) a live handoff to the buyer's assigned consultant.
-- Guests can now chat too (guest_token). Writes go through the API (service role); staff read via RLS.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Conversations: status, lead link, assignee, AI context, guest identity
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_conversations
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'bot'
    CHECK (status IN ('bot', 'waiting', 'live', 'resolved')),
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guest_token UUID,
  ADD COLUMN IF NOT EXISTS ai_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS handoff_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_staff_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by TEXT CHECK (resolved_by IN ('buyer', 'consultant'));

-- A conversation belongs to a signed-in buyer or to a guest token, never neither.
ALTER TABLE public.chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_owner_chk;
ALTER TABLE public.chat_conversations
  ADD CONSTRAINT chat_conversations_owner_chk CHECK (user_id IS NOT NULL OR guest_token IS NOT NULL);

CREATE INDEX IF NOT EXISTS chat_conversations_staff_idx
  ON public.chat_conversations (status, assigned_to, last_message_at DESC);
CREATE INDEX IF NOT EXISTS chat_conversations_lead_idx
  ON public.chat_conversations (lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS chat_conversations_guest_idx
  ON public.chat_conversations (guest_token) WHERE guest_token IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Messages: bot / consultant / system senders
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_role_check;
-- Existing rows use 'user' / 'assistant'; keep them valid and add the new roles.
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_role_check
  CHECK (role IN ('user', 'assistant', 'consultant', 'system'));

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 3. RLS: staff read the chats they own (consultant) or all of them (manager, admin)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff read assigned chat conversations" ON public.chat_conversations;
CREATE POLICY "Staff read assigned chat conversations" ON public.chat_conversations
  FOR SELECT TO authenticated USING (
    private.is_staff()
    AND (
      assigned_to = (SELECT auth.uid())
      OR private.is_manager()
      OR private.is_admin()
    )
  );

DROP POLICY IF EXISTS "Staff read assigned chat messages" ON public.chat_messages;
CREATE POLICY "Staff read assigned chat messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (
    private.is_staff()
    AND EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND (
          c.assigned_to = (SELECT auth.uid())
          OR private.is_manager()
          OR private.is_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Realtime: both sides see new messages and status changes live
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

COMMIT;
