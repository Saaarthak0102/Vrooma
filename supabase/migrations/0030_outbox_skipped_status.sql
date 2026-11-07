-- 0030_outbox_skipped_status.sql
-- Messages that cannot be delivered because no provider is connected (WhatsApp, SMS, or email without a key)
-- were being recorded as 'sent'. Add an honest terminal status for them.

BEGIN;

ALTER TYPE message_status_type ADD VALUE IF NOT EXISTS 'skipped';

COMMIT;
