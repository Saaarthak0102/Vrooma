/**
 * Statutory data retention thresholds under DPDP Act 2023.
 */
export const RETENTION_POLICIES = {
  LEAD_ANONYMIZATION_MONTHS: 24, // Closed leads older than 24 months scrubbed
  OUTBOX_PURGE_DAYS: 90,        // Sent or dead messages purged after 90 days
  IDEMPOTENCY_PURGE_DAYS: 7,    // Idempotency tokens purged after 7 days
  CALL_LOG_PURGE_DAYS: 365,     // Service-call logs kept 12 months
  CHAT_PURGE_DAYS: 365,         // Support chats with no new message for 12 months (buyers also erase them on account deletion)
  AI_LOG_PURGE_DAYS: 90,        // Model call records (redacted prompts and answers) kept 90 days
  AI_REPLY_AUDIT_PURGE_DAYS: 365, // Draft-versus-sent reply audit rows kept 12 months
  LEAD_TASK_PURGE_DAYS: 180,    // Finished or dismissed lead tasks kept 6 months
} as const;

/** The ISO timestamp `days` before `now`: rows older than this are past their retention period. */
export function retentionCutoff(now: number, days: number): string {
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

