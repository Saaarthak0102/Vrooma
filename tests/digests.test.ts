import fs from "node:fs";
import { describe, expect, it } from "vitest";

import { digestNote, guardDigestNote } from "@/server/ai/digest-note";
import { clearBandNoteCache, describeBand, explainPriceBand, guardBandNote } from "@/server/ai/price-band-note";
import { isMarketingTemplate, marketingConsentGranted } from "@/server/automations/consent-gate";
import {
  composeDigest,
  isDigestEmpty,
  planDigests,
  type AdminFacts,
  type ConsultantFacts,
  type DigestFacts,
  type DigestRecipient,
  type ManagerFacts,
} from "@/server/automations/digests";
import { NUDGE_LIMITS, planSavedCarNudges, type SavedCarItem } from "@/server/automations/nudges";
import { runWithFallback, type AiRunDeps, type AiRunOptions } from "@/server/ai/runner";
import type { PriceBand } from "@/lib/price-band";
import { findForbiddenDiscountWord } from "@/lib/validation/discount";

const NOW = new Date("2026-11-08T03:00:00Z"); // 08:30 IST, 8 Nov

const consultant: DigestRecipient = { id: "c1", name: "Rahul Singh", email: "rahul@vrooma.in", role: "consultant" };
const manager: DigestRecipient = { id: "m1", name: "Meera Kapoor", email: "meera@vrooma.in", role: "manager" };
const admin: DigestRecipient = { id: "a1", name: "Dev Anand", email: "dev@vrooma.in", role: "admin" };

const cFacts = (o: Partial<ConsultantFacts> = {}): DigestFacts => ({
  role: "consultant",
  facts: { uncontactedNew: 2, openLeads: 14, openTasks: 5, overdueTasks: 3, todaysBookings: [{ kind: "test_drive", when: "11:00 am", buyer: "Asha", place: "Hazratganj" }], unmarkedBookings: 1, ...o },
});
const mFacts = (o: Partial<ManagerFacts> = {}): DigestFacts => ({
  role: "manager",
  facts: { availableCars: 31, bookedCars: 4, agedStock: [{ stockId: "UC-1001", name: "2020 Model S LX", days: 94 }, { stockId: "UC-1040", name: "2021 Model C VX", days: 71 }], tradeInsLast7Days: 6, ...o },
});
const aFacts = (o: Partial<AdminFacts> = {}): DigestFacts => ({
  role: "admin",
  facts: { leadsYesterday: 40, contactedInSla: 34, slaBreaches: 6, missedServiceCalls: 9, totalServiceCalls: 120, uncontactedNow: 3, deadOutbox: 0, pendingOutbox: 12, ...o },
});

describe("composeDigest", () => {
  it("shows a consultant their queue, overdue work and today's bookings", () => {
    const text = composeDigest(consultant, cFacts(), "Sunday, 8 November");
    expect(text).toContain("Good morning Rahul");
    expect(text).toContain("2 new leads not contacted yet");
    expect(text).toContain("3 follow-up tasks overdue (5 open in total)");
    expect(text).toContain("1 past booking still waiting");
    expect(text).toContain("11:00 am: test drive with Asha at Hazratganj");
  });

  it("shows the used-car manager ageing stock, oldest first", () => {
    const text = composeDigest(manager, mFacts(), "Sunday, 8 November");
    expect(text).toContain("31 available, 4 booked");
    expect(text.indexOf("UC-1001")).toBeLessThan(text.indexOf("UC-1040"));
    expect(text).toContain("6 trade-in requests");
  });

  it("shows the dealer principal response rate against the 90% target and the missed-call rate", () => {
    const text = composeDigest(admin, aFacts(), "Sunday, 8 November");
    expect(text).toContain("40 new leads");
    expect(text).toContain("34 contacted within 5 minutes (85%). The target is 90%");
    expect(text).toContain("9 of 120 missed (8%)");
    expect(composeDigest(admin, aFacts({ leadsYesterday: 0, contactedInSla: 0, totalServiceCalls: 0 }), "x")).toContain("No leads to measure");
  });

  it("flags dead outbox rows and never prints a discount word", () => {
    expect(composeDigest(admin, aFacts({ deadOutbox: 4 }), "x")).toContain("4 failed for good (check Admin > System)");
    for (const [r, d] of [[consultant, cFacts()], [manager, mFacts()], [admin, aFacts()]] as const) {
      expect(findForbiddenDiscountWord(composeDigest(r, d, "Sunday, 8 November"))).toBeNull();
    }
  });
});

