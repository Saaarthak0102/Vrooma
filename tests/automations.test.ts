import { describe, expect, it } from "vitest";
import fs from "node:fs";

import { resolveRecipient } from "@/server/automations/alerts";
import { planEscalations } from "@/server/automations/escalations";
import { findUncoveredPriceRules, planExpiryAlerts, type PriceRuleRow } from "@/server/automations/expiry";
import { planOutcomeReminders } from "@/server/automations/outcomes";
import { planReminders, type ReminderBooking } from "@/server/automations/reminders";
import { runAutomations } from "@/server/automations/run";

const NOW = new Date("2026-11-08T06:00:00Z"); // 11:30 IST
const H = 3600_000;
const at = (hours: number) => new Date(NOW.getTime() + hours * H).toISOString();

function booking(over: Partial<ReminderBooking> = {}): ReminderBooking {
  return {
    id: "b1",
    ref: "BK-1",
    created_at: at(-48),
    kind: "test_drive",
    status: "confirmed",
    car: "Model H ZX",
    startsAt: at(20),
    place: "Hazratganj",
    name: "Asha Verma",
    email: "asha@example.com",
    whatsapp: "+919876543210",
    leadId: "l1",
    ...over,
  };
}

describe("booking reminders", () => {
  it("sends the 24 h reminder by email and WhatsApp with stable idempotency keys", () => {
    const rows = planReminders([booking()], NOW);
    expect(rows.map((r) => [r.channel, r.template, r.idempotency_key])).toEqual([
      ["email", "test_drive_reminder", "rem24:b1:email"],
      ["whatsapp", "test_drive_reminder", "rem24:b1:wa"],
    ]);
    expect(rows[0].body).toContain("Hi Asha");
    expect(rows[0].body).toContain("Model H ZX");
    expect(rows[0].body).toContain("Hazratganj");
    expect(rows[0].body).toContain("BK-1");
    expect(rows[0].booking_id).toBe("b1");
  });

  it("sends the 2 h reminder when the slot is within 3 hours, and nothing for later or past slots", () => {
    expect(planReminders([booking({ startsAt: at(2) })], NOW)[0].idempotency_key).toBe("rem2:b1:email");
    expect(planReminders([booking({ startsAt: at(30) })], NOW)).toEqual([]);
    expect(planReminders([booking({ startsAt: at(-1) })], NOW)).toEqual([]);
  });

  it("does not send the 24 h reminder for a booking made inside that window, nor the 3 h one for a last-minute booking", () => {
    expect(planReminders([booking({ startsAt: at(10), created_at: at(-1) })], NOW)).toEqual([]);
    expect(planReminders([booking({ startsAt: at(2.5), created_at: at(0) })], NOW)).toEqual([]);
    expect(planReminders([booking({ startsAt: at(4), created_at: at(-1) })], NOW)).toEqual([]);
  });

  it("uses the service template for service bookings and skips cancelled ones", () => {
    const svc = planReminders([booking({ kind: "service", place: "Transport Nagar", car: "Model C" })], NOW);
    expect(svc[0].template).toBe("service_reminder");
    expect(svc[0].body).toContain("service appointment");
    expect(planReminders([booking({ status: "cancelled" })], NOW)).toEqual([]);
  });

  it("skips channels it has no address for, and ignores malformed emails", () => {
    expect(planReminders([booking({ email: null })], NOW).map((r) => r.channel)).toEqual(["whatsapp"]);
    expect(planReminders([booking({ email: "guest-123", whatsapp: null })], NOW)).toEqual([]);
  });
});

describe("missing booking outcomes", () => {
  const unmarked = { id: "b9", ref: "BK-9", kind: "test_drive" as const, endedAt: at(-3), buyer: "Asha", place: "Hazratganj", ownerEmail: "rahul@vrooma.in", leadId: "l1" };

  it("asks the lead's consultant to record the outcome, once", () => {
    const [row] = planOutcomeReminders([unmarked]);
    expect(row).toMatchObject({ to_address: "rahul@vrooma.in", template: "booking_outcome_needed", idempotency_key: "outcome:b9" });
    expect(row.body).toContain("BK-9");
  });

  it("falls back to the shared alert mailbox, then to the legacy address", () => {
    expect(planOutcomeReminders([{ ...unmarked, ownerEmail: null }], { ALERT_EMAIL: "ops@vrooma.in" })[0].to_address).toBe("ops@vrooma.in");
    expect(planOutcomeReminders([{ ...unmarked, ownerEmail: null }], {})[0].to_address).toBe("manager@vrooma.in");
  });
});

