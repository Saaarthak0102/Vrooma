/**
 * scripts/seed-ai-demo.ts
 *
 * DEV-ONLY demo data for the AI features: leads and their timelines, follow-up tasks, bookings, the owner garage and
 * service history, chats, consents, trade-ins, past used-car sales (for the price band), call logs and an AI audit log.
 *
 * It only INSERTS rows whose ids start with "5eed" (its own prefix); nothing already in the database or in
 * supabase/seed.sql is edited. `--reset` deletes only those ids. Dates are relative to "now", so the date-driven
 * features (reminders, escalations, stale leads, expiry chips) are live each time it runs; run it again to refresh them.
 *
 * SAFETY (same rules as seed-dev-users.ts): DEV project 'eobtzcwinjmimzisypca' only; the production ref
 * 'ajumkjokagqfdikfguti' and the old ref 'gmyrehlrmifxckszrdje' are rejected; APP_ENV / NODE_ENV production is rejected;
 * the Supabase URL must match the same ref. Secrets are never printed.
 *
 * Needs: dev users (scripts/seed-dev-users.ts) and migrations 0035-0041 applied.
 *
 * Usage:
 *   SUPABASE_PROJECT_REF=eobtzcwinjmimzisypca node --experimental-strip-types scripts/seed-ai-demo.ts [--dry-run] [--reset]
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

export const DEV_REF = "eobtzcwinjmimzisypca";
export const FORBIDDEN_REFS = new Set(["ajumkjokagqfdikfguti", "gmyrehlrmifxckszrdje"]);

export type GuardResult = { ok: true; url: string } | { ok: false; error: string };

/** Refuses anything that is not the DEV project. Pure, so it is unit tested. */
export function assertDevTarget(env: Record<string, string | undefined>): GuardResult {
  if ((env.APP_ENV || "").toLowerCase() === "production" || (env.NODE_ENV || "").toLowerCase() === "production") {
    return { ok: false, error: "BLOCKED: APP_ENV or NODE_ENV is production." };
  }
  const ref = (env.SUPABASE_PROJECT_REF || env.PROJECT_REF || "").trim();
  if (!ref) return { ok: false, error: `BLOCKED: SUPABASE_PROJECT_REF is required (expected '${DEV_REF}').` };
  if (FORBIDDEN_REFS.has(ref)) return { ok: false, error: `BLOCKED: '${ref}' is a forbidden project reference.` };
  if (ref !== DEV_REF) return { ok: false, error: `BLOCKED: '${ref}' is not the DEV project '${DEV_REF}'.` };

  const url = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").trim();
  const m = url.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i);
  if (!m) return { ok: false, error: "BLOCKED: NEXT_PUBLIC_SUPABASE_URL is missing or not a Supabase project URL." };
  const urlRef = m[1].toLowerCase();
  if (FORBIDDEN_REFS.has(urlRef) || urlRef !== DEV_REF) {
    return { ok: false, error: `BLOCKED: the Supabase URL points at '${urlRef}', not the DEV project.` };
  }
  if (!(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) {
    return { ok: false, error: "BLOCKED: SUPABASE_SECRET_KEY (service role) is required." };
  }
  return { ok: true, url };
}

// ---------------------------------------------------------------------------------------------------------------------
// Ids of things that already exist (seed.sql and seed-dev-users.ts). Nothing here is created by this script.
// ---------------------------------------------------------------------------------------------------------------------
const P = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
export const PERSONAS = {
  buyer: P(1),
  c10: P(10), // Dev Consultant (Hazratganj)
  c11: P(11), // Rohit Verma
  c12: P(12), // Ananya Shukla
  c13: P(13), // Faizan Khan (Gomti Nagar)
  c14: P(14), // Deepak Tripathi (Gomti Nagar)
  manager: P(19), // Vivek Saxena
  admin: P(99), // Sanjay Singhania
} as const;
const S1 = "a0000001-0000-0000-0000-000000000001";
const S2 = "a0000001-0000-0000-0000-000000000002";
const W1 = "b0000001-0000-0000-0000-000000000001";
const W2 = "b0000001-0000-0000-0000-000000000002";
const DEMO_CAR = (n: number) => `dc000001-0000-0000-0000-${String(n).padStart(12, "0")}`;
const MODEL = (n: number) => `d0000001-0000-0000-0000-${String(n).padStart(12, "0")}`; // 1 H, 2 C, 3 S, 4 X, 5 T

// ---------------------------------------------------------------------------------------------------------------------
// Ids this script owns: every one starts with "5eed".
// ---------------------------------------------------------------------------------------------------------------------
const PREFIX = {
  lead: "5eed0010",
  booking: "5eed0020",
  slot: "5eed0030",
  event: "5eed0040",
  task: "5eed0050",
  ailog: "5eed0060",
  conv: "5eed0070",
  msg: "5eed0071",
  vehicle: "5eed0080",
  record: "5eed0081",
  consent: "5eed0090",
  call: "5eed00a0",
  sale: "5eed00b0",
  trade: "5eed00c0",
  saved: "5eed00d0",
} as const;
const oid = (prefix: string, n: number) => `${prefix}-0000-0000-0000-${n.toString(16).padStart(12, "0")}`;

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

type Row = Record<string, unknown>;

export interface AiDemoData {
  sales: Row[];
  slots: Row[];
  leads: Row[];
  leadEvents: Row[];
  bookings: Row[];
  consents: Row[];
  vehicles: Row[];
  serviceRecords: Row[];
  savedItems: Row[];
  tradeIns: Row[];
  conversations: Row[];
  messages: Row[];
  tasks: Row[];
  aiLogs: Row[];
  calls: Row[];
}

/** Insert order (parents first). Reset deletes in the reverse order. */
export const TABLE_ORDER: [keyof AiDemoData, string][] = [
  ["sales", "used_car_sales_history"],
  ["slots", "slots"],
  ["leads", "leads"],
  ["leadEvents", "lead_events"],
  ["bookings", "bookings"],
  ["consents", "consents"],
  ["vehicles", "owner_vehicles"],
  ["serviceRecords", "service_records"],
  ["savedItems", "saved_items"],
  ["tradeIns", "trade_in_requests"],
  ["conversations", "chat_conversations"],
  ["messages", "chat_messages"],
  ["tasks", "lead_tasks"],
  ["aiLogs", "ai_logs"],
  ["calls", "call_logs"],
];

const istDate = (ms: number) => new Date(ms + 5.5 * HOUR).toISOString().slice(0, 10);

