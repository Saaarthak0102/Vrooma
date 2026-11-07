import fs from "node:fs";
import { describe, expect, it } from "vitest";

import {
  DEV_REF,
  PERSONAS,
  TABLE_ORDER,
  assertDevTarget,
  buildAiDemoData,
  type AiDemoData,
} from "@/../scripts/seed-ai-demo";
import { planEscalations, type WaitingItem } from "@/server/automations/escalations";
import { planFollowUps, type BookingFollowUp, type StaleLead } from "@/server/automations/followups";
import { planGarageReminders, type GarageVehicle } from "@/server/automations/garage";
import { planOutcomeReminders } from "@/server/automations/outcomes";
import { planReminders, type ReminderBooking } from "@/server/automations/reminders";
import { istDateString } from "@/lib/ist-format";
import { planDigests, isDigestEmpty, type DigestFacts } from "@/server/automations/digests";
import { computePriceBand } from "@/lib/price-band";

// A fixed "now" in the middle of an IST day, so the windows below are deterministic.
const NOW = new Date("2026-11-08T08:00:00Z");
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const data: AiDemoData = buildAiDemoData(NOW);
const byId = (rows: Record<string, unknown>[]) => new Map(rows.map((r) => [r.id as string, r]));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("the DEV-only guard", () => {
  const ok = {
    SUPABASE_PROJECT_REF: DEV_REF,
    NEXT_PUBLIC_SUPABASE_URL: `https://${DEV_REF}.supabase.co`,
    SUPABASE_SECRET_KEY: "x",
    NODE_ENV: "development",
  };

  it("accepts only the DEV project", () => {
    expect(assertDevTarget(ok).ok).toBe(true);
  });

  it.each([
    ["the production ref", { ...ok, SUPABASE_PROJECT_REF: "ajumkjokagqfdikfguti" }],
    ["the old deleted ref", { ...ok, SUPABASE_PROJECT_REF: "gmyrehlrmifxckszrdje" }],
    ["another project", { ...ok, SUPABASE_PROJECT_REF: "someotherprojectref" }],
    ["no project ref", { ...ok, SUPABASE_PROJECT_REF: "" }],
    ["a production URL behind a DEV ref", { ...ok, NEXT_PUBLIC_SUPABASE_URL: "https://ajumkjokagqfdikfguti.supabase.co" }],
    ["a missing URL", { ...ok, NEXT_PUBLIC_SUPABASE_URL: "" }],
    ["APP_ENV=production", { ...ok, APP_ENV: "production" }],
    ["NODE_ENV=production", { ...ok, NODE_ENV: "production" }],
    ["a missing service key", { ...ok, SUPABASE_SECRET_KEY: "" }],
  ])("refuses %s", (_name, env) => {
    expect(assertDevTarget(env).ok).toBe(false);
  });
});

