-- Support chat history for signed-in buyers. Shown on the buyer dashboard as "Support chats".
-- Guests can still chat, but nothing is stored for them.

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Support chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_conversations_user_idx
  ON public.chat_conversations (user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_conversation_idx
  ON public.chat_messages (conversation_id, created_at);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Buyers can read only their own chats. Writes go through the /api/chat route (service role).
DROP POLICY IF EXISTS "Buyers read own chat conversations" ON public.chat_conversations;
CREATE POLICY "Buyers read own chat conversations" ON public.chat_conversations
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Buyers read own chat messages" ON public.chat_messages;
CREATE POLICY "Buyers read own chat messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid()
    )
  );
