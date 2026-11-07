import { describe, it, expect } from "vitest";
import { evaluateCronStatus, EXPECTED_JOBS } from "../scripts/check-cron.mjs";

const row = (jobname: string, extra: Record<string, unknown> = {}) => ({ jobname, active: true, last_run_at: "2026-11-07T00:00:00Z", last_status: "succeeded", ...extra });

describe("evaluateCronStatus", () => {
  it("is ok when every expected job is scheduled and healthy", () => {
    expect(evaluateCronStatus(EXPECTED_JOBS.map((n: string) => row(n))).ok).toBe(true);
  });

  it("reports the HTTP jobs as missing when the Vault secrets were never added", () => {
    const dbOnly = ["eval_lead_sla_breaches", "daily_slot_generation", "purge_expired_idempotency", "purge_stale_rate_limits"];
    const r = evaluateCronStatus(dbOnly.map((n) => row(n)));
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual(["process_outbox_queue", "process_automations", "daily_digests", "daily_data_retention", "daily_finalize_deletions", "daily_dms_export"]);
  });

  it("flags inactive and failing jobs; never-run alone is not a failure", () => {
    const rows = EXPECTED_JOBS.map((n: string) => row(n));
    rows[4] = row(EXPECTED_JOBS[4], { active: false });
    rows[5] = row(EXPECTED_JOBS[5], { last_status: "failed" });
    const r = evaluateCronStatus(rows);
    expect(r.inactive).toEqual([EXPECTED_JOBS[4]]);
    expect(r.failing).toEqual([EXPECTED_JOBS[5]]);
    expect(evaluateCronStatus(EXPECTED_JOBS.map((n: string) => row(n, { last_run_at: null, last_status: null }))).ok).toBe(true);
  });
});

import { evaluateHeartbeats } from "../scripts/check-cron.mjs";

describe("evaluateHeartbeats", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  const jobs = ["process_outbox_queue", "process_automations", "daily_dms_export"];

  it("passes when both HTTP jobs reached the app recently", () => {
    const r = evaluateHeartbeats(jobs, [
      { job: "outbox", last_received_at: "2026-11-08T11:58:00Z" },
      { job: "automations", last_received_at: "2026-11-08T11:50:00Z" },
    ], now);
    expect(r.ok).toBe(true);
  });

  it("flags a scheduled job whose calls never arrive (pg_cron says succeeded, the app answered 401)", () => {
    const r = evaluateHeartbeats(jobs, [], now);
    expect(r.ok).toBe(false);
    expect(r.notReceiving).toEqual(["process_outbox_queue (never received)", "process_automations (never received)"]);
  });

  it("flags a stale heartbeat and ignores jobs that are not scheduled", () => {
    const r = evaluateHeartbeats(["process_outbox_queue"], [{ job: "outbox", last_received_at: "2026-11-08T11:00:00Z" }], now);
    expect(r.notReceiving).toEqual(["process_outbox_queue (last received 2026-11-08T11:00:00Z)"]);
    expect(evaluateHeartbeats([], [], now).ok).toBe(true);
  });
});