describe("every row is valid and self-consistent", () => {
  it("owns only ids starting 5eed, unique per table, in UUID form", () => {
    for (const [key, table] of TABLE_ORDER) {
      const ids = data[key].map((r) => r.id as string);
      expect(ids.length, table).toBeGreaterThan(0);
      expect(new Set(ids).size, `${table} ids unique`).toBe(ids.length);
      for (const id of ids) {
        expect(id, table).toMatch(UUID);
        expect(id.startsWith("5eed"), `${table} ${id}`).toBe(true);
      }
    }
  });

  it("is deterministic for the same moment", () => {
    expect(JSON.stringify(buildAiDemoData(NOW))).toBe(JSON.stringify(data));
  });

  it("contact times fall after creation and never in the future", () => {
    for (const l of data.leads) {
      if (!l.first_contacted_at) continue;
      const created = new Date(l.created_at as string).getTime();
      const contacted = new Date(l.first_contacted_at as string).getTime();
      expect(contacted, String(l.ref)).toBeGreaterThanOrEqual(created);
      expect(contacted, String(l.ref)).toBeLessThanOrEqual(NOW.getTime());
    }
    for (const e of data.leadEvents) {
      expect(new Date(e.created_at as string).getTime(), String(e.type)).toBeLessThanOrEqual(NOW.getTime());
    }
  });

  it("leads satisfy the table's rules: phone format, unique ref, enums, dedupe key", () => {
    const refs = new Set<string>();
    const sourceRefs = new Set<string>();
    for (const l of data.leads) {
      expect(l.phone as string, String(l.ref)).toMatch(/^\+91[6-9][0-9]{9}$/);
      expect(refs.has(l.ref as string)).toBe(false);
      refs.add(l.ref as string);
      expect(["new", "contacted", "test_drive_booked", "negotiating", "won", "lost"]).toContain(l.status);
      expect(["web", "portal", "social", "walkin", "chat", "trade_in"]).toContain(l.source);
      if (l.source_ref) {
        const key = `${l.source}:${l.source_ref}`;
        expect(sourceRefs.has(key)).toBe(false);
        sourceRefs.add(key);
      }
      if (l.status === "lost") expect(l.lost_reason).toBeTruthy();
    }
  });

  it("every foreign key points at a seeded row or at a real persona", () => {
    const personas = new Set<string>(Object.values(PERSONAS));
    const leads = byId(data.leads);
    const slots = byId(data.slots);
    const bookings = byId(data.bookings);
    const vehicles = byId(data.vehicles);
    const convs = byId(data.conversations);

    for (const l of data.leads) expect(personas.has(l.assigned_to as string), "lead assignee").toBe(true);
    for (const e of data.leadEvents) {
      expect(leads.has(e.lead_id as string)).toBe(true);
      if (e.actor_id) expect(personas.has(e.actor_id as string)).toBe(true);
    }
    for (const b of data.bookings) {
      expect(slots.has(b.slot_id as string)).toBe(true);
      expect(b.user_id).toBe(PERSONAS.buyer);
      if (b.lead_id) expect(leads.has(b.lead_id as string)).toBe(true);
    }
    for (const r of data.serviceRecords) {
      expect(vehicles.has(r.vehicle_id as string)).toBe(true);
      if (r.booking_id) expect(bookings.has(r.booking_id as string)).toBe(true);
    }
    for (const m of data.messages) expect(convs.has(m.conversation_id as string)).toBe(true);
    for (const c of data.conversations) {
      if (c.lead_id) expect(leads.has(c.lead_id as string)).toBe(true);
      expect(Boolean(c.user_id) || Boolean(c.guest_token), "chat owner").toBe(true);
    }
    for (const t of data.tasks) {
      expect(leads.has(t.lead_id as string)).toBe(true);
      if (t.assigned_to) expect(personas.has(t.assigned_to as string)).toBe(true);
    }
    for (const row of [...data.vehicles, ...data.consents, ...data.savedItems, ...data.tradeIns]) {
      expect(row.user_id).toBe(PERSONAS.buyer);
    }
    for (const a of data.aiLogs) {
      if (a.lead_id) expect(leads.has(a.lead_id as string)).toBe(true);
      if (a.user_id) expect(personas.has(a.user_id as string)).toBe(true);
    }
  });

  it("slots respect capacity and never collide on (kind, resource, start)", () => {
    const seen = new Set<string>();
    for (const s of data.slots) {
      expect(s.booked_count as number).toBeLessThanOrEqual(s.capacity as number);
      const resource = (s.demo_car_id ?? s.workshop_id ?? s.showroom_id) as string;
      const key = `${s.kind}|${resource}|${s.starts_at}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
      expect(new Date(s.ends_at as string).getTime()).toBeGreaterThan(new Date(s.starts_at as string).getTime());
    }
    // one confirmed booking per (user, slot)
    const pairs = data.bookings.filter((b) => b.status === "confirmed").map((b) => `${b.user_id}|${b.slot_id}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it("garage rows follow the table checks and mask the registration number", () => {
    for (const v of data.vehicles) {
      const reg = v.reg_no_private as string;
      expect(reg.length).toBeGreaterThanOrEqual(6);
      expect(reg.length).toBeLessThanOrEqual(14);
      expect(String(v.reg_masked)).toContain("**");
      expect(String(v.reg_masked)).not.toContain(reg);
    }
    const regs = new Set(data.vehicles.map((v) => `${v.user_id}|${v.reg_no_private}`));
    expect(regs.size).toBe(data.vehicles.length);
  });

  it("consents leave marketing off and carry a hash", () => {
    expect(data.consents.map((c) => c.purpose).sort()).toEqual(["lead_contact", "service_contact", "terms_privacy"]);
    for (const c of data.consents) expect(String(c.text_hash)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ai_logs use the statuses and features the audit panel and budget expect", () => {
    const features = new Set(["lead_summary", "chat", "lead_agent", "digest", "price_band_note", "handoff_brief"]);
    for (const a of data.aiLogs) {
      expect(["ok", "fallback", "blocked", "error"]).toContain(a.status);
      expect(features.has(a.feature as string)).toBe(true);
    }
    const actions = data.aiLogs.map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["copilot_generated", "reply_sent_edited", "reply_sent_unedited", "chat_answered", "agent_suggested"]));
    // an edited reply is one the audit panel can diff: draft in prompt, what was sent in response
    const edited = data.aiLogs.find((a) => a.action === "reply_sent_edited")!;
    expect(edited.prompt).not.toBe(edited.response);
  });
});

describe("the demo lands inside the windows the automations select", () => {
  const leads = byId(data.leads);
  const buyer = { name: "Aditya Mishra", email: "dev-buyer@vrooma.in", whatsapp: "+919876500001" };
  const slotOf = (b: Record<string, unknown>) => byId(data.slots).get(b.slot_id as string)!;
  const booking = (n: number) => data.bookings[n - 1];

  it("booking reminders: tomorrow's drive and service get the 24 h reminder, the drive in 2.5 h gets the 3 h one", () => {
    const rb: ReminderBooking[] = data.bookings.map((b) => ({
      id: b.id as string,
      ref: b.ref as string,
      created_at: b.created_at as string,
      kind: b.kind as "test_drive" | "service",
      status: b.status as string,
      car: (b.vehicle_info as Record<string, string>).model_name,
      startsAt: slotOf(b).starts_at as string,
      place: "Hazratganj",
      name: buyer.name,
      email: buyer.email,
      whatsapp: buyer.whatsapp,
      leadId: (b.lead_id as string) ?? null,
    }));
    const keys = planReminders(rb, NOW).map((r) => r.idempotency_key).sort();
    expect(keys).toEqual(
      [
        `rem24:${booking(1).id}:email`, `rem24:${booking(1).id}:wa`,
        `rem24:${booking(6).id}:email`, `rem24:${booking(6).id}:wa`,
        `rem2:${booking(2).id}:email`, `rem2:${booking(2).id}:wa`,
      ].sort(),
    );
  });

  it("outcome prompt: exactly the drive that ended 1-24 h ago and is still confirmed", () => {
    const stuck = data.bookings.filter((b) => {
      const end = new Date(slotOf(b).ends_at as string).getTime();
      return b.status === "confirmed" && NOW.getTime() - end > HOUR && NOW.getTime() - end < DAY;
    });
    expect(stuck.map((b) => b.ref)).toEqual(["BK-D-0005"]);
    const rows = planOutcomeReminders(stuck.map((b) => ({ id: b.id as string, ref: b.ref as string, kind: "test_drive" as const, endedAt: slotOf(b).ends_at as string, buyer: buyer.name, place: "Hazratganj", ownerEmail: "dev-consultant@vrooma.in", leadId: b.lead_id as string })));
    expect(rows).toHaveLength(1);
  });

  it("escalations: one lead uncontacted 15-60 min, one chat waiting 10-60 min", () => {
    const waitingLeads = data.leads.filter((l) => {
      const age = NOW.getTime() - new Date(l.created_at as string).getTime();
      return l.status === "new" && !l.first_contacted_at && age > 15 * MIN && age < 60 * MIN;
    });
    expect(waitingLeads.map((l) => l.ref)).toEqual(["LD-D-0002"]);
    const waitingChats = data.conversations.filter((c) => {
      const age = NOW.getTime() - new Date(c.handoff_at as string).getTime();
      return c.status === "waiting" && !c.first_staff_reply_at && age > 10 * MIN && age < 60 * MIN;
    });
    expect(waitingChats).toHaveLength(1);
    const items: WaitingItem[] = [
      { id: waitingLeads[0].id as string, kind: "lead", label: "x", waitingMinutes: 25, consultantEmail: "a@b.in" },
      { id: waitingChats[0].id as string, kind: "chat", label: "y", waitingMinutes: 12, consultantEmail: "a@b.in" },
    ];
    expect(planEscalations(items, { ALERT_EMAIL: "ops@vrooma.in" })).toHaveLength(4);
  });

  it("follow-ups: two stale leads, one post-drive, one no-show; won/lost and fresh leads are left alone", () => {
    const stale = data.leads.filter((l) => {
      const idle = NOW.getTime() - new Date(l.status_changed_at as string).getTime();
      const hasRecentEvent = data.leadEvents.some((e) => e.lead_id === l.id && NOW.getTime() - new Date(e.created_at as string).getTime() < 3 * DAY);
      return ["contacted", "negotiating"].includes(l.status as string) && idle > 3 * DAY && idle < 14 * DAY && !hasRecentEvent;
    });
    expect(stale.map((l) => l.ref)).toEqual(["LD-D-0004", "LD-D-0005"]);
    const toStale = (l: Record<string, unknown>): StaleLead => ({
      leadId: l.id as string, ref: l.ref as string, name: l.name as string, status: l.status as string,
      idleDays: Math.floor((NOW.getTime() - new Date(l.status_changed_at as string).getTime()) / DAY),
      stageDate: String(l.status_changed_at).slice(0, 10), consultantId: l.assigned_to as string, consultantEmail: "c@vrooma.in",
    });
    const drove = (b: Record<string, unknown>): BookingFollowUp => ({ bookingId: b.id as string, leadId: b.lead_id as string, leadName: "Aditya", leadRef: null, car: "Model S", consultantId: null, consultantEmail: null });
    const postDrive = data.bookings.filter((b) => b.kind === "test_drive" && b.status === "completed" && NOW.getTime() - new Date(slotOf(b).ends_at as string).getTime() > 3 * HOUR && NOW.getTime() - new Date(slotOf(b).ends_at as string).getTime() < 48 * HOUR);
    const noShow = data.bookings.filter((b) => b.status === "no_show" && NOW.getTime() - new Date(slotOf(b).ends_at as string).getTime() < 48 * HOUR);
    expect(postDrive).toHaveLength(1);
    expect(noShow).toHaveLength(1);

    const plan = planFollowUps({ stale: stale.map(toStale), postDrive: postDrive.map(drove), noShows: noShow.map(drove) }, NOW, { ALERT_EMAIL: "ops@vrooma.in" });
    // the seeded tasks use the automations' own keys, so the automation will not create a second copy
    const seeded = new Set(data.tasks.map((t) => t.idempotency_key));
    for (const task of plan.tasks) expect(seeded.has(task.idempotency_key), task.idempotency_key).toBe(true);
    // won / lost leads never get one
    const closed = data.leads.filter((l) => ["won", "lost"].includes(l.status as string)).map((l) => l.id);
    for (const task of plan.tasks) expect(closed).not.toContain(task.lead_id);
    // the 9-day-old lead also alerts the mailbox
    expect(plan.rows.some((r) => r.template === "lead_stale_alert")).toBe(true);
  });

  it("garage: the Model H gets a service-due and an insurance reminder, expired PUC is not re-sent, the healthy Model C gets none", () => {
    const today = istDateString(NOW);
    const latestDue = new Map<string, string>();
    for (const r of [...data.serviceRecords].sort((a, b) => String(b.serviced_on).localeCompare(String(a.serviced_on)))) {
      if (!latestDue.has(r.vehicle_id as string)) latestDue.set(r.vehicle_id as string, r.next_due_on as string);
    }
    const garage: GarageVehicle[] = data.vehicles.map((v) => ({
      id: v.id as string, userId: v.user_id as string, modelName: v.model_name as string, regMasked: v.reg_masked as string,
      name: buyer.name, email: buyer.email, whatsapp: buyer.whatsapp,
      nextServiceOn: latestDue.get(v.id as string) ?? null,
      insuranceExpiry: v.insurance_expiry as string, pucExpiry: v.puc_expiry as string, warrantyEnd: v.warranty_end as string,
    }));
    const consented = new Set(data.consents.filter((c) => c.purpose === "service_contact" && c.granted).map((c) => c.user_id as string));
    const rows = planGarageReminders(garage, consented, today);
    const kinds = rows.filter((r) => r.channel === "email").map((r) => r.idempotency_key.split(":")[0]).sort();
    expect(kinds).toEqual(["insd30", "svcd14"]);
    expect(rows.every((r) => r.idempotency_key.includes(String(data.vehicles[0].id)))).toBe(true);
    expect(planGarageReminders(garage, new Set(), today)).toEqual([]); // opt-in matters
  });

  it("price band: every model with used stock has comparable past sales", () => {
    const models = new Set(data.sales.map((s) => s.model_name));
    for (const m of ["Model H", "Model T", "Model X", "Model S", "Model C"]) expect(models.has(m), m).toBe(true);
    const sales = data.sales.map((s) => ({ model_name: s.model_name as string, year: s.year as number, fuel: s.fuel as string, km: s.km as number, sold_price: s.sold_price as number }));
    const band = computePriceBand({ model_name: "Model H", year: 2023, km: 22400, fuel: "petrol" }, sales as never);
    expect(band).not.toBeNull();
    expect(band!.sampleSize).toBeGreaterThanOrEqual(3);
    expect(band!.low).toBeLessThan(band!.high);
  });

  it("digests: each role has something to show, and the principal's day looks like a real day", () => {
    const yesterday = new Date(NOW.getTime() - DAY);
    const yStart = new Date(`${istDateString(yesterday)}T00:00:00+05:30`).getTime();
    const ly = data.leads.filter((l) => new Date(l.created_at as string).getTime() >= yStart && new Date(l.created_at as string).getTime() < yStart + DAY);
    // the 13 seeded for yesterday, plus the used-car enquiry that also arrived yesterday afternoon
    expect(ly.length).toBeGreaterThanOrEqual(13);
    const inSla = ly.filter((l) => l.first_contacted_at && (l.first_contacted_at as string) <= (l.sla_due_at as string)).length;
    expect(inSla / ly.length).toBeGreaterThan(0.7);
    expect(inSla / ly.length).toBeLessThan(0.95);

    const yCalls = data.calls.filter((c) => new Date(c.started_at as string).getTime() >= yStart && new Date(c.started_at as string).getTime() < yStart + DAY);
    const missed = yCalls.filter((c) => c.outcome === "missed").length;
    expect(missed / yCalls.length).toBeGreaterThan(0.05);
    expect(missed / yCalls.length).toBeLessThan(0.12);
    expect(["answered", "missed", "voicemail"]).toEqual(expect.arrayContaining([...new Set(data.calls.map((c) => c.outcome as string))]));

    const consultantFacts: DigestFacts = { role: "consultant", facts: { uncontactedNew: 2, openLeads: 9, openTasks: 5, overdueTasks: 1, todaysBookings: [], unmarkedBookings: 1 } };
    expect(isDigestEmpty(consultantFacts)).toBe(false);
    expect(planDigests([{ recipient: { id: "c", name: "Dev Consultant", email: "dev-consultant@vrooma.in", role: "consultant" }, data: consultantFacts }], NOW)).toHaveLength(1);
  });
});

describe("it does not touch what already exists", () => {
  const source = fs.readFileSync("scripts/seed-ai-demo.ts", "utf8");

  it("only deletes by the ids it owns, never by table or by a broad filter", () => {
    expect(source).not.toMatch(/\.delete\(\)\s*\.(neq|gt|lt|gte|lte|like|ilike|is|not)\b/);
    expect(source).not.toMatch(/\.delete\(\)\s*;/);
    expect(source).toMatch(/\.delete\(\)\.in\("id", owned/);
  });

  it("does not write to catalog tables", () => {
    const tables = TABLE_ORDER.map(([, t]) => t);
    for (const forbidden of ["models", "variants", "used_cars", "showrooms", "workshops", "price_rules", "offers", "banners", "profiles", "cron_heartbeats", "messages_outbox"]) {
      expect(tables).not.toContain(forbidden);
    }
  });

  it("leaves seed.sql and the migrations alone (no demo rows were added to them)", () => {
    expect(fs.readFileSync("supabase/seed.sql", "utf8")).not.toContain("5eed");
    for (const f of fs.readdirSync("supabase/migrations")) {
      expect(fs.readFileSync(`supabase/migrations/${f}`, "utf8"), f).not.toMatch(/'5eed[0-9a-f]{4}-/);
    }
  });
});
