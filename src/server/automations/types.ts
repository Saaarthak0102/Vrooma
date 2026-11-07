/** One row to insert into messages_outbox. The idempotency key makes every automation safe to re-run. */
export interface OutboxRow {
  channel: "email" | "whatsapp";
  to_address: string;
  template: string;
  body: string;
  idempotency_key: string;
  lead_id?: string | null;
  booking_id?: string | null;
}

/** One row for lead_tasks, created by an automation. */
export interface TaskRow {
  lead_id: string;
  assigned_to: string | null;
  kind: "call_now" | "follow_up" | "post_drive" | "no_show" | "stale" | "escalate" | "custom";
  title: string;
  reason: string | null;
  due_at: string;
  source: "automation";
  idempotency_key: string;
}

export interface RuleResult {
  rule: string;
  /** Rows queued (before de-duplication by idempotency key). */
  planned: number;
  error?: string;
}
