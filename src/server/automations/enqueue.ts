import type { OutboxRow, TaskRow } from "@/server/automations/types";

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

/** Creates lead tasks, skipping any whose idempotency key already exists (so a re-run never duplicates a task). */
export async function enqueueTasksOnce(admin: any, tasks: TaskRow[]): Promise<void> {
  if (tasks.length === 0) return;
  const { error } = await admin.from("lead_tasks").upsert(tasks, { onConflict: "idempotency_key", ignoreDuplicates: true });
  if (error) throw new Error(`task enqueue failed: ${error.message}`);
}
