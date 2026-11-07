-- 0029_chat_assigned_to_profiles.sql
-- Forward fix for 0028: chat_conversations.assigned_to referenced auth.users, which PostgREST cannot embed,
-- so the consultant's name could not be read with the conversation. Point it (and the message sender) at
-- public.profiles like leads.assigned_to does. profiles.id is itself a foreign key to auth.users.

BEGIN;

ALTER TABLE public.chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_assigned_to_fkey;
ALTER TABLE public.chat_conversations
  ADD CONSTRAINT chat_conversations_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMIT;
