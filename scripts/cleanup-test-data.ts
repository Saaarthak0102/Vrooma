/**
 * scripts/cleanup-test-data.ts
 *
 * Removes the leads that automated test runs leave behind on DEV (and what hangs off them: bookings, outbox rows,
 * AI log rows, trade-ins, support chats) so the lead desk, the digests and the escalation rules show real data.
 *
 * It only deletes leads that LOOK LIKE test data (known test names, `E2E-` prefixes, the sample-CSV people) and never
 * the demo leads from seed-ai-demo.ts (refs "LD-D-"). Anything else, such as a real person's enquiry, is left alone.
 *
 * DEV only: same guard as seed-dev-users.ts / seed-ai-demo.ts.
 *
 * Usage:
 *   SUPABASE_PROJECT_REF=eobtzcwinjmimzisypca node --experimental-strip-types scripts/cleanup-test-data.ts [--dry-run]
 * Tests import `cleanupTestData` to remove what they created (see tests/e2e-flows.test.ts).
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { assertDevTarget } from "./seed-ai-demo.ts";

export interface LeadLike {
  ref: string;
  name: string;
  source: string;
  email?: string | null;
}

/** Names the test suites use when they create leads through the real routes and RPCs. */
const PROBE_NAMES = new Set(["Verified Lead Visitor", "Ownership Probe", "Owner Probe", "Admin Client Probe", "Attribution Probe", "Service Attribution Probe"]);
/** People in the CSV import tests and in scripts/seed-csv-sample.csv. */
const CSV_NAMES = new Set(["Rajesh Sharma", "Priya Verma", "Customer One", "Customer Two", "Customer Three", "Customer Four", "Sanjay Gupta", "Aditya Mishra"]);

/** True only for leads that automated tests create. Pure, so it is unit tested. */
export function isTestLead(l: LeadLike): boolean {
  if (l.ref.startsWith("LD-D-")) return false; // the AI demo data is deliberate
  if (l.name.startsWith("E2E-")) return true;
  if (PROBE_NAMES.has(l.name)) return l.source === "web";
  if (CSV_NAMES.has(l.name)) return l.source === "portal" && (l.email ?? "").toLowerCase().endsWith("@example.com");
  if (l.name === "Aditya Sharma") return l.source === "chat";
  return false;
}

/** The dev accounts the test suites sign in as. Bookings they make are test bookings. */
export const TEST_BUYER_EMAILS = ["dev-buyer@vrooma.in", "dev-buyer-2@vrooma.in"];

export interface CleanupResult {
  leads: number;
  bookings: number;
  slotsAdjusted: number;
  outbox: number;
  aiLogs: number;
  tradeIns: number;
  chats: number;
}

const chunk = <T,>(items: T[], size = 100): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

interface BookingRow {
  id: string;
  slot_id: string;
  status: string;
}

/** Deletes bookings and gives their seats back (cancelled ones already did). Demo slots (5eed) are never touched. */
async function deleteBookings(admin: any, bookings: BookingRow[], result: CleanupResult): Promise<void> {
  if (bookings.length === 0) return;
  const held = new Map<string, number>();
  for (const b of bookings) if (b.status !== "cancelled") held.set(b.slot_id, (held.get(b.slot_id) ?? 0) + 1);
  for (const part of chunk(bookings.map((b) => b.id))) {
    const { error } = await admin.from("bookings").delete().in("id", part);
    if (error) throw new Error(`bookings: ${error.message}`);
  }
  result.bookings += bookings.length;

  const slotIds = [...held.keys()].filter((id) => !id.startsWith("5eed"));
  for (const part of chunk(slotIds)) {
    const { data: slots } = await admin.from("slots").select("id, booked_count").in("id", part);
    for (const s of slots ?? []) {
      const next = Math.max(0, (s.booked_count ?? 0) - (held.get(s.id) ?? 0));
      if (next !== s.booked_count) {
        const { error } = await admin.from("slots").update({ booked_count: next }).eq("id", s.id);
        if (error) throw new Error(`slots: ${error.message}`);
        result.slotsAdjusted++;
      }
    }
  }
}

/**
 * Deletes test leads (optionally only those created at or after `since`) and their dependants.
 * Slot capacity is handed back for every deleted booking that still occupied a seat.
 */
