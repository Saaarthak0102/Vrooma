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
  "daily_data_retention",
  "daily_finalize_deletions",
  "daily_dms_export",
];

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
  if (result.missing.length) {
    console.error(`\nMissing jobs: ${result.missing.join(", ")}`);
    console.error("Add the Vault secrets app_url and cron_secret, then run: select private.ensure_cron_jobs();");
    console.error("Steps: docs/backend/CRON_SETUP.md");
  }
  if (result.inactive.length) console.error(`Inactive jobs: ${result.inactive.join(", ")}`);
  if (result.failing.length) console.error(`Last run failed: ${result.failing.join(", ")}`);
  if (result.neverRan.length && result.ok) console.log(`\nNot run yet (normal right after scheduling): ${result.neverRan.join(", ")}`);
  console.log(result.ok ? "\nAll expected jobs are scheduled." : "\nCron is NOT fully set up.");
  process.exitCode = result.ok ? 0 : 1;
}

if (import.meta.url === new URL(process.argv[1], "file://").href || process.argv[1]?.endsWith("check-cron.mjs")) {
  main();
}
