/**
 * Statutory data retention thresholds under DPDP Act 2023.
 */
export const RETENTION_POLICIES = {
  LEAD_ANONYMIZATION_MONTHS: 24, // Closed leads older than 24 months scrubbed
  OUTBOX_PURGE_DAYS: 90,        // Sent or dead messages purged after 90 days
  IDEMPOTENCY_PURGE_DAYS: 7,    // Idempotency tokens purged after 7 days
} as const;

