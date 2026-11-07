/** How long each HTTP-driven job may go without being received before it is reported as not arriving. */
export const HEARTBEAT_MAX_AGE_MIN: Record<string, number> = { outbox: 5, automations: 15, digests: 26 * 60 };

/** pg_cron job name -> heartbeat key. */
export const HEARTBEAT_FOR_JOB: Record<string, string> = {
  process_outbox_queue: "outbox",
  process_automations: "automations",
  daily_digests: "digests",
};

export type HeartbeatState = "ok" | "stale" | "never";

export function heartbeatState(lastReceivedAt: string | null | undefined, maxAgeMin: number, now: Date = new Date()): HeartbeatState {
  if (!lastReceivedAt) return "never";
  return now.getTime() - new Date(lastReceivedAt).getTime() > maxAgeMin * 60_000 ? "stale" : "ok";
}