describe("planDigests", () => {
  const items = (note?: string) => [
    { recipient: consultant, data: cFacts(), note },
    { recipient: manager, data: mFacts(), note: null },
    { recipient: admin, data: aFacts(), note: null },
  ];

  it("queues one daily_digest email per person, keyed by role, person and IST date", () => {
    const rows = planDigests(items(), NOW);
    expect(rows.map((r) => [r.to_address, r.template, r.idempotency_key])).toEqual([
      ["rahul@vrooma.in", "daily_digest", "digest:consultant:c1:2026-11-08"],
      ["meera@vrooma.in", "daily_digest", "digest:manager:m1:2026-11-08"],
      ["dev@vrooma.in", "daily_digest", "digest:admin:a1:2026-11-08"],
    ]);
  });

  it("appends the model's note when there is one, skips empty digests and people already queued today", () => {
    expect(planDigests(items("Where to start: call the 2 new leads."), NOW)[0].body).toContain("Where to start: call the 2 new leads.");
    const empty: DigestFacts = cFacts({ uncontactedNew: 0, openLeads: 0, openTasks: 0, overdueTasks: 0, todaysBookings: [], unmarkedBookings: 0 });
    expect(isDigestEmpty(empty)).toBe(true);
    expect(isDigestEmpty(mFacts({ agedStock: [], tradeInsLast7Days: 0 }))).toBe(true);
    expect(isDigestEmpty(aFacts({ leadsYesterday: 0 }))).toBe(false); // the dealer principal always gets one
    const rows = planDigests([{ recipient: consultant, data: empty }, ...items().slice(1)], NOW, new Set(["digest:admin:a1:2026-11-08"]));
    expect(rows.map((r) => r.to_address)).toEqual(["meera@vrooma.in"]);
  });
});

function fakeRunner(enabled = true) {
  const deps: AiRunDeps = {
    enabled: () => enabled,
    resolveModel: () => ({ model: {} as any, id: "test" }),
    timeoutMs: () => 500,
    isOverCap: async () => false,
    log: async () => {},
    now: () => Date.now(),
  };
  return <T,>(o: AiRunOptions<T>) => runWithFallback(o, deps);
}

describe("digest note", () => {
  const digest = composeDigest(consultant, cFacts(), "Sunday, 8 November");

  it("accepts a note whose numbers are all in the digest and rejects an invented one", () => {
    expect(guardDigestNote("Start with the 2 uncontacted leads, then clear the 3 overdue tasks.", digest).ok).toBe(true);
    expect(guardDigestNote("Start with the 7 uncontacted leads.", digest).ok).toBe(false);
    expect(guardDigestNote("Revenue is at risk: ₹40,00,000 is pending.", digest).ok).toBe(false);
  });

  it("returns a prefixed note on success and null whenever AI is off or the text is blocked", async () => {
    const ok = await digestNote(consultant, cFacts(), "Sunday, 8 November", { runner: fakeRunner(), generate: async () => ({ text: "Call the 2 uncontacted leads first." }) });
    expect(ok).toBe("Where to start: Call the 2 uncontacted leads first.");
    const bad = await digestNote(consultant, cFacts(), "Sunday, 8 November", { runner: fakeRunner(), generate: async () => ({ text: "Call the 9 uncontacted leads first." }) });
    expect(bad).toBeNull();
    const off = await digestNote(consultant, cFacts(), "x", { runner: fakeRunner(false), generate: async () => { throw new Error("no"); } });
    expect(off).toBeNull();
  });
});