export async function cleanupTestData(
  admin: any,
  options: { since?: string; dryRun?: boolean; testBuyerIds?: string[] } = {},
): Promise<CleanupResult> {
  const result: CleanupResult = { leads: 0, bookings: 0, slotsAdjusted: 0, outbox: 0, aiLogs: 0, tradeIns: 0, chats: 0 };

  const leads: (LeadLike & { id: string; created_at: string })[] = [];
  for (let from = 0; ; from += 1000) {
    let q = admin.from("leads").select("id, ref, name, source, email, created_at").order("created_at", { ascending: true });
    if (options.since) q = q.gte("created_at", options.since);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error(`could not read leads: ${error.message}`);
    leads.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  const ids = leads.filter(isTestLead).map((l) => l.id);
  result.leads = ids.length;

  // Bookings the test accounts made without a lead (the booking flow does not always create one).
  const loadTestBookings = async (): Promise<BookingRow[]> => {
    if (!options.testBuyerIds?.length) return [];
    let q = admin.from("bookings").select("id, slot_id, status").in("user_id", options.testBuyerIds).not("ref", "like", "BK-D-%");
    if (options.since) q = q.gte("created_at", options.since);
    const { data, error } = await q.limit(5000);
    if (error) throw new Error(`bookings: ${error.message}`);
    return data ?? [];
  };

  if (options.dryRun) {
    for (const part of chunk(ids)) {
      const { count } = await admin.from("bookings").select("id", { count: "exact", head: true }).in("lead_id", part);
      result.bookings += count ?? 0;
    }
    result.bookings += (await loadTestBookings()).length;
    return result;
  }
  if (ids.length === 0) {
    await deleteBookings(admin, await loadTestBookings(), result);
    return result;
  }

  const count = async (table: string, run: () => Promise<{ error: { message: string } | null; count?: number | null }>) => {
    const { error } = await run();
    if (error) throw new Error(`${table}: ${error.message}`);
  };

  for (const part of chunk(ids)) {
    // 1. bookings first, remembering which slots they were holding
    const { data: bookings, error: bErr } = await admin.from("bookings").select("id, slot_id, status").in("lead_id", part);
    if (bErr) throw new Error(`bookings: ${bErr.message}`);
    await deleteBookings(admin, bookings ?? [], result);

    // 2. rows that point at the lead with ON DELETE SET NULL would be left as orphans, so remove them explicitly
    const out = await admin.from("messages_outbox").delete({ count: "exact" }).in("lead_id", part);
    if (out.error) throw new Error(`messages_outbox: ${out.error.message}`);
    result.outbox += out.count ?? 0;
    const logs = await admin.from("ai_logs").delete({ count: "exact" }).in("lead_id", part);
    if (logs.error) throw new Error(`ai_logs: ${logs.error.message}`);
    result.aiLogs += logs.count ?? 0;
    const trades = await admin.from("trade_in_requests").delete({ count: "exact" }).in("lead_id", part);
    if (trades.error) throw new Error(`trade_in_requests: ${trades.error.message}`);
    result.tradeIns += trades.count ?? 0;
    const chats = await admin.from("chat_conversations").delete({ count: "exact" }).in("lead_id", part); // messages cascade
    if (chats.error) throw new Error(`chat_conversations: ${chats.error.message}`);
    result.chats += chats.count ?? 0;

    // 3. the leads (events and tasks cascade)
    await count("leads", () => admin.from("leads").delete().in("id", part));
  }
  await deleteBookings(admin, await loadTestBookings(), result);
  return result;
}

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

async function main() {
  loadEnv();
  console.log("=== VROOMA TEST-DATA CLEANUP (DEV ONLY) ===");
  const guard = assertDevTarget(process.env);
  if (!guard.ok) {
    console.error(`\n❌ ${guard.error}\n`);
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const admin: any = createClient(guard.url, (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: buyers } = await admin.from("profiles").select("id").in("email", TEST_BUYER_EMAILS);
  const r = await cleanupTestData(admin, { dryRun, testBuyerIds: (buyers ?? []).map((b: { id: string }) => b.id) });
  console.log(`\n${dryRun ? "Would remove" : "Removed"}: ${r.leads} test leads, ${r.bookings} bookings` + (dryRun ? "" : `, ${r.outbox} outbox rows, ${r.aiLogs} AI log rows, ${r.tradeIns} trade-ins, ${r.chats} chats; ${r.slotsAdjusted} slots had their seats handed back`));
}

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  const isDirectRun = typeof process.argv[1] === "string" && process.argv[1].endsWith("cleanup-test-data.ts");
  if (isDirectRun) {
    main().catch((err) => {
      console.error("Fatal error:", err?.message || err);
      process.exit(1);
    });
  }
}