/** Builds every row, with dates relative to `now`. Pure: no database, no clock other than the argument. */
export function buildAiDemoData(now: Date): AiDemoData {
  const t = now.getTime();
  const ago = (ms: number) => new Date(t - ms).toISOString();
  const ahead = (ms: number) => new Date(t + ms).toISOString();
  /** A wall-clock time in India, `days` from today: istAt(1, "11:07") is tomorrow 11:07 IST. */
  const istAt = (days: number, hhmm: string) => new Date(`${istDate(t + days * DAY)}T${hhmm}:00+05:30`).toISOString();
  const dateOnly = (offsetDays: number) => istDate(t + offsetDays * DAY);
  const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

  // ---------------------------------------------------------------- past used-car sales (feeds the price band)
  const saleSpec: [string, number, string, number, number, number][] = [
    // model, year, fuel, km, price, days ago
    ["Model H", 2023, "petrol", 19000, 1085000, 24],
    ["Model H", 2023, "petrol", 24500, 1040000, 61],
    ["Model H", 2022, "petrol", 38000, 955000, 97],
    ["Model H", 2021, "petrol", 52000, 870000, 143],
    ["Model H", 2020, "petrol", 66000, 760000, 201],
    ["Model H", 2020, "petrol", 71500, 735000, 262],
    ["Model T", 2022, "diesel", 34000, 1360000, 33],
    ["Model T", 2022, "diesel", 41000, 1295000, 88],
    ["Model T", 2021, "diesel", 55000, 1180000, 150],
    ["Model T", 2023, "diesel", 21000, 1475000, 215],
    ["Model X", 2023, "ev", 14000, 1520000, 40],
    ["Model X", 2022, "ev", 28000, 1310000, 125],
    ["Model X", 2023, "ev", 19500, 1460000, 230],
    ["Model S", 2023, "cng", 17500, 610000, 52],
    ["Model S", 2022, "cng", 33000, 545000, 118],
    ["Model S", 2021, "cng", 48000, 485000, 190],
    ["Model C", 2021, "petrol", 50000, 780000, 70],
    ["Model C", 2020, "petrol", 62000, 695000, 160],
    ["Model C", 2022, "petrol", 36000, 850000, 300],
  ];
  const sales: Row[] = saleSpec.map(([model_name, year, fuel, km, sold_price, d], i) => ({
    id: oid(PREFIX.sale, i + 1),
    model_name,
    year,
    fuel,
    km,
    sold_price,
    sold_date: dateOnly(-d),
  }));

  // ---------------------------------------------------------------- slots (off-grid minutes: never clash with generate_slots)
  const slot = (n: number, kind: "test_drive" | "service", resource: { demo?: string; showroom?: string; workshop?: string }, start: string, minutes: number, booked: number, capacity = 1): Row => ({
    id: oid(PREFIX.slot, n),
    kind,
    demo_car_id: resource.demo ?? null,
    showroom_id: resource.showroom ?? null,
    workshop_id: resource.workshop ?? null,
    starts_at: start,
    ends_at: new Date(new Date(start).getTime() + minutes * MIN).toISOString(),
    capacity,
    booked_count: booked,
    is_active: true,
  });
  const slots: Row[] = [
    slot(1, "test_drive", { demo: DEMO_CAR(1), showroom: S1 }, ahead(20 * HOUR), 30, 1), // B1: in 20 h (inside the 24 h reminder window at any time of day)
    slot(2, "test_drive", { demo: DEMO_CAR(2), showroom: S1 }, ahead(150 * MIN), 30, 1), // B2: in 2.5 h
    slot(3, "test_drive", { demo: DEMO_CAR(3), showroom: S2 }, ago(330 * MIN), 30, 1), // B3: ended 5 h ago
    slot(4, "test_drive", { demo: DEMO_CAR(1), showroom: S1 }, ago(630 * MIN), 30, 1), // B4: ended 10 h ago
    slot(5, "test_drive", { demo: DEMO_CAR(2), showroom: S1 }, ago(210 * MIN), 30, 1), // B5: ended 3 h ago
    slot(6, "service", { workshop: W1 }, ahead(22 * HOUR), 90, 1), // B6: in 22 h
    slot(7, "service", { workshop: W1 }, new Date(new Date(`${istDate(t - 170 * DAY)}T10:07:00+05:30`)).toISOString(), 90, 1), // B7: 170 days ago
    // free slots the agent and the chatbot can offer
    slot(8, "test_drive", { demo: DEMO_CAR(1), showroom: S1 }, istAt(2, "10:37"), 30, 0, 2),
    slot(9, "test_drive", { demo: DEMO_CAR(1), showroom: S1 }, istAt(2, "12:37"), 30, 0, 2),
    slot(10, "test_drive", { demo: DEMO_CAR(1), showroom: S1 }, istAt(2, "15:37"), 30, 0, 2),
    slot(11, "test_drive", { demo: DEMO_CAR(1), showroom: S1 }, istAt(3, "11:37"), 30, 0, 2),
    slot(12, "test_drive", { demo: DEMO_CAR(3), showroom: S2 }, istAt(2, "11:37"), 30, 0, 2),
  ];

  // ---------------------------------------------------------------- leads
  let phoneSeq = 0;
  const phone = () => `+91900${String(1000000 + ++phoneSeq).padStart(7, "0")}`;
  const leadId = (n: number) => oid(PREFIX.lead, n);
  const profileAI = (interest: string, urgency: "high" | "medium" | "low", q: Partial<Record<"budget" | "timeline" | "fuel" | "finance" | "trade_in", string | boolean>>, suggestedAction: string) => ({
    interest,
    urgency,
    qualification: { budget: null, timeline: null, fuel: null, finance: null, trade_in: null, ...q },
    suggestedAction,
    origin: "ai",
  });

  interface LeadSpec {
    n: number;
    name: string;
    source: "web" | "portal" | "social" | "walkin" | "chat" | "trade_in";
    showroom: string;
    assignee: string;
    status: "new" | "contacted" | "test_drive_booked" | "negotiating" | "won" | "lost";
    createdAgo: number;
    /** Minutes after creation that a consultant first made contact (null = never). */
    contactedAfter?: number | null;
    statusChangedAgo?: number | null;
    breached?: boolean;
    model?: number;
    usedCarStockId?: string;
    message?: string | null;
    user?: boolean;
    ai?: { summary: string; draft: string; profile: Row; generatedAgo: number };
    lostReason?: string;
    sourceRef?: string;
    internalNotes?: string;
  }
  const leadSpecs: LeadSpec[] = [
    { n: 1, name: "Ritu Agarwal", source: "web", showroom: S1, assignee: PERSONAS.c10, status: "new", createdAgo: 2 * MIN, model: 1, message: "Looking for the Model H ZX petrol automatic. Can someone call me this evening?" },
    { n: 2, name: "Manish Pandey", source: "portal", showroom: S1, assignee: PERSONAS.c11, status: "new", createdAgo: 25 * MIN, breached: true, model: 2, message: "Interested in Model C diesel. Budget around 14 lakh. Need EMI details." },
    { n: 3, name: "Vikas Rathore", source: "web", showroom: S2, assignee: PERSONAS.c13, status: "new", createdAgo: 8 * MIN, breached: true, model: 3, message: "I have a quote from another dealer. Give me 40,000 off on the Model S CNG or I will buy there." },
    {
      n: 4, name: "Neha Srivastava", source: "web", showroom: S1, assignee: PERSONAS.c10, status: "contacted", createdAgo: 5 * DAY, contactedAfter: 4, statusChangedAgo: 4 * DAY, model: 1,
      message: "Comparing Model H ZX and VX, petrol. Planning to buy this month.",
      ai: { summary: "Comparing the Model H ZX and VX petrol and plans to buy this month. Contacted four days ago with no reply since.", draft: "Namaste Neha, just checking in on the Model H. I can set up a test drive of both the ZX and the VX back to back. Would this weekend suit you?", profile: profileAI("Model H ZX / VX petrol", "medium", { timeline: "this month", fuel: "petrol" }, "Follow up and offer a back-to-back test drive of both variants"), generatedAgo: 4 * DAY },
    },
    {
      n: 5, name: "Alok Dwivedi", source: "walkin", showroom: S1, assignee: PERSONAS.c12, status: "negotiating", createdAgo: 14 * DAY, contactedAfter: 0, statusChangedAgo: 9 * DAY, model: 2,
      message: "Walk-in. Liked the Model C diesel. Wants finance for 5 years and a trade-in of his old hatchback.",
      ai: { summary: "Walk-in who liked the Model C diesel. Needs a 5-year loan and wants to trade in his old hatchback. Negotiation went quiet nine days ago.", draft: "Namaste Alok, thank you for visiting us. I have put together the finance options for the Model C and can have your trade-in valued whenever you are free. When shall we meet?", profile: profileAI("Model C diesel", "high", { fuel: "diesel", finance: true, trade_in: true }, "Send finance options, book a trade-in valuation and a showroom visit"), generatedAgo: 9 * DAY },
    },
    { n: 6, name: "Prakhar Mehra", source: "social", showroom: S2, assignee: PERSONAS.c14, status: "test_drive_booked", createdAgo: 3 * DAY, contactedAfter: 10, statusChangedAgo: 2 * DAY, model: 5, message: "Saw the Model T 4x4 on Instagram. Can I drive it this week?" },
    {
      n: 7, name: "Shalini Gupta", source: "portal", showroom: S1, assignee: PERSONAS.c10, status: "contacted", createdAgo: 22 * HOUR, contactedAfter: 100, statusChangedAgo: 20 * HOUR, usedCarStockId: "UC-1182",
      message: "Is UC-1182 still available? Can I see the inspection report?",
      ai: { summary: "Asking whether certified Model C UC-1182 is still available and wants the inspection report. Contacted yesterday.", draft: "Namaste Shalini, yes, UC-1182 is available. It has passed our 140-point inspection and I can share the report when you visit. May I reserve a viewing slot for you tomorrow?", profile: profileAI("Certified used Model C", "medium", {}, "Share the inspection report and lock a viewing slot"), generatedAgo: 20 * HOUR },
    },
    { n: 8, name: "Imran Qureshi", source: "trade_in", showroom: S1, assignee: PERSONAS.c11, status: "contacted", createdAgo: 2 * DAY, contactedAfter: 25, statusChangedAgo: 1 * DAY, message: "Trade-in request: 2018 hatchback, 62,000 km, good condition. Looking at a Model S." },
    { n: 9, name: "Priya Nair", source: "chat", showroom: S1, assignee: PERSONAS.c10, status: "new", createdAgo: 12 * MIN, breached: true, sourceRef: oid(PREFIX.conv, 2), message: "Chat handoff. Priya Nair asked about the on-road price and EMI and wants a test drive. Last question: \"can I book a drive for Saturday?\"" },
    { n: 10, name: "Kunal Bhatia", source: "web", showroom: S1, assignee: PERSONAS.c11, status: "won", createdAgo: 20 * DAY, contactedAfter: 3, statusChangedAgo: 6 * DAY, model: 3, message: "Model S ZX AMT, ready to book." },
    { n: 11, name: "Farah Siddiqui", source: "portal", showroom: S2, assignee: PERSONAS.c13, status: "lost", createdAgo: 16 * DAY, contactedAfter: 20, statusChangedAgo: 10 * DAY, model: 4, lostReason: "Chose a competitor with faster delivery", message: "Model X EV, how soon can it be delivered?" },
    // leads that belong to the dev buyer and carry bookings
    { n: 12, name: "Aditya Mishra", source: "web", showroom: S1, assignee: PERSONAS.c10, status: "test_drive_booked", createdAgo: 3 * DAY, contactedAfter: 3, statusChangedAgo: 3 * DAY, model: 1, user: true, message: "Booked a Model H ZX test drive on the website.", ai: { summary: "Booked a Model H ZX test drive for the next day. Keen and responsive.", draft: "Namaste Aditya, your Model H ZX will be ready for your test drive. I will meet you at the showroom entrance.", profile: profileAI("Model H ZX petrol automatic", "high", { fuel: "petrol" }, "Confirm the booked slot and have the car ready"), generatedAgo: 3 * DAY } },
    { n: 13, name: "Aditya Mishra", source: "web", showroom: S1, assignee: PERSONAS.c10, status: "test_drive_booked", createdAgo: 2 * DAY, contactedAfter: 4, statusChangedAgo: 2 * DAY, model: 2, user: true, message: "Test drive for the Model C diesel." },
    { n: 14, name: "Aditya Mishra", source: "web", showroom: S2, assignee: PERSONAS.c13, status: "test_drive_booked", createdAgo: 3 * DAY, contactedAfter: 6, statusChangedAgo: 3 * DAY, model: 3, user: true, message: "Model S CNG test drive, please." },
    { n: 15, name: "Aditya Mishra", source: "web", showroom: S1, assignee: PERSONAS.c10, status: "test_drive_booked", createdAgo: 4 * DAY, contactedAfter: 5, statusChangedAgo: 4 * DAY, model: 5, user: true, message: "Interested in the Model T 4x4 diesel." },
    { n: 16, name: "Aditya Mishra", source: "web", showroom: S1, assignee: PERSONAS.c10, status: "test_drive_booked", createdAgo: 4 * DAY, contactedAfter: 2, statusChangedAgo: 4 * DAY, model: 1, user: true, message: "Model H VX manual test drive." },
  ];

  // yesterday's leads, so the principal's digest and leak card have a believable response profile
  const yesterdayTimes = ["10:15", "10:40", "11:05", "11:50", "12:30", "13:10", "14:00", "15:20", "16:05", "17:30", "18:15", "19:00", "20:10"];
  const contactMinutes: (number | null)[] = [1, 2, 3, 2, 4, 1, 3, 9, 25, 2, 4, 1, null];
  const yesterdayNames = ["Rajat Khanna", "Meenal Joshi", "Sudhir Yadav", "Tanvi Kapoor", "Harsh Vardhan", "Deepika Rao", "Arvind Chauhan", "Nisha Bajpai", "Gaurav Tandon", "Swati Mishra", "Pankaj Awasthi", "Rekha Saxena", "Yash Dubey"];
  const crew = [PERSONAS.c10, PERSONAS.c11, PERSONAS.c12, PERSONAS.c13, PERSONAS.c14];
  const yesterdaySpecs: LeadSpec[] = yesterdayTimes.map((time, i) => {
    const created = new Date(istAt(-1, time)).getTime();
    const contacted = contactMinutes[i];
    const assignee = crew[i % crew.length];
    const status: LeadSpec["status"] = contacted === null ? "new" : i === 3 || i === 9 ? "won" : i === 6 ? "lost" : "contacted";
    return {
      n: 100 + i,
      name: yesterdayNames[i],
      source: (["web", "portal", "social", "walkin"] as const)[i % 4],
      showroom: assignee === PERSONAS.c13 || assignee === PERSONAS.c14 ? S2 : S1,
      assignee,
      status,
      createdAgo: t - created,
      contactedAfter: contacted,
      statusChangedAgo: contacted === null ? null : t - (created + contacted * MIN),
      breached: contacted === null || contacted > 5,
      model: (i % 5) + 1,
      message: null,
      lostReason: status === "lost" ? "Bought from another dealer" : undefined,
    };
  });

  const leads: Row[] = [];
  const leadEvents: Row[] = [];
  let eventSeq = 0;
  const event = (lead: number, type: string, at: string, payload: Row = {}, actor: string | null = null) =>
    leadEvents.push({ id: oid(PREFIX.event, ++eventSeq), lead_id: leadId(lead), type, payload, actor_id: actor, created_at: at });

  for (const s of [...leadSpecs, ...yesterdaySpecs]) {
    const created = t - s.createdAgo;
    const contactedAt = s.contactedAfter === null || s.contactedAfter === undefined ? null : created + s.contactedAfter * MIN;
    const statusChanged = s.statusChangedAgo === undefined || s.statusChangedAgo === null ? null : t - s.statusChangedAgo;
    const isBuyer = Boolean(s.user);
    leads.push({
      id: leadId(s.n),
      ref: `LD-D-${String(s.n).padStart(4, "0")}`,
      source: s.source,
      source_ref: s.sourceRef ?? null,
      user_id: isBuyer ? PERSONAS.buyer : null,
      name: s.name,
      phone: isBuyer ? "+919876500001" : phone(),
      email: isBuyer ? "dev-buyer@vrooma.in" : `demo.lead${s.n}@example.com`,
      showroom_id: s.showroom,
      model_id: s.model ? MODEL(s.model) : null,
      used_car_stock_id: s.usedCarStockId ?? null, // resolved to used_car_id by the runner
      message: s.message ?? null,
      status: s.status,
      assigned_to: s.assignee,
      assigned_at: new Date(created + MIN).toISOString(),
      sla_due_at: new Date(created + 5 * MIN).toISOString(),
      sla_breached_at: s.breached ? new Date(created + 6 * MIN).toISOString() : null,
      first_contacted_at: contactedAt ? new Date(contactedAt).toISOString() : null,
      status_changed_at: statusChanged ? new Date(statusChanged).toISOString() : s.status === "new" ? null : new Date(created).toISOString(),
      lost_reason: s.lostReason ?? null,
      internal_notes: null,
      ai_summary: s.ai?.summary ?? null,
      ai_draft: s.ai?.draft ?? null,
      ai_profile: s.ai?.profile ?? null,
      ai_generated_at: s.ai ? ago(s.ai.generatedAgo) : null,
      ai_input_hash: null,
      created_at: new Date(created).toISOString(),
    });

    event(s.n, "created", new Date(created).toISOString(), { source: s.source });
    event(s.n, "assigned", new Date(created + MIN).toISOString(), { to: s.assignee, rule: "showroom_model" });
    if (s.breached) event(s.n, "sla_breached", new Date(created + 6 * MIN).toISOString(), { sla_minutes: 5 });
    if (contactedAt) event(s.n, "contacted", new Date(contactedAt).toISOString(), { channel: "phone" }, s.assignee);
    if (statusChanged && s.status !== "new") event(s.n, "status_changed", new Date(statusChanged).toISOString(), { from: "contacted", to: s.status }, s.assignee);
  }
  // a couple of staff notes on the older leads (these are what the lead briefing reads)
  event(4, "note_added", ago(4 * DAY - 30 * MIN), { note: "Spoke for 5 minutes. Wants to compare ZX and VX. Will check with his wife and call back." }, PERSONAS.c10);
  event(5, "note_added", ago(9 * DAY), { note: "Offered 5-year finance. Customer wants the old hatchback valued first." }, PERSONAS.c12);
  event(7, "note_added", ago(20 * HOUR), { note: "Sent the inspection report on WhatsApp. Asked to visit tomorrow." }, PERSONAS.c10);
  event(10, "note_added", ago(7 * DAY), { note: "Booking amount received. Delivery planned next week." }, PERSONAS.c11);

  // ---------------------------------------------------------------- bookings (the dev buyer's)
  const booking = (n: number, ref: string, kind: "test_drive" | "service", slotN: number, status: "confirmed" | "completed" | "no_show", leadN: number | null, vehicle: Row, createdAgo: number, serviceType?: string): Row => ({
    id: oid(PREFIX.booking, n),
    ref,
    user_id: PERSONAS.buyer,
    slot_id: oid(PREFIX.slot, slotN),
    kind,
    status,
    lead_id: leadN ? leadId(leadN) : null,
    service_type_id: serviceType ?? null,
    vehicle_info: vehicle,
    notes: null,
    address: null,
    pincode: null,
    created_at: ago(createdAgo),
  });
  const bookings: Row[] = [
    booking(1, "BK-D-0001", "test_drive", 1, "confirmed", 12, { model_name: "Model H", variant_name: "ZX Automatic" }, 3 * DAY),
    booking(2, "BK-D-0002", "test_drive", 2, "confirmed", 13, { model_name: "Model C", variant_name: "ZX Automatic" }, 2 * DAY),
    booking(3, "BK-D-0003", "test_drive", 3, "completed", 14, { model_name: "Model S", variant_name: "VX S-CNG Manual" }, 3 * DAY),
    booking(4, "BK-D-0004", "test_drive", 4, "no_show", 15, { model_name: "Model T", variant_name: "4x4 Expedition Diesel AT" }, 4 * DAY),
    booking(5, "BK-D-0005", "test_drive", 5, "confirmed", 16, { model_name: "Model H", variant_name: "VX Manual" }, 4 * DAY),
    booking(6, "BK-D-0006", "service", 6, "confirmed", null, { model_name: "Model H", variant_name: "ZX Automatic", reg_no: "UP32HK4402" }, 3 * DAY, "c0000002-0000-0000-0000-000000000001"),
    booking(7, "BK-D-0007", "service", 7, "completed", null, { model_name: "Model H", variant_name: "ZX Automatic", reg_no: "UP32HK4402" }, 175 * DAY, "c0000002-0000-0000-0000-000000000001"),
  ];

  // ---------------------------------------------------------------- consents (the dev buyer; marketing deliberately left off)
  const consent = (n: number, purpose: string, source: string, text: string): Row => ({
    id: oid(PREFIX.consent, n),
    user_id: PERSONAS.buyer,
    subject_email: null,
    subject_phone: null,
    purpose,
    granted: true,
    policy_version: "2026.1",
    source,
    text_hash: sha(text),
    created_at: ago(30 * DAY),
  });
  const consents: Row[] = [
    consent(1, "terms_privacy", "onboarding", "I accept the terms and privacy policy."),
    consent(2, "lead_contact", "enquiry", "I consent to Vrooma contacting me about my enquiry."),
    consent(3, "service_contact", "onboarding", "I agree that Vrooma may message me about my car's service due date and its insurance, PUC and warranty expiry."),
  ];

  // ---------------------------------------------------------------- the dev buyer's garage and service history
  const vehicles: Row[] = [
    { id: oid(PREFIX.vehicle, 1), user_id: PERSONAS.buyer, reg_no_private: "UP32HK4402", reg_masked: "UP32 ** **** 4402", model_name: "Model H", variant_name: "ZX Automatic", purchase_date: dateOnly(-540), bought_from_vrooma: true, odometer_km: 21400, insurance_expiry: dateOnly(12), puc_expiry: dateOnly(-5), warranty_end: dateOnly(300), created_at: ago(540 * DAY) },
    { id: oid(PREFIX.vehicle, 2), user_id: PERSONAS.buyer, reg_no_private: "UP78AB2210", reg_masked: "UP78 ** **** 2210", model_name: "Model C", variant_name: "LX Manual", purchase_date: dateOnly(-400), bought_from_vrooma: false, odometer_km: 15800, insurance_expiry: dateOnly(200), puc_expiry: dateOnly(90), warranty_end: dateOnly(500), created_at: ago(120 * DAY) },
  ];
  const serviceRecords: Row[] = [
    { id: oid(PREFIX.record, 1), vehicle_id: oid(PREFIX.vehicle, 1), booking_id: null, serviced_on: dateOnly(-540), odometer_km: 1000, summary: "First free service", next_due_on: dateOnly(-360), next_due_km: 6000, created_by: PERSONAS.c12, created_at: ago(540 * DAY) },
    { id: oid(PREFIX.record, 2), vehicle_id: oid(PREFIX.vehicle, 1), booking_id: null, serviced_on: dateOnly(-350), odometer_km: 8100, summary: "Periodic service, oil and filters", next_due_on: dateOnly(-170), next_due_km: 18100, created_by: PERSONAS.c12, created_at: ago(350 * DAY) },
    { id: oid(PREFIX.record, 3), vehicle_id: oid(PREFIX.vehicle, 1), booking_id: oid(PREFIX.booking, 7), serviced_on: dateOnly(-170), odometer_km: 17800, summary: "Periodic service, brake pads checked", next_due_on: dateOnly(11), next_due_km: 27800, created_by: PERSONAS.c12, created_at: ago(170 * DAY) },
    { id: oid(PREFIX.record, 4), vehicle_id: oid(PREFIX.vehicle, 2), booking_id: null, serviced_on: dateOnly(-130), odometer_km: 14200, summary: "Periodic service", next_due_on: dateOnly(50), next_due_km: 24200, created_by: PERSONAS.c12, created_at: ago(130 * DAY) },
  ];

  const savedItems: Row[] = [
    { id: oid(PREFIX.saved, 1), user_id: PERSONAS.buyer, model_id: MODEL(4), used_car_stock_id: null, created_at: ago(3 * DAY) },
    { id: oid(PREFIX.saved, 2), user_id: PERSONAS.buyer, model_id: null, used_car_stock_id: "UC-1220", created_at: ago(5 * DAY) },
  ];
  const tradeIns: Row[] = [
    { id: oid(PREFIX.trade, 1), user_id: PERSONAS.buyer, lead_id: leadId(12), make: "Brand X", model: "Model S", year: 2018, km: 62000, condition: "good", notes: "Single owner, serviced at Vrooma.", photos: [], created_at: ago(3 * DAY) },
    { id: oid(PREFIX.trade, 2), user_id: PERSONAS.buyer, lead_id: null, make: "Other", model: "Hatchback 1.2", year: 2016, km: 88000, condition: "fair", notes: null, photos: [], created_at: ago(1 * DAY) },
  ];

  // ---------------------------------------------------------------- chats
  const guestToken = oid(PREFIX.conv, 0xa);
  const conversations: Row[] = [
    { id: oid(PREFIX.conv, 1), user_id: PERSONAS.buyer, guest_token: null, title: "EMI for the Model H", status: "resolved", lead_id: null, assigned_to: null, ai_context: {}, handoff_at: null, first_staff_reply_at: null, resolved_at: ago(2 * DAY - 10 * MIN), resolved_by: "buyer", created_at: ago(2 * DAY + 5 * MIN), last_message_at: ago(2 * DAY - 10 * MIN) },
    {
      id: oid(PREFIX.conv, 2), user_id: null, guest_token: guestToken, title: "Can I book a drive for Saturday?", status: "waiting", lead_id: leadId(9), assigned_to: PERSONAS.c10, handoff_at: ago(12 * MIN), first_staff_reply_at: null, resolved_at: null, resolved_by: null, created_at: ago(20 * MIN), last_message_at: ago(12 * MIN),
      ai_context: { summary: "Priya asked for the on-road price and EMI of a petrol sedan, then wanted a Saturday test drive and asked for a consultant.", intents: ["price", "emi", "test_drive"], buyerQuestions: ["what is the on road price for the Model H?", "EMI for 5 years?", "can I book a drive for Saturday?"], lastQuestion: "can I book a drive for Saturday?", suggestedReply: "Hi Priya, this is your Vrooma consultant. I can book your Saturday test drive right now. Which time suits you?", buyerName: "Priya Nair", signedIn: false, messageCount: 7, builtAt: ago(12 * MIN) },
    },
    {
      id: oid(PREFIX.conv, 3), user_id: PERSONAS.buyer, guest_token: null, title: "Question about my test drive", status: "live", lead_id: leadId(12), assigned_to: PERSONAS.c10, handoff_at: ago(2 * HOUR), first_staff_reply_at: ago(110 * MIN), resolved_at: null, resolved_by: null, created_at: ago(130 * MIN), last_message_at: ago(95 * MIN),
      ai_context: { summary: "Aditya asked whether he needs documents for his Model H test drive.", intents: ["test_drive"], buyerQuestions: ["do I need to carry my licence for the test drive?"], lastQuestion: "do I need to carry my licence for the test drive?", suggestedReply: "Hi Aditya, yes please bring your driving licence. I will meet you at the entrance.", buyerName: "Aditya Mishra", signedIn: true, messageCount: 4, builtAt: ago(2 * HOUR) },
    },
  ];
  let msgSeq = 0;
  const msg = (conv: number, role: "user" | "assistant" | "consultant" | "system", content: string, at: number, sender: string | null = null) =>
    ({ id: oid(PREFIX.msg, ++msgSeq), conversation_id: oid(PREFIX.conv, conv), role, content, sender_id: sender, created_at: new Date(at).toISOString() });
  const messages: Row[] = [
    msg(1, "user", "What would the EMI be on the Model H ZX for 5 years?", t - 2 * DAY - 5 * MIN),
    msg(1, "assistant", "At the assumed rate of 9.5%, a ₹10,00,000 loan over 60 months comes to about ₹20,998 a month. The full schedule is at /emi-calculator.\n\nIs your query solved, or would you like to connect with a Vrooma consultant?", t - 2 * DAY - 4 * MIN),
    msg(1, "user", "Yes, it's solved", t - 2 * DAY - 10 * MIN + 5 * MIN),
    msg(1, "assistant", "Glad I could help. Thank you for chatting with Vrooma. You can start a new chat any time.", t - 2 * DAY - 10 * MIN + 6 * MIN),
    msg(2, "user", "what is the on road price for the Model H?", t - 20 * MIN),
    msg(2, "assistant", "Every model page shows the ex-showroom price, and once you sign in you can see the full on-road breakup for your city, with a validity date. See /cars/model-h.\n\nIs your query solved, or would you like to connect with a Vrooma consultant?", t - 19 * MIN),
    msg(2, "user", "EMI for 5 years?", t - 17 * MIN),
    msg(2, "assistant", "Use the EMI calculator at /emi-calculator to set the loan amount, tenure and rate.\n\nIs your query solved, or would you like to connect with a Vrooma consultant?", t - 16 * MIN),
    msg(2, "user", "can I book a drive for Saturday?", t - 14 * MIN),
    msg(2, "user", "Connect me to a consultant", t - 12 * MIN - 5_000),
    msg(2, "system", "A consultant will reply here shortly.", t - 12 * MIN),
    msg(3, "user", "do I need to carry my licence for the test drive?", t - 130 * MIN),
    msg(3, "system", "You are connected with Dev Consultant. They will reply here shortly.", t - 120 * MIN),
    msg(3, "consultant", "Hi Aditya, yes please bring your driving licence. I will meet you at the showroom entrance.", t - 110 * MIN, PERSONAS.c10),
    msg(3, "user", "Great, see you then.", t - 95 * MIN),
  ];

  // ---------------------------------------------------------------- follow-up tasks (keys match the automations, so they never duplicate)
  const stageDay = (leadN: number) => String((leads.find((l) => l.id === leadId(leadN)) as Row).status_changed_at).slice(0, 10);
  const task = (n: number, leadN: number, assignee: string | null, kind: string, title: string, reason: string | null, dueOffset: number, source: string, key: string, status = "open", doneAgo?: number): Row => ({
    id: oid(PREFIX.task, n),
    lead_id: leadId(leadN),
    assigned_to: assignee,
    kind,
    title,
    reason,
    due_at: new Date(t + dueOffset).toISOString(),
    status,
    source,
    idempotency_key: key,
    created_by: source === "manual" ? assignee : null,
    created_at: ago(Math.max(0, -Math.min(0, dueOffset)) + 2 * HOUR),
    done_at: status === "done" && doneAgo !== undefined ? ago(doneAgo) : null,
  });
  const tasks: Row[] = [
    task(1, 4, PERSONAS.c10, "stale", "Follow up: Neha Srivastava has been quiet for 4 days", "No activity since the lead moved to contacted.", 3 * HOUR, "automation", `stale3:${leadId(4)}:${stageDay(4)}`),
    task(2, 5, PERSONAS.c12, "stale", "Follow up: Alok Dwivedi has been quiet for 9 days", "No activity since the lead moved to negotiating.", -5 * HOUR, "automation", `stale3:${leadId(5)}:${stageDay(5)}`),
    task(3, 1, PERSONAS.c10, "call_now", "Call the buyer now", "New lead, not contacted yet. The 5-minute SLA applies.", 0, "agent", "seed:task:3"),
    task(4, 3, null, "escalate", "Manager needed: Vikas Rathore", "The buyer asked for 40,000 off. Pricing talks belong with the manager, not in chat.", 0, "agent", "seed:task:4"),
    task(5, 10, PERSONAS.c11, "follow_up", "Confirm delivery date with Kunal", null, -6 * DAY, "manual", "seed:task:5", "done", 6 * DAY),
    task(6, 14, PERSONAS.c13, "post_drive", "Follow up after Aditya Mishra's test drive", "They drove the Model S. Ask how it went and what the next step is.", HOUR, "automation", `postdrive:${oid(PREFIX.booking, 3)}`),
    task(7, 15, PERSONAS.c10, "no_show", "Offer Aditya Mishra a new test drive slot", "They did not attend the booked test drive.", 2 * HOUR, "automation", `noshow:${oid(PREFIX.booking, 4)}`),
    task(8, 7, PERSONAS.c10, "follow_up", "Share the inspection report and lock a viewing slot", "Asked about UC-1182 and the inspection report; a concrete slot moves the lead forward.", 20 * HOUR, "agent", "seed:task:8"),
  ];

  // ---------------------------------------------------------------- AI audit log
  let logSeq = 0;
  const log = (feature: string, action: string, status: string, model: string | null, ms: number, inTok: number | null, outTok: number | null, agoMs: number, leadN: number | null, user: string | null, prompt: string | null, response: string | null): Row => ({
    id: oid(PREFIX.ailog, ++logSeq),
    feature,
    action,
    status,
    model,
    user_id: user,
    lead_id: leadN ? leadId(leadN) : null,
    input_hash: status === "ok" ? sha(`${feature}:${logSeq}`) : null,
    prompt,
    response,
    latency_ms: ms,
    input_tokens: inTok,
    output_tokens: outTok,
    created_at: ago(agoMs),
  });
  const SMART = "claude-sonnet-5-5";
  const FAST = "claude-haiku-5-5";
  const draftOf = (n: number) => String((leads.find((l) => l.id === leadId(n)) as Row).ai_draft ?? "");
  const aiLogs: Row[] = [
    log("lead_summary", "copilot_generated", "ok", SMART, 3120, 1380, 196, 4 * DAY, 4, PERSONAS.c10, "Lead LD-D-0004 · Model H · source web", draftOf(4)),
    log("lead_summary", "copilot_generated", "ok", SMART, 2870, 1294, 181, 9 * DAY, 5, PERSONAS.c12, "Lead LD-D-0005 · Model C · source walkin", draftOf(5)),
    log("lead_summary", "copilot_generated", "ok", SMART, 2410, 1105, 158, 20 * HOUR, 7, PERSONAS.c10, "Lead LD-D-0007 · general enquiry · source portal", draftOf(7)),
    log("lead_summary", "copilot_generated", "ok", SMART, 3340, 1422, 203, 3 * DAY, 12, PERSONAS.c10, "Lead LD-D-0012 · Model H · source web", draftOf(12)),
    log("lead_summary", "copilot_generated", "blocked", SMART, 2980, 1211, 174, 26 * HOUR, 3, PERSONAS.c13, "Lead LD-D-0003 · Model S · source web", "[blocked: discount] Namaste Vikas, I can offer a special price if you visit today."),
    log("lead_summary", "copilot_generated", "fallback", null, 12, null, null, 8 * MIN, 1, PERSONAS.c10, "Lead LD-D-0001 · Model H · source web (rule-based)", "Namaste Ritu, thank you for contacting Vrooma about the Model H. I'm your Vrooma consultant. I can share the official on-road price breakup and book a test drive."),
    log("lead_summary", "reply_sent_unedited", "ok", null, 0, null, null, 3 * DAY - 20 * MIN, 12, PERSONAS.c10, draftOf(12), draftOf(12)),
    log("lead_summary", "reply_sent_edited", "ok", null, 0, null, null, 4 * DAY - 10 * MIN, 4, PERSONAS.c10, draftOf(4), "Namaste Neha, thanks for talking to me today. I can set up a back-to-back drive of the ZX and the VX this Saturday. Which time suits you?"),
    log("lead_summary", "reply_sent_edited", "ok", null, 0, null, null, 9 * DAY - 15 * MIN, 5, PERSONAS.c12, draftOf(5), "Namaste Alok, I have the 5-year finance options ready. Shall I also book your trade-in valuation for Saturday?"),
    log("chat", "chat_answered", "ok", FAST, 1180, 512, 88, 2 * DAY, null, PERSONAS.buyer, "Buyer chat · intent emi · 52 chars", "At the assumed rate of 9.5%, a ₹10,00,000 loan over 60 months comes to about ₹20,998 a month."),
    log("chat", "chat_answered", "ok", FAST, 1420, 604, 96, 40 * MIN, null, null, "Buyer chat · intent price · 44 chars", "Every model page shows the ex-showroom price. See /cars/model-h."),
    log("chat", "chat_answered", "blocked", FAST, 1310, 588, 71, 6 * HOUR, null, null, "Buyer chat · intent price · 61 chars", "[blocked: ungrounded_amount] The Model H is ₹9,99,000 on road."),
    log("lead_agent", "agent_suggested", "ok", SMART, 5240, 2210, 342, 3 * HOUR, 5, PERSONAS.c12, "Lead LD-D-0005 · stage negotiating · 4 open slots", "task: Quiet for nine days | reply: A light follow-up keeps the conversation warm. | offer_slot: A concrete slot moves the lead forward."),
    log("lead_agent", "agent_suggested", "fallback", null, 9, null, null, 2 * HOUR, 3, PERSONAS.c13, "Lead LD-D-0003 · stage new · 4 open slots", "escalate: The buyer asked about a discount."),
    log("digest", "digest_note", "ok", FAST, 960, 624, 52, 1 * DAY + 4 * HOUR, null, PERSONAS.c10, "Daily digest note · consultant", "Where to start: Call the 2 uncontacted leads first."),
    log("price_band_note", "price_band_note", "ok", FAST, 1040, 318, 58, 5 * HOUR, null, PERSONAS.manager, "Price band note · Model H 2023", "The range rests on 6 past sales with medium confidence, so treat it as a guide."),
    log("handoff_brief", "handoff_brief_generated", "ok", FAST, 1860, 744, 118, 12 * MIN, 9, null, "Chat handoff · 5 messages", "Priya asked for the on-road price and EMI, then a Saturday test drive."),
  ];

  // ---------------------------------------------------------------- service-desk calls (yesterday and today)
  const callSpecs: [number, "answered" | "missed" | "voicemail", number, string][] = []; // [offset ms from yesterday 09:00, outcome, seconds, workshop]
  const yStart = new Date(istAt(-1, "09:00")).getTime();
  for (let i = 0; i < 22; i++) {
    const outcome = i === 6 || i === 15 ? "missed" : i === 11 ? "voicemail" : "answered";
    callSpecs.push([yStart + i * 33 * MIN, outcome, outcome === "answered" ? 60 + ((i * 47) % 280) : 0, i % 3 === 0 ? W2 : W1]);
  }
  const tStart = new Date(istAt(0, "09:00")).getTime();
  for (let i = 0; i < 6; i++) {
    const at = tStart + i * 28 * MIN;
    if (at < t) callSpecs.push([at, "answered", 80 + i * 30, i % 2 ? W2 : W1]);
  }
  const calls: Row[] = callSpecs.map(([at, outcome, seconds, workshop], i) => ({
    id: oid(PREFIX.call, i + 1),
    workshop_id: workshop,
    direction: "inbound",
    outcome,
    source: "manual",
    external_id: null,
    caller_masked: `+91 ******${String(2000 + ((i * 137) % 7000)).padStart(4, "0")}`,
    caller_hash: sha(`demo-caller-${i}`),
    handled_by: outcome === "answered" ? PERSONAS.c12 : null,
    duration_seconds: seconds || null,
    notes: outcome === "missed" ? "No one picked up" : null,
    started_at: new Date(at).toISOString(),
  }));

  return { sales, slots, leads, leadEvents, bookings, consents, vehicles, serviceRecords, savedItems, tradeIns, conversations, messages, tasks, aiLogs, calls };
}