describe("price band note", () => {
  const band: PriceBand = { low: 810000, median: 828000, high: 845000, confidence: "medium", sampleSize: 7, rationale: "7 comparable sales, adjusted for year and km" };
  const subject = { model_name: "Model C", year: 2022, km: 41200, fuel: "diesel" };
  const facts = describeBand(subject, band);

  it("describes the band from fixed numbers", () => {
    expect(facts).toContain("₹8,10,000 to ₹8,45,000");
    expect(facts).toContain("Based on 7 past sales");
  });

  it("accepts an explanation grounded in the band and rejects invented figures or price advice", () => {
    expect(guardBandNote("The range rests on 7 past sales and centres on ₹8,28,000, so treat it as a guide.", facts).ok).toBe(true);
    expect(guardBandNote("Cars like this sold for ₹9,90,000 recently.", facts).ok).toBe(false);
    expect(guardBandNote("Based on 12 past sales, so it is reliable.", facts).ok).toBe(false);
    expect(guardBandNote("You should list it at around the median.", facts).ok).toBe(false);
  });

  it("explains only through the guarded runner, and returns null when blocked or AI is off", async () => {
    const good = await explainPriceBand(subject, band, { runner: fakeRunner(), generate: async () => ({ text: "The range rests on 7 past sales with medium confidence, so treat it as a guide." }) });
    expect(good).toContain("7 past sales");
    clearBandNoteCache(); // the good note is cached; the next steps must reach the guard
    const invented = await explainPriceBand(subject, band, { runner: fakeRunner(), generate: async () => ({ text: "Similar cars sold for ₹9,90,000 last month." }) });
    expect(invented).toBeNull();
    clearBandNoteCache();
    const advice = await explainPriceBand(subject, band, { runner: fakeRunner(), generate: async () => ({ text: "You should list it at ₹8,28,000." }) });
    expect(advice).toBeNull();
    clearBandNoteCache();
    expect(await explainPriceBand(subject, band, { runner: fakeRunner(false), generate: async () => ({ text: "x" }) })).toBeNull();
  });
});

describe("price band note cache", () => {
  const band: PriceBand = { low: 810000, median: 828000, high: 845000, confidence: "medium", sampleSize: 7, rationale: "7 comparable sales, adjusted for year and km" };
  const subject = { model_name: "Model C", year: 2022, km: 41200, fuel: "diesel" };

  it("keeps a successful note so reopening the drawer makes no model request, and does not keep failures", async () => {
    clearBandNoteCache();
    let calls = 0;
    const generate = async () => ((calls += 1), { text: "The range rests on 7 past sales with medium confidence, so treat it as a guide." });
    expect(await explainPriceBand(subject, band, { runner: fakeRunner(), generate })).toContain("7 past sales");
    expect(await explainPriceBand(subject, band, { runner: fakeRunner(), generate })).toContain("7 past sales");
    expect(calls).toBe(1);

    clearBandNoteCache();
    let bad = 0;
    const failing = async () => ((bad += 1), { text: "Similar cars sold for ₹9,90,000 last month." });
    expect(await explainPriceBand(subject, band, { runner: fakeRunner(), generate: failing })).toBeNull();
    expect(await explainPriceBand(subject, band, { runner: fakeRunner(), generate: failing })).toBeNull();
    expect(bad).toBe(2); // a blocked note is retried, not remembered
    clearBandNoteCache();
  });

  it("a different band is a different note", async () => {
    clearBandNoteCache();
    let calls = 0;
    const generate = async () => ((calls += 1), { text: "The range rests on 7 past sales with medium confidence, so treat it as a guide." });
    await explainPriceBand(subject, band, { runner: fakeRunner(), generate });
    await explainPriceBand(subject, { ...band, low: 800000, sampleSize: 7 }, { runner: fakeRunner(), generate });
    expect(calls).toBe(2);
    clearBandNoteCache();
  });
});

