import { addDaysToDateString, istDateString } from "@/lib/ist-format";
import type { OutboxRow } from "@/server/automations/types";

/**
 * Daily 08:30 IST digests, one email per person, built from the database with plain queries (no model involved in
 * the numbers). A consultant sees their own queue, the used-car manager sees ageing stock, the dealer principal sees
 * yesterday's response performance. Someone with nothing to act on gets no email, except the dealer principal.
 */

export type DigestRole = "consultant" | "manager" | "admin";

export interface DigestRecipient {
  id: string;
  name: string;
  email: string;
  role: DigestRole;
}

export interface ConsultantFacts {
  uncontactedNew: number;
  openLeads: number;
  openTasks: number;
  overdueTasks: number;
  todaysBookings: { kind: "test_drive" | "service"; when: string; buyer: string | null; place: string }[];
  unmarkedBookings: number;
}
export interface ManagerFacts {
  availableCars: number;
  bookedCars: number;
  agedStock: { stockId: string; name: string; days: number }[];
  tradeInsLast7Days: number;
}
export interface AdminFacts {
  leadsYesterday: number;
  contactedInSla: number;
  slaBreaches: number;
  missedServiceCalls: number;
  totalServiceCalls: number;
  uncontactedNow: number;
  deadOutbox: number;
  pendingOutbox: number;
}
export type DigestFacts =
  | { role: "consultant"; facts: ConsultantFacts }
  | { role: "manager"; facts: ManagerFacts }
  | { role: "admin"; facts: AdminFacts };

const pct = (num: number, den: number) => (den === 0 ? null : Math.round((num / den) * 100));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Nothing to act on: a consultant or manager with an empty digest is not emailed. */
export function isDigestEmpty(d: DigestFacts): boolean {
  if (d.role === "consultant") {
    const f = d.facts;
    return f.uncontactedNew + f.overdueTasks + f.todaysBookings.length + f.unmarkedBookings === 0 && f.openLeads === 0;
  }
  if (d.role === "manager") return d.facts.agedStock.length === 0 && d.facts.tradeInsLast7Days === 0;
  return false;
}

export function composeDigest(recipient: DigestRecipient, d: DigestFacts, dateLabel: string): string {
  const first = recipient.name.trim().split(/\s+/)[0] || "there";
  const lines: string[] = [`Good morning ${first}. Here is your summary for ${dateLabel}.`, ""];

  if (d.role === "consultant") {
    const f = d.facts;
    lines.push(`Your queue: ${plural(f.openLeads, "open lead")}.`);
    if (f.uncontactedNew > 0) lines.push(`- ${plural(f.uncontactedNew, "new lead")} not contacted yet. Call these first.`);
    if (f.overdueTasks > 0) lines.push(`- ${plural(f.overdueTasks, "follow-up task")} overdue (${f.openTasks} open in total).`);
    else if (f.openTasks > 0) lines.push(`- ${plural(f.openTasks, "open follow-up task")}.`);
    if (f.unmarkedBookings > 0) lines.push(`- ${plural(f.unmarkedBookings, "past booking")} still waiting for an attended / no-show mark.`);
    if (f.todaysBookings.length > 0) {
      lines.push("", "Today:");
      for (const b of f.todaysBookings) lines.push(`- ${b.when}: ${b.kind === "test_drive" ? "test drive" : "service"}${b.buyer ? ` with ${b.buyer}` : ""} at ${b.place}`);
    }
  } else if (d.role === "manager") {
    const f = d.facts;
    lines.push(`Used-car stock: ${f.availableCars} available, ${f.bookedCars} booked.`);
    if (f.agedStock.length > 0) {
      lines.push("", `Cars listed for over 60 days (${f.agedStock.length}), oldest first:`);
      for (const c of f.agedStock.slice(0, 10)) lines.push(`- ${c.stockId} ${c.name}: ${c.days} days`);
      lines.push("Consider reviewing the price band for these in Staff > Used Stock.");
    }
    if (f.tradeInsLast7Days > 0) lines.push("", `${plural(f.tradeInsLast7Days, "trade-in request")} in the last 7 days.`);
  } else {
    const f = d.facts;
    const sla = pct(f.contactedInSla, f.leadsYesterday);
    lines.push(`Yesterday: ${plural(f.leadsYesterday, "new lead")}.`);
    lines.push(sla === null ? "- No leads to measure response time on." : `- ${f.contactedInSla} contacted within 5 minutes (${sla}%). The target is 90%.`);
    if (f.slaBreaches > 0) lines.push(`- ${plural(f.slaBreaches, "lead")} breached the 5-minute response promise.`);
    if (f.totalServiceCalls > 0) {
      const missed = pct(f.missedServiceCalls, f.totalServiceCalls);
      lines.push(`- Service calls: ${f.missedServiceCalls} of ${f.totalServiceCalls} missed (${missed}%). The target is under 5%.`);
    }
    lines.push("", "Right now:");
    lines.push(`- ${plural(f.uncontactedNow, "new lead")} still uncontacted.`);
    lines.push(`- Outbox: ${f.pendingOutbox} pending, ${f.deadOutbox} failed for good${f.deadOutbox > 0 ? " (check Admin > System)" : ""}.`);
  }
  return lines.join("\n");
}