describe("escalations", () => {
  const lead = { id: "l1", kind: "lead" as const, label: "Lead LD-1 (Asha)", waitingMinutes: 16, consultantEmail: "rahul@vrooma.in" };

  it("notifies the consultant and the alert mailbox, each once", () => {
    const rows = planEscalations([lead], { ALERT_EMAIL: "ops@vrooma.in" });
    expect(rows.map((r) => [r.to_address, r.idempotency_key])).toEqual([
      ["rahul@vrooma.in", "sla15:l1:cons"],
      ["ops@vrooma.in", "sla15:l1:mgr"],
    ]);
    expect(rows[0].template).toBe("lead_uncontacted_escalation");
  });

  it("covers waiting chats and never drops an escalation when nobody is configured", () => {
    const rows = planEscalations([{ id: "c1", kind: "chat", label: "Chat from Asha", waitingMinutes: 12, consultantEmail: null }], {});
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ to_address: "manager@vrooma.in", template: "chat_waiting_alert", idempotency_key: "chatwait:c1:mgr" });
  });
});

describe("expiry alerts", () => {
  const rule = (id: string, over: Partial<PriceRuleRow> = {}): PriceRuleRow => ({
    id,
    city_id: "lko",
    model_id: "mh",
    variant_id: null,
    fuel: null,
    valid_from: "2026-01-01",
    valid_until: "2026-11-12",
    label: "Model H in Lucknow",
    ...over,
  });

  it("flags a rule ending within 7 days or recently ended when nothing takes over", () => {
    expect(findUncoveredPriceRules([rule("a")], "2026-11-08").map((r) => r.id)).toEqual(["a"]);
    expect(findUncoveredPriceRules([rule("a", { valid_until: "2026-11-01" })], "2026-11-08")).toHaveLength(1);
    expect(findUncoveredPriceRules([rule("a", { valid_until: "2026-12-30" })], "2026-11-08")).toEqual([]);
    expect(findUncoveredPriceRules([rule("a", { valid_until: "2026-08-01" })], "2026-11-08")).toEqual([]);
  });

  it("does not flag a rule that has a continuing successor for the same scope, but does for a different city", () => {
    const next = rule("b", { valid_from: "2026-11-13", valid_until: "2027-03-31" });
    expect(findUncoveredPriceRules([rule("a"), next], "2026-11-08")).toEqual([]);
    expect(findUncoveredPriceRules([rule("a"), { ...next, city_id: "knp" }], "2026-11-08").map((r) => r.id)).toEqual(["a"]);
    // a gap of more than one day is not coverage
    expect(findUncoveredPriceRules([rule("a"), { ...next, valid_from: "2026-11-20" }], "2026-11-08").map((r) => r.id)).toEqual(["a"]);
  });

  it("queues one alert per price rule, offer and data request that is close to its date", () => {
    const rows = planExpiryAlerts(
      {
        priceRules: [rule("a")],
        offers: [
          { id: "o1", title: "Festive", valid_until: "2026-11-10", is_active: true },
          { id: "o2", title: "Far", valid_until: "2026-12-30", is_active: true },
          { id: "o3", title: "Off", valid_until: "2026-11-10", is_active: false },
        ],
        requests: [
          { id: "r1", kind: "erasure", due_at: at(24 * 3), status: "received" },
          { id: "r2", kind: "access", due_at: at(24 * 20), status: "received" },
          { id: "r3", kind: "access", due_at: at(24 * 2), status: "completed" },
        ],
      },
      NOW,
      { ALERT_EMAIL: "ops@vrooma.in" },
    );
    expect(rows.map((r) => r.idempotency_key)).toEqual(["pricerule:a", "offer:o1", "dpdp:r1"]);
    expect(rows.every((r) => r.to_address === "ops@vrooma.in")).toBe(true);
    expect(rows[0].body).toContain("Model H in Lucknow");
  });
});

