/**
 * Records that a cron route was actually called by an authorised caller. pg_cron reports "succeeded" as soon as it
 * has fired the HTTP request, even when the app answers 401 or 404 (wrong secret, wrong URL, deployment protection),
 * so the System page and `pnpm check:cron` read this instead: no recent heartbeat means the app is not receiving
 * the job. Never throws; a failed write must not stop the job itself.
 */
export type HeartbeatJob = "outbox" | "automations" | "digests";

export async function recordHeartbeat(admin: any, job: HeartbeatJob): Promise<void> {
  try {
    const { error } = await admin
      .from("cron_heartbeats")
      .upsert({ job, last_received_at: new Date().toISOString() }, { onConflict: "job" });
    // Table missing (migration 0038 not applied yet) is expected right after deploying: stay quiet.
    if (error && !/cron_heartbeats|does not exist|schema cache/i.test(error.message)) {
      console.warn(`[heartbeat] ${job}: ${error.message}`);
    }
  } catch (err: any) {
    console.warn(`[heartbeat] ${job} skipped: ${err?.message}`);
  }
}