describe("saved-car nudges and the marketing consent gate", () => {
  const item = (o: Partial<SavedCarItem> = {}): SavedCarItem => ({
    savedId: "s1", userId: "u1", name: "Asha Verma", email: "asha@example.com", modelName: "Model H", modelSlug: "model-h", savedOn: "2026-11-01", ...o,
  });

  it("emails only people who opted in to marketing and have not enquired or booked since", () => {
    const rows = planSavedCarNudges([item(), item({ savedId: "s2", userId: "u2" }), item({ savedId: "s3", userId: "u3" })], new Set(["u1", "u3"]), new Set(["u3"]));
    expect(rows.map((r) => [r.to_address, r.template, r.idempotency_key])).toEqual([["asha@example.com", "saved_car_nudge", "saved:s1"]]);
    expect(rows[0].body).toContain("vrooma.in/cars/model-h");
  });

  it("says how to stop, uses no discount wording, skips bad emails and caps each run", () => {
    const [row] = planSavedCarNudges([item()], new Set(["u1"]), new Set());
    expect(row.body).toContain("untick marketing messages in your Vrooma profile");
    expect(findForbiddenDiscountWord(row.body)).toBeNull();
    expect(planSavedCarNudges([item({ email: "nope" })], new Set(["u1"]), new Set())).toEqual([]);
    const many = Array.from({ length: 80 }, (_, i) => item({ savedId: `s${i}`, userId: `u${i}` }));
    expect(planSavedCarNudges(many, new Set(many.map((m) => m.userId)), new Set())).toHaveLength(NUDGE_LIMITS.perRun);
  });

  it("the worker-side gate reads the account's latest marketing consent and fails closed", async () => {
    expect(isMarketingTemplate("saved_car_nudge")).toBe(true);
    expect(isMarketingTemplate("booking_confirmation")).toBe(false);

    const make = (profile: any, consent: any, boom = false) => ({
      from: (table: string) => {
        const chain: any = { select: () => chain, eq: () => chain, maybeSingle: async () => { if (boom) throw new Error("db"); return { data: table === "profiles" ? profile : consent }; } };
        return chain;
      },
    });
    expect(await marketingConsentGranted(make({ id: "u1" }, { granted: true }), "Asha@Example.com")).toBe(true);
    expect(await marketingConsentGranted(make({ id: "u1" }, { granted: false }), "asha@example.com")).toBe(false); // unsubscribed
    expect(await marketingConsentGranted(make({ id: "u1" }, null), "asha@example.com")).toBe(false); // never opted in
    expect(await marketingConsentGranted(make(null, null), "stranger@example.com")).toBe(false); // no account
    expect(await marketingConsentGranted(make({ id: "u1" }, { granted: true }, true), "asha@example.com")).toBe(false); // error
    expect(await marketingConsentGranted(make({ id: "u1" }, { granted: true }), "+919876543210")).toBe(false); // not an email
  });
});

describe("migration 0041", () => {
  it("schedules the digests job at 03:00 UTC (08:30 IST) behind the Vault-secret check and keeps the other jobs", () => {
    const sql = fs.readFileSync("supabase/migrations/0041_digests_cron.sql", "utf8");
    expect(sql).toContain("'daily_digests',            '0 3 * * *'");
    expect(sql).toContain("/api/cron/digests");
    expect(sql.indexOf("cron.schedule('daily_digests'")).toBeGreaterThan(sql.indexOf("IF NOT v_has_secrets"));
    for (const job of ["process_outbox_queue", "process_automations", "daily_dms_export", "eval_lead_sla_breaches"]) expect(sql).toContain(job);
  });
});