describe("alert recipient mapping", () => {
  it("maps the old placeholder addresses to ALERT_EMAIL and leaves real addresses alone", () => {
    const env = { ALERT_EMAIL: "ops@vrooma.in" };
    expect(resolveRecipient("manager@vrooma.in", env)).toBe("ops@vrooma.in");
    expect(resolveRecipient("Staff@Vrooma.in", env)).toBe("ops@vrooma.in");
    expect(resolveRecipient("rahul@vrooma.in", env)).toBe("rahul@vrooma.in");
    expect(resolveRecipient("manager@vrooma.in", {})).toBe("manager@vrooma.in");
  });
});

describe("runAutomations", () => {
  function fakeAdmin(failTable?: string) {
    const upserts: { rows: any[]; options: any }[] = [];
    const builder = (table: string) => {
      const result = { data: [] as any[], error: failTable === table ? { message: "boom" } : null };
      const chain: any = new Proxy(
        {},
        {
          get: (_t, prop) => {
            if (prop === "then") return (resolve: any) => resolve(result);
            if (prop === "upsert") return async (rows: any[], options: any) => (upserts.push({ rows, options }), { error: null });
            return () => chain;
          },
        },
      );
      return chain;
    };
    return { admin: { from: builder }, upserts };
  }

  it("runs every rule and reports each one", async () => {
    const { admin } = fakeAdmin();
    const results = await runAutomations(admin, NOW);
    expect(results.map((r) => r.rule)).toEqual(["booking_reminders", "booking_outcomes", "escalations", "garage_reminders", "expiry_alerts"]);
    expect(results.every((r) => !r.error)).toBe(true);
  });

  it("keeps going when one rule's query fails", async () => {
    const { admin } = fakeAdmin("price_rules");
    const results = await runAutomations(admin, NOW);
    expect(results.find((r) => r.rule === "expiry_alerts")?.error).toContain("boom");
    expect(results.filter((r) => !r.error)).toHaveLength(4);
  });
});

describe("migration 0037", () => {
  it("schedules the automations job every 5 minutes behind the Vault-secret check", () => {
    const sql = fs.readFileSync("supabase/migrations/0037_automations_cron.sql", "utf8");
    expect(sql).toContain("'process_automations',      '*/5 * * * *'");
    expect(sql).toContain("/api/cron/automations");
    expect(sql.indexOf("cron.schedule('process_automations'")).toBeGreaterThan(sql.indexOf("IF NOT v_has_secrets"));
    // the older jobs are still managed by the same function
    for (const job of ["process_outbox_queue", "daily_dms_export", "eval_lead_sla_breaches"]) expect(sql).toContain(job);
  });
});

// ---- Fixes after the DEV verification: fresh windows, caps, stale and non-production safety ----

import { ESCALATION_WINDOWS, selectWaiting } from "@/server/automations/escalations";
import { OUTCOME_WINDOW, selectUnmarkedBookings } from "@/server/automations/outcomes";
import { isRecipientAllowed, isStaleTimeSensitive } from "@/server/automations/alerts";
import { recordHeartbeat } from "@/server/automations/heartbeat";
import { heartbeatState } from "@/lib/cron-heartbeat";

/** Records every filter applied to a query so the time windows can be asserted without a database. */
function recordingAdmin() {
  const calls: { table: string; op: string; args: unknown[] }[] = [];
  const admin = {
    from(table: string) {
      const chain: any = new Proxy(
        {},
        {
          get: (_t, op: string) => {
            if (op === "then") return (resolve: any) => resolve({ data: [], error: null });
            return (...args: unknown[]) => (calls.push({ table, op, args }), chain);
          },
        },
      );
      return chain;
    },
  };
  return { admin, calls };
}

