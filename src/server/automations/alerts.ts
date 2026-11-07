/**
 * Where internal alerts go. One shared mailbox or group alias (ALERT_EMAIL) so there is no per-person fan-out
 * to keep in sync. The SQL functions that already queue alerts (create_lead, flag_sla_breaches) still write the
 * old placeholder addresses; the outbox worker maps those to ALERT_EMAIL too, so changing the recipient never
 * needs a migration.
 */
export const LEGACY_ALERT_ADDRESSES = new Set(["manager@vrooma.in", "staff@vrooma.in"]);

export function alertEmail(env: Record<string, string | undefined> = process.env): string | null {
  const value = env.ALERT_EMAIL?.trim();
  return value ? value : null;
}

/** Address the outbox worker should really send to. */
export function resolveRecipient(address: string, env: Record<string, string | undefined> = process.env): string {
  return LEGACY_ALERT_ADDRESSES.has(address.toLowerCase()) ? (alertEmail(env) ?? address) : address;
}

/**
 * Messages that lose their meaning if they arrive late. When the worker has been down or backed up, these are
 * skipped instead of sent hours later ("we will call you within 5 minutes", a reminder for a past slot).
 * Confirmations, cancellations, data-rights notices and consultant replies are always still worth sending.
 */
export const TIME_SENSITIVE_TEMPLATES = new Set([
  "lead_acknowledgement",
  "sla_breach_alert",
  "unassigned_lead_alert",
  "lead_uncontacted_escalation",
  "chat_waiting_alert",
  "booking_outcome_needed",
  "test_drive_reminder",
  "service_reminder",
  "daily_digest",
]);

export const STALE_AFTER_MS = 24 * 3600_000;

export function isStaleTimeSensitive(template: string, createdAt: string, now: Date = new Date()): boolean {
  return TIME_SENSITIVE_TEMPLATES.has(template) && now.getTime() - new Date(createdAt).getTime() > STALE_AFTER_MS;
}

/**
 * Non-production safety net. When OUTBOX_ALLOWLIST (comma-separated addresses or @domains) is set and the app is
 * not in production, only those recipients are ever contacted, so test data can never email a real person.
 * Production ignores it. Unset means no restriction (today's behaviour).
 */
export function isRecipientAllowed(address: string, env: Record<string, string | undefined> = process.env): boolean {
  if (env.APP_ENV === "production") return true;
  const list = (env.OUTBOX_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return true;
  const a = address.trim().toLowerCase();
  return list.some((entry) => (entry.startsWith("@") ? a.endsWith(entry) : a === entry));
}
