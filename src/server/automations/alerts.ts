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
