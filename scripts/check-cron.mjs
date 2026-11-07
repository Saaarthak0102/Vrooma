/**
 * scripts/check-cron.mjs   (pnpm check:cron)
 *
 * Read-only. Lists the scheduled jobs of the Supabase project in .env.local (or the env) and says which of the
 * expected ones are missing or have never run. Use it after adding the Vault secrets and running
 * `select private.ensure_cron_jobs();`. Exits 1 when something expected is missing.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (service role). Prints no secrets.
 */
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "./dev-cron.mjs";

export const EXPECTED_JOBS = [
  "eval_lead_sla_breaches",
  "daily_slot_generation",
  "purge_expired_idempotency",
  "purge_stale_rate_limits",
  "process_outbox_queue",
  "process_automations",
  "daily_digests",
  "daily_data_retention",
  "daily_finalize_deletions",
  "daily_dms_export",
];

/** HTTP jobs that must be received by the app, and how stale (minutes) their last heartbeat may be. */
export const HEARTBEAT_JOBS = { process_outbox_queue: ["outbox", 5], process_automations: ["automations", 15], daily_digests: ["digests", 26 * 60] };

/**
 * pg_cron reports an HTTP job as "succeeded" once the request is sent, even if the app answered 401/404. The app
 * records a heartbeat whenever an authorised call arrives (migration 0038). Pure so it can be unit tested.
 * @param {string[]} scheduledJobs jobs that exist  @param {{job:string,last_received_at:string}[]} heartbeats
 */
export function evaluateHeartbeats(scheduledJobs, heartbeats, now = new Date()) {
  const byJob = new Map(heartbeats.map((h) => [h.job, h.last_received_at]));
  const notReceiving = [];
  for (const [jobName, [key, maxAgeMin]] of Object.entries(HEARTBEAT_JOBS)) {
    if (!scheduledJobs.includes(jobName)) continue;
    const last = byJob.get(key);
    if (!last) notReceiving.push(`${jobName} (never received)`);
    else if (now.getTime() - new Date(last).getTime() > maxAgeMin * 60_000) notReceiving.push(`${jobName} (last received ${last})`);
  }
  return { notReceiving, ok: notReceiving.length === 0 };
}

/** Pure so it can be unit tested. rows: [{ jobname, active, last_run_at, last_status }] */
export function evaluateCronStatus(rows) {
  const byName = new Map(rows.map((r) => [r.jobname, r]));
  const missing = EXPECTED_JOBS.filter((n) => !byName.has(n));
  const inactive = EXPECTED_JOBS.filter((n) => byName.get(n) && byName.get(n).active === false);
  const neverRan = EXPECTED_JOBS.filter((n) => byName.get(n) && !byName.get(n).last_run_at);
  const failing = EXPECTED_JOBS.filter((n) => byName.get(n)?.last_status === "failed");
  return { missing, inactive, neverRan, failing, ok: missing.length === 0 && inactive.length === 0 && failing.length === 0 };
}

async function main() {
  const fileEnv = loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  const get = (k) => process.env[k] ?? fileEnv[k] ?? "";
  const url = get("NEXT_PUBLIC_SUPABASE_URL");
  const key = get("SUPABASE_SECRET_KEY") || get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (in .env.local or the environment).");
    process.exit(2);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("get_cron_status");
  if (error) {
    console.error(`Could not read cron status: ${error.message}`);
    process.exit(2);
  }

  console.log(`Project: ${new URL(url).host}`);
  for (const r of data ?? []) {
    console.log(` ${r.active ? "on " : "off"}  ${r.jobname.padEnd(28)} ${r.schedule.padEnd(14)} last: ${r.last_run_at ?? "never"} ${r.last_status ?? ""}`);
  }

  const result = evaluateCronStatus(data ?? []);
  const hb = await supabase.from("cron_heartbeats").select("job, last_received_at");
  let heartbeatOk = true;
  if (hb.error) {
    console.warn(`
Heartbeats unavailable (apply migration 0038): ${hb.error.message}`);
  } else {
    const heart = evaluateHeartbeats((data ?? []).map((r) => r.jobname), hb.data ?? []);
    heartbeatOk = heart.ok;
    if (!heart.ok) {
      console.error(`
Scheduled, but the app is NOT receiving: ${heart.notReceiving.join(", ")}`);
      console.error("Likely causes: CRON_SECRET differs from the Vault cron_secret, app_url is wrong or has a trailing slash,");
      console.error("or Vercel deployment protection blocks the call. See docs/backend/CRON_SETUP.md.");
    }
  }
  if (result.missing.length) {
    console.error(`\nMissing jobs: ${result.missing.join(", ")}`);
    console.error("Add the Vault secrets app_url and cron_secret, then run: select private.ensure_cron_jobs();");
    console.error("Steps: docs/backend/CRON_SETUP.md");
  }
  if (result.inactive.length) console.error(`Inactive jobs: ${result.inactive.join(", ")}`);
  if (result.failing.length) console.error(`Last run failed: ${result.failing.join(", ")}`);
  if (result.neverRan.length && result.ok) console.log(`\nNot run yet (normal right after scheduling): ${result.neverRan.join(", ")}`);
  const allOk = result.ok && heartbeatOk;
  console.log(allOk ? "\nAll expected jobs are scheduled and reaching the app." : "\nCron is NOT fully set up.");
  process.exitCode = allOk ? 0 : 1;
}

if (import.meta.url === new URL(process.argv[1], "file://").href || process.argv[1]?.endsWith("check-cron.mjs")) {
  main();
}
