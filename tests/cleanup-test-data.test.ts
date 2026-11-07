import { describe, expect, it } from "vitest";

import { cleanupTestData, isTestLead } from "@/../scripts/cleanup-test-data";

const lead = (over: Partial<{ ref: string; name: string; source: string; email: string | null }> = {}) => ({
  ref: "LD-ABC123",
  name: "Someone",
  source: "web",
  email: null as string | null,
  ...over,
});

describe("isTestLead", () => {
  it("recognises what the test suites create", () => {
    for (const name of ["Verified Lead Visitor", "Ownership Probe", "Owner Probe", "Admin Client Probe", "Attribution Probe", "Service Attribution Probe"]) {
      expect(isTestLead(lead({ name })), name).toBe(true);
    }
    expect(isTestLead(lead({ name: "E2E-MW6LC4WU Alpha" }))).toBe(true);
    expect(isTestLead(lead({ name: "E2E-X Seller", source: "trade_in" }))).toBe(true);
    expect(isTestLead(lead({ name: "Customer One", source: "portal", email: "cust1@example.com" }))).toBe(true);
    expect(isTestLead(lead({ name: "Aditya Mishra", source: "portal", email: "aditya1@example.com" }))).toBe(true);
    expect(isTestLead(lead({ name: "Aditya Sharma", source: "chat", email: "a@vrooma.in" }))).toBe(true);
  });

  it("never matches the demo data, real-looking people, or look-alikes from other sources", () => {
    expect(isTestLead(lead({ ref: "LD-D-0012", name: "Aditya Mishra", source: "web" }))).toBe(false);
    expect(isTestLead(lead({ ref: "LD-D-0004", name: "E2E-Looking" }))).toBe(false);
    expect(isTestLead(lead({ name: "Sarthak Sabharwal", email: "s@gmail.com" }))).toBe(false);
    // the dev buyer's genuine web enquiry is not the CSV test row
    expect(isTestLead(lead({ name: "Aditya Mishra", source: "web", email: "dev-buyer@vrooma.in" }))).toBe(false);
    // a probe name from the wrong source, or a CSV name with a real address, is left alone
    expect(isTestLead(lead({ name: "Ownership Probe", source: "walkin" }))).toBe(false);
    expect(isTestLead(lead({ name: "Priya Verma", source: "portal", email: "priya@realcompany.in" }))).toBe(false);
    expect(isTestLead(lead({ name: "Priya Verma", source: "web", email: "p@example.com" }))).toBe(false);
  });
});

/** A small in-memory stand-in for the parts of supabase-js the cleanup uses. */
function fakeAdmin(seed: { leads: any[]; bookings: any[]; slots: any[] }) {
  const log: string[] = [];
  const db = { ...seed, outbox: 3, aiLogs: 2, trades: 1, chats: 1 };
  const deleted = { leads: [] as string[], bookings: [] as string[] };

  const admin = {
    from(table: string) {
      const state: { cols?: string; col?: string; notDemo?: boolean; ids?: string[]; gte?: string; op?: "select" | "delete" | "update"; patch?: any; head?: boolean; exact?: boolean } = {};
      const result = () => {
        if (state.op === "delete") {
          log.push(`delete ${table}`);
          if (table === "leads") deleted.leads.push(...(state.ids ?? []));
          if (table === "bookings") deleted.bookings.push(...(state.ids ?? []));
          const count = table === "messages_outbox" ? db.outbox : table === "ai_logs" ? db.aiLogs : table === "trade_in_requests" ? db.trades : table === "chat_conversations" ? db.chats : state.ids?.length ?? 0;
          return { data: null, error: null, count: state.exact ? count : null };
        }
        if (state.op === "update") {
          const id = (state as any).eqId;
          const slot = db.slots.find((s) => s.id === id);
          if (slot) slot.booked_count = state.patch.booked_count;
          log.push(`update ${table} ${id}`);
          return { data: null, error: null };
        }
        if (table === "leads") return { data: db.leads.filter((l) => !state.gte || l.created_at >= state.gte), error: null };
        if (table === "bookings") {
          const rows = db.bookings.filter((b: any) =>
            state.col === "user_id"
              ? state.ids?.includes(b.user_id) && !(state.notDemo && String(b.ref).startsWith("BK-D-")) && (!state.gte || b.created_at >= state.gte)
              : state.ids?.includes(b.lead_id),
          );
          return { data: rows, error: null, count: rows.length };
        }
        if (table === "slots") return { data: db.slots.filter((s) => state.ids?.includes(s.id)), error: null };
        return { data: [], error: null };
      };
      const c: any = {
        select: (cols: string, o?: any) => ((state.op = state.op ?? "select"), (state.cols = cols), (state.head = o?.head), c),
        order: () => c,
        gte: (_: string, v: string) => ((state.gte = v), c),
        range: async () => result(),
        in: (col: string, ids: string[]) => ((state.col = col), (state.ids = ids), c),
        not: () => ((state.notDemo = true), c),
        limit: async () => result(),
        delete: (o?: any) => ((state.op = "delete"), (state.exact = o?.count === "exact"), c),
        update: (patch: any) => ((state.op = "update"), (state.patch = patch), c),
        eq: (_: string, v: string) => (((state as any).eqId = v), c),
        then: (resolve: (v: unknown) => void) => resolve(result()),
      };
      return c;
    },
  };
  return { admin, log, deleted, db };
}

