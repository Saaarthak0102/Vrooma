import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A database write that fails must not be reported to the user as done. These cover the server actions where a
 * silently ignored error used to produce a success message with nothing saved behind it.
 */

let upsertResult: { error: { message: string } | null } = { error: null };
let consentInsertResult: { error: { message: string } | null } = { error: null };
const calls: string[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      upsert: async () => {
        calls.push(`upsert ${table}`);
        return upsertResult;
      },
      insert: (row: any) => {
        calls.push(`insert ${table}`);
        const done: any = Promise.resolve(table === "consents" ? consentInsertResult : { error: null });
        done.select = () => ({ single: async () => ({ data: { id: "req-1" }, error: null }) });
        return done;
      },
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }), limit: async () => ({ data: [], error: null }) }), ilike: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    }),
  }),
}));
vi.mock("@/server/auth/viewer", () => ({
  requireRole: async () => ({ user: { id: "consultant-1" }, profile: { role: "consultant" } }),
}));
vi.mock("@/server/repositories/leads", () => ({
  getLeadById: async () => ({ id: "lead-1", ref: "LD-1", name: "Buyer", assigned_to: "consultant-1" }),
}));
vi.mock("@/server/automations/alerts", () => ({ alertEmail: () => null }));

describe("escalateLeadAction", () => {
  beforeEach(() => {
    calls.length = 0;
    upsertResult = { error: null };
  });

  it("reports success when the manager task is saved", async () => {
    const { escalateLeadAction } = await import("@/server/actions/lead-agent");
    const res = await escalateLeadAction("lead-1", "Buyer wants a price cut");
    expect(res.ok).toBe(true);
    expect(calls).toContain("upsert lead_tasks");
  });

  it("does not claim a manager was asked when the task could not be saved", async () => {
    upsertResult = { error: { message: "connection reset" } };
    const { escalateLeadAction } = await import("@/server/actions/lead-agent");
    const res = await escalateLeadAction("lead-1", "Buyer wants a price cut");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.message).toMatch(/try again/i);
  });
});
