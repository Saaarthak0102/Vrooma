import type { OutboxRow } from "@/server/automations/types";

/**
 * Inserts outbox rows, silently skipping any whose idempotency key already exists, so a rule that selects the
 * same booking/lead on every 5-minute run queues its message exactly once.
 */
export async function enqueueOnce(admin: any, rows: OutboxRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await admin
    .from("messages_outbox")
    .upsert(
      rows.map((r) => ({ ...r, status: "pending" })),
      { onConflict: "idempotency_key", ignoreDuplicates: true },
    );
  if (error) throw new Error(`outbox enqueue failed: ${error.message}`);
}