describe("cleanupTestData", () => {
  const seed = () => ({
    leads: [
      { id: "l1", ref: "LD-AAA111", name: "Ownership Probe", source: "web", email: null, created_at: "2026-11-07T10:00:00Z" },
      { id: "l2", ref: "LD-BBB222", name: "Customer One", source: "portal", email: "c@example.com", created_at: "2026-11-06T10:00:00Z" },
      { id: "l3", ref: "LD-CCC333", name: "Sarthak Sabharwal", source: "web", email: "s@gmail.com", created_at: "2026-11-06T10:00:00Z" },
      { id: "l4", ref: "LD-D-0004", name: "Neha Srivastava", source: "web", email: "demo@example.com", created_at: "2026-11-04T10:00:00Z" },
    ],
    bookings: [
      { id: "b1", lead_id: "l1", slot_id: "s1", status: "confirmed" },
      { id: "b2", lead_id: "l1", slot_id: "s1", status: "cancelled" },
      { id: "b3", lead_id: "l1", slot_id: "5eed0030-0000-0000-0000-000000000001", status: "confirmed" },
    ],
    slots: [
      { id: "s1", booked_count: 3 },
      { id: "5eed0030-0000-0000-0000-000000000001", booked_count: 1 },
    ],
  });

  it("deletes only test leads and what hangs off them, and hands booked seats back", async () => {
    const f = fakeAdmin(seed());
    const r = await cleanupTestData(f.admin);
    expect(f.deleted.leads.sort()).toEqual(["l1", "l2"]);
    expect(f.deleted.leads).not.toContain("l3"); // a real-looking person
    expect(f.deleted.leads).not.toContain("l4"); // demo data
    expect(r).toMatchObject({ leads: 2, bookings: 3, outbox: 3, aiLogs: 2, tradeIns: 1, chats: 1 });
    // s1 held one live booking (the cancelled one already gave its seat back): 3 -> 2. The demo slot is never touched.
    expect(f.db.slots.find((s) => s.id === "s1")!.booked_count).toBe(2);
    expect(f.db.slots.find((s) => s.id.startsWith("5eed"))!.booked_count).toBe(1);
    // bookings go before leads, so no booking is left pointing at a lead that no longer exists
    expect(f.log.indexOf("delete bookings")).toBeLessThan(f.log.indexOf("delete leads"));
  });

  it("also removes the bookings the test accounts made without a lead, never the demo ones, and hands seats back", async () => {
    const f = fakeAdmin({
      leads: [],
      bookings: [
        { id: "t1", user_id: "buyer-test", lead_id: null, ref: "BK-AAA", slot_id: "s1", status: "confirmed", created_at: "2026-11-07T10:00:00Z" },
        { id: "t2", user_id: "buyer-test", lead_id: null, ref: "BK-BBB", slot_id: "s1", status: "cancelled", created_at: "2026-11-07T10:00:00Z" },
        { id: "t3", user_id: "buyer-test", lead_id: null, ref: "BK-D-0003", slot_id: "5eed0030-0000-0000-0000-000000000003", status: "completed", created_at: "2026-11-07T10:00:00Z" },
        { id: "t4", user_id: "someone-real", lead_id: null, ref: "BK-CCC", slot_id: "s2", status: "confirmed", created_at: "2026-11-07T10:00:00Z" },
      ],
      slots: [
        { id: "s1", booked_count: 2 },
        { id: "s2", booked_count: 1 },
      ],
    });
    const r = await cleanupTestData(f.admin, { testBuyerIds: ["buyer-test"] });
    expect(f.deleted.bookings).toEqual(["t1", "t2"]);
    expect(r.bookings).toBe(2);
    expect(f.db.slots.find((s) => s.id === "s1")!.booked_count).toBe(1); // only the confirmed one held a seat
    expect(f.db.slots.find((s) => s.id === "s2")!.booked_count).toBe(1); // someone else's booking untouched
  });

  it("with --dry-run writes nothing", async () => {
    const f = fakeAdmin(seed());
    const r = await cleanupTestData(f.admin, { dryRun: true });
    expect(r.leads).toBe(2);
    expect(f.log.filter((l) => l.startsWith("delete") || l.startsWith("update"))).toEqual([]);
  });

  it("with `since` only considers leads created from then on", async () => {
    const f = fakeAdmin(seed());
    const r = await cleanupTestData(f.admin, { since: "2026-11-07T00:00:00Z" });
    expect(r.leads).toBe(1);
    expect(f.deleted.leads).toEqual(["l1"]);
  });

  it("does nothing when there is nothing to remove", async () => {
    const f = fakeAdmin({ leads: [seed().leads[2]], bookings: [], slots: [] });
    expect(await cleanupTestData(f.admin)).toMatchObject({ leads: 0 });
    expect(f.log).toEqual([]);
  });
});