export function planDigests(
  recipients: { recipient: DigestRecipient; data: DigestFacts; note?: string | null }[],
  now: Date,
  alreadyQueued: Set<string> = new Set(),
): OutboxRow[] {
  const today = istDateString(now);
  const dateLabel = new Date(`${today}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const rows: OutboxRow[] = [];
  for (const { recipient, data, note } of recipients) {
    const key = `digest:${recipient.role}:${recipient.id}:${today}`;
    if (alreadyQueued.has(key) || isDigestEmpty(data)) continue;
    const body = composeDigest(recipient, data, dateLabel);
    rows.push({
      channel: "email",
      to_address: recipient.email,
      template: "daily_digest",
      body: note ? `${body}\n\n${note}` : body,
      idempotency_key: key,
    });
  }
  return rows;
}

// --- Data ---------------------------------------------------------------------------------------------------------

const DAY = 86_400_000;
const istDayRange = (date: string) => ({
  from: new Date(`${date}T00:00:00+05:30`).toISOString(),
  to: new Date(`${addDaysToDateString(date, 1)}T00:00:00+05:30`).toISOString(),
});
const timeFmt = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });

export async function loadRecipients(admin: any): Promise<DigestRecipient[]> {
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, email, role, is_active")
    .in("role", ["consultant", "manager", "admin"])
    .eq("is_active", true)
    .limit(500);
  if (error) throw new Error(`digest recipients query failed: ${error.message}`);
  return (data ?? [])
    .filter((p: any) => p.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email) && !String(p.email).endsWith("@vrooma.internal"))
    .map((p: any) => ({ id: p.id, name: p.full_name || "", email: p.email, role: p.role }));
}

export async function loadDigestData(admin: any, recipients: DigestRecipient[], now: Date): Promise<Map<string, DigestFacts>> {
  const out = new Map<string, DigestFacts>();
  const today = istDateString(now);
  const yesterday = addDaysToDateString(today, -1);
  const todayRange = istDayRange(today);
  const yRange = istDayRange(yesterday);
  const wants = (role: DigestRole) => recipients.some((r) => r.role === role);

  if (wants("consultant")) {
    const [leadsRes, tasksRes, bookingsRes, unmarkedRes] = await Promise.all([
      admin.from("leads").select("assigned_to, status, first_contacted_at").in("status", ["new", "contacted", "test_drive_booked", "negotiating"]).limit(5000),
      admin.from("lead_tasks").select("assigned_to, due_at").eq("status", "open").limit(5000),
      admin
        .from("bookings")
        .select("kind, user:user_id ( full_name ), lead:lead_id!inner ( assigned_to ), slots:slot_id!inner ( starts_at, showroom:showroom_id ( name ), workshop:workshop_id ( name ) )")
        .eq("status", "confirmed")
        .gte("slots.starts_at", todayRange.from)
        .lt("slots.starts_at", todayRange.to)
        .limit(1000),
      admin
        .from("bookings")
        .select("id, lead:lead_id!inner ( assigned_to ), slots:slot_id!inner ( ends_at )")
        .eq("status", "confirmed")
        .lt("slots.ends_at", new Date(now.getTime() - 3600_000).toISOString())
        .gt("slots.ends_at", new Date(now.getTime() - 7 * DAY).toISOString())
        .limit(1000),
    ]);
    if (leadsRes.error) throw new Error(`digest leads query failed: ${leadsRes.error.message}`);
    // Tasks, today's bookings and unmarked bookings are best-effort: a missing table must not stop the digest.
    for (const r of recipients.filter((x) => x.role === "consultant")) {
      const mine = (leadsRes.data ?? []).filter((l: any) => l.assigned_to === r.id);
      const tasks = (tasksRes.data ?? []).filter((t: any) => t.assigned_to === r.id);
      out.set(r.id, {
        role: "consultant",
        facts: {
          uncontactedNew: mine.filter((l: any) => l.status === "new" && !l.first_contacted_at).length,
          openLeads: mine.length,
          openTasks: tasks.length,
          overdueTasks: tasks.filter((t: any) => new Date(t.due_at).getTime() < now.getTime()).length,
          todaysBookings: (bookingsRes.data ?? [])
            .filter((b: any) => b.lead?.assigned_to === r.id)
            .map((b: any) => ({
              kind: b.kind,
              when: timeFmt(b.slots.starts_at),
              buyer: b.user?.full_name ?? null,
              place: b.slots.showroom?.name ?? b.slots.workshop?.name ?? "Vrooma",
            }))
            .sort((a: any, b: any) => a.when.localeCompare(b.when)),
          unmarkedBookings: (unmarkedRes.data ?? []).filter((b: any) => b.lead?.assigned_to === r.id).length,
        },
      });
    }
  }

  if (wants("manager")) {
    const [stock, trade] = await Promise.all([
      admin.from("used_cars").select("stock_id, model_name, variant_name, year, status, listed_at").in("status", ["available", "booked"]).limit(2000),
      admin.from("trade_in_requests").select("id", { count: "exact", head: true }).gte("created_at", new Date(now.getTime() - 7 * DAY).toISOString()),
    ]);
    if (stock.error) throw new Error(`digest stock query failed: ${stock.error.message}`);
    const cars = stock.data ?? [];
    const aged = cars
      .filter((c: any) => c.status === "available" && c.listed_at && now.getTime() - new Date(c.listed_at).getTime() > 60 * DAY)
      .map((c: any) => ({
        stockId: c.stock_id,
        name: `${c.year} ${c.model_name} ${c.variant_name ?? ""}`.trim(),
        days: Math.floor((now.getTime() - new Date(c.listed_at).getTime()) / DAY),
      }))
      .sort((a: any, b: any) => b.days - a.days);
    for (const r of recipients.filter((x) => x.role === "manager")) {
      out.set(r.id, {
        role: "manager",
        facts: {
          availableCars: cars.filter((c: any) => c.status === "available").length,
          bookedCars: cars.filter((c: any) => c.status === "booked").length,
          agedStock: aged,
          tradeInsLast7Days: trade.count ?? 0,
        },
      });
    }
  }

  if (wants("admin")) {
    const [leadsY, uncontacted, calls, dead, pending] = await Promise.all([
      admin.from("leads").select("first_contacted_at, sla_due_at, sla_breached_at").gte("created_at", yRange.from).lt("created_at", yRange.to).limit(5000),
      admin.from("leads").select("id", { count: "exact", head: true }).eq("status", "new").is("first_contacted_at", null),
      admin.from("call_logs").select("outcome").eq("direction", "inbound").gte("started_at", yRange.from).lt("started_at", yRange.to).limit(5000),
      admin.from("messages_outbox").select("id", { count: "exact", head: true }).eq("status", "dead"),
      admin.from("messages_outbox").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    if (leadsY.error) throw new Error(`digest leads query failed: ${leadsY.error.message}`);
    const ly = leadsY.data ?? [];
    const callRows = calls.error ? [] : (calls.data ?? []);
    const facts: AdminFacts = {
      leadsYesterday: ly.length,
      contactedInSla: ly.filter((l: any) => l.first_contacted_at && l.first_contacted_at <= l.sla_due_at).length,
      slaBreaches: ly.filter((l: any) => l.sla_breached_at).length,
      missedServiceCalls: callRows.filter((c: any) => c.outcome === "missed").length,
      totalServiceCalls: callRows.length,
      uncontactedNow: uncontacted.count ?? 0,
      deadOutbox: dead.count ?? 0,
      pendingOutbox: pending.count ?? 0,
    };
    for (const r of recipients.filter((x) => x.role === "admin")) out.set(r.id, { role: "admin", facts });
  }
  return out;
}