describe("fresh windows (no first-run flood)", () => {
  it("escalates only leads 15-60 minutes old and chats 10-60 minutes old", async () => {
    const { admin, calls } = recordingAdmin();
    await selectWaiting(admin, NOW);
    const arg = (table: string, op: string, col: string) => calls.find((c) => c.table === table && c.op === op && c.args[0] === col)?.args[1];
    const minutesAgo = (iso: unknown) => Math.round((NOW.getTime() - new Date(iso as string).getTime()) / 60_000);
    expect(minutesAgo(arg("leads", "lt", "created_at"))).toBe(ESCALATION_WINDOWS.leadAfterMinutes);
    expect(minutesAgo(arg("leads", "gt", "created_at"))).toBe(60);
    expect(minutesAgo(arg("chat_conversations", "lt", "handoff_at"))).toBe(ESCALATION_WINDOWS.chatAfterMinutes);
    expect(minutesAgo(arg("chat_conversations", "gt", "handoff_at"))).toBe(60);
  });

  it("asks for booking outcomes only 1-24 hours after the slot", async () => {
    const { admin, calls } = recordingAdmin();
    await selectUnmarkedBookings(admin, NOW);
    const arg = (op: string) => calls.find((c) => c.op === op && c.args[0] === "slots.ends_at")?.args[1];
    const hoursAgo = (iso: unknown) => (NOW.getTime() - new Date(iso as string).getTime()) / H;
    expect(hoursAgo(arg("lt"))).toBe(1);
    expect(hoursAgo(arg("gt"))).toBe(24);
  });

  it("queues at most 50 outcome reminders per run, oldest first, so a backlog drips out", () => {
    const many = Array.from({ length: 80 }, (_, i) => ({
      id: `b${i}`, ref: `BK-${i}`, kind: "test_drive" as const, endedAt: at(-2 - i / 100), buyer: null, place: "Hazratganj", ownerEmail: "r@vrooma.in", leadId: null,
    }));
    const rows = planOutcomeReminders(many);
    expect(rows).toHaveLength(OUTCOME_WINDOW.maxPerRun);
    expect(rows[0].idempotency_key).toBe("outcome:b79"); // the one that ended longest ago
  });
});

describe("outbox safety", () => {
  const old = new Date(NOW.getTime() - 25 * H).toISOString();
  const fresh = new Date(NOW.getTime() - 2 * H).toISOString();

  it("skips time-sensitive messages older than 24 h but never confirmations or consultant replies", () => {
    expect(isStaleTimeSensitive("lead_acknowledgement", old, NOW)).toBe(true);
    expect(isStaleTimeSensitive("sla_breach_alert", old, NOW)).toBe(true);
    expect(isStaleTimeSensitive("test_drive_reminder", old, NOW)).toBe(true);
    expect(isStaleTimeSensitive("lead_acknowledgement", fresh, NOW)).toBe(false);
    for (const t of ["booking_confirmation", "booking_cancellation", "consultant_reply", "dpdp_erasure_request_received", "newsletter_subscription_confirmed"]) {
      expect(isStaleTimeSensitive(t, old, NOW)).toBe(false);
    }
  });

  it("enforces OUTBOX_ALLOWLIST outside production by address or @domain, and ignores it in production", () => {
    const env = { APP_ENV: "development", OUTBOX_ALLOWLIST: "delivered@resend.dev, @vrooma.in" };
    expect(isRecipientAllowed("delivered@resend.dev", env)).toBe(true);
    expect(isRecipientAllowed("Someone@Vrooma.in", env)).toBe(true);
    expect(isRecipientAllowed("buyer@lucknow.org", env)).toBe(false);
    expect(isRecipientAllowed("evilvrooma.in", env)).toBe(false);
    expect(isRecipientAllowed("buyer@lucknow.org", { APP_ENV: "development" })).toBe(true); // unset = unrestricted
    expect(isRecipientAllowed("buyer@lucknow.org", { ...env, APP_ENV: "production" })).toBe(true);
  });
});

describe("cron heartbeat", () => {
  it("classifies a job as ok, stale or never received", () => {
    expect(heartbeatState(new Date(NOW.getTime() - 2 * 60_000).toISOString(), 5, NOW)).toBe("ok");
    expect(heartbeatState(new Date(NOW.getTime() - 9 * 60_000).toISOString(), 5, NOW)).toBe("stale");
    expect(heartbeatState(null, 5, NOW)).toBe("never");
  });

  it("records an upsert keyed by job, and never throws when the table is missing or the write fails", async () => {
    const seen: any[] = [];
    const ok = { from: (t: string) => ({ upsert: async (row: any, opts: any) => (seen.push({ t, row, opts }), { error: null }) }) };
    await recordHeartbeat(ok, "outbox");
    expect(seen[0]).toMatchObject({ t: "cron_heartbeats", row: { job: "outbox" }, opts: { onConflict: "job" } });
    const missing = { from: () => ({ upsert: async () => ({ error: { message: 'relation "cron_heartbeats" does not exist' } }) }) };
    await expect(recordHeartbeat(missing, "automations")).resolves.toBeUndefined();
    const boom = { from: () => ({ upsert: async () => { throw new Error("net down"); } }) };
    await expect(recordHeartbeat(boom, "automations")).resolves.toBeUndefined();
  });
});