// ---------------------------------------------------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------------------------------------------------
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf-8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

/** What each migration added, so a missing one is named in the error. */
const REQUIRED: { migration: string; table: string; column: string }[] = [
  { migration: "0035", table: "ai_logs", column: "feature" },
  { migration: "0036", table: "leads", column: "ai_profile" },
  { migration: "0039", table: "owner_vehicles", column: "reg_no_private" },
  { migration: "0039", table: "service_records", column: "serviced_on" },
  { migration: "0040", table: "lead_tasks", column: "idempotency_key" },
  { migration: "0034", table: "call_logs", column: "outcome" },
];

async function main() {
  loadEnv();
  console.log("=== VROOMA AI DEMO DATA (DEV ONLY) ===");
  const guard = assertDevTarget(process.env);
  if (!guard.ok) {
    console.error(`\n❌ ${guard.error}\n`);
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const reset = process.argv.includes("--reset");
  const supabase: any = createClient(guard.url, (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  console.log(`Target project verified: ${DEV_REF}${dryRun ? " (dry run: nothing is written)" : ""}`);

  // 1. Personas must exist.
  const ids = Object.values(PERSONAS);
  const { data: profiles, error: pErr } = await supabase.from("profiles").select("id").in("id", ids);
  if (pErr) throw new Error(`Could not read profiles: ${pErr.message}`);
  const have = new Set((profiles ?? []).map((p: any) => p.id));
  const missing = Object.entries(PERSONAS).filter(([, id]) => !have.has(id)).map(([k]) => k);
  if (missing.length) {
    console.error(`\n❌ Missing dev personas: ${missing.join(", ")}. Run scripts/seed-dev-users.ts first.\n`);
    process.exit(1);
  }

  // 2. Migrations must be applied.
  const absent: string[] = [];
  for (const r of REQUIRED) {
    const { error } = await supabase.from(r.table).select(r.column).limit(1);
    if (error) absent.push(`${r.table}.${r.column} (migration ${r.migration}): ${error.message}`);
  }
  if (absent.length) {
    console.error(`\n❌ Apply these migrations on DEV first:\n  - ${absent.join("\n  - ")}\n`);
    process.exit(1);
  }

  // 3. Catalog rows we link to must exist (we never create them).
  const data = buildAiDemoData(new Date());
  const { data: cars } = await supabase.from("used_cars").select("id, stock_id").in("stock_id", ["UC-1182", "UC-1220"]);
  const carId = new Map<string, string>((cars ?? []).map((c: any) => [c.stock_id, c.id]));
  for (const stock of ["UC-1182", "UC-1220"]) {
    if (!carId.has(stock)) {
      console.error(`\n❌ Used car ${stock} is not in the database. Apply supabase/seed.sql first.\n`);
      process.exit(1);
    }
  }
  const resolved: AiDemoData = {
    ...data,
    leads: data.leads.map(({ used_car_stock_id, ...row }) => ({ ...row, used_car_id: used_car_stock_id ? carId.get(used_car_stock_id as string) : null })),
    savedItems: data.savedItems.map(({ used_car_stock_id, ...row }) => ({ ...row, used_car_id: used_car_stock_id ? carId.get(used_car_stock_id as string) : null })),
  };

  console.log("\nRows:");
  for (const [key, table] of TABLE_ORDER) console.log(`  ${table.padEnd(26)} ${resolved[key].length}`);
  if (dryRun) {
    console.log("\nDry run finished. Nothing was written.");
    return;
  }

  if (reset) {
    // Children first. Only ids this script owns are touched.
    for (const [key, table] of [...TABLE_ORDER].reverse()) {
      const owned = resolved[key].map((r) => r.id as string);
      for (let i = 0; i < owned.length; i += 100) {
        const { error } = await supabase.from(table).delete().in("id", owned.slice(i, i + 100));
        if (error) throw new Error(`reset ${table}: ${error.message}`);
      }
    }
    console.log("\nPrevious demo rows removed.");
  }

  for (const [key, table] of TABLE_ORDER) {
    const rows = resolved[key];
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase.from(table).upsert(rows.slice(i, i + 100), { onConflict: "id" });
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    console.log(`  seeded ${table} (${rows.length})`);
  }
  console.log("\n✅ AI demo data is in place. Run again any time to refresh the relative dates.");
}

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  const isDirectRun = typeof process.argv[1] === "string" && process.argv[1].endsWith("seed-ai-demo.ts");
  if (isDirectRun) {
    main().catch((err) => {
      console.error("Fatal error:", err?.message || err);
      process.exit(1);
    });
  }
}
