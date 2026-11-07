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

export interface RuleResult {
  rule: string;
  /** Rows queued (before de-duplication by idempotency key). */
  planned: number;
  error?: string;
}
