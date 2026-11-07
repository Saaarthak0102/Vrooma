import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  aiOn: true,
  meta: null as Record<string, unknown> | null,
  failProfile: false,
  updates: [] as { table: string; patch: Record<string, unknown> }[],
  logs: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      update: (patch: Record<string, unknown>) => ({
        eq: async () => {
          if (state.failProfile && "ai_profile" in patch) {
            return { error: { message: "column leads.ai_profile does not exist" } };
          }
          state.updates.push({ table, patch });
          return { error: null };
        },
      }),
      insert: async (row: Record<string, unknown>) => {
        state.logs.push(row);
        return { error: null };
      },
      select: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [] }) }) }),
    }),
  }),
}));
vi.mock("@/server/ai/provider", () => ({
  aiEnabled: () => state.aiOn,
  resolveModel: () => ({ model: {}, id: "test-model" }),
  AI_TIMEOUT_MS: { fast: 1000, smart: 1000 },
}));
vi.mock("@/server/repositories/chats", () => ({
  findConversationForLead: async () => null,
  listMessages: async () => [],
}));
vi.mock("@/server/repositories/leads", () => ({
  listLeadEvents: async () => [],
  getLeadAiMeta: async () => state.meta,
}));
vi.mock("@/server/repositories/saved", () => ({ listSavedVehicles: async () => [] }));
vi.mock("@/server/repositories/showrooms", () => ({
  listShowrooms: async () => [{ id: "s1", name: "Gomti Nagar Showroom" }],
}));

import { ensureLeadCopilot, loadLeadAiInput } from "@/server/services/lead-copilot-persist";
import { hashInput } from "@/server/ai/log";
import { leadFingerprint } from "@/server/ai/lead-context";
import { runWithFallback, type AiRunDeps, type AiRunOptions } from "@/server/ai/runner";
import type { Lead } from "@/types/domain";

const GOOD = {
  summary: "Wants a petrol Model H ZX this week and needs a loan. Not contacted yet.",
  interest: "Model H ZX",
  urgency: "high" as const,
  qualification: { budget: null, timeline: "this week", fuel: "petrol", finance: true, trade_in: null },
  suggestedAction: "Call now, then offer two test drive slots",
  draftReply:
    "Namaste Asha, thanks for your interest in the Model H ZX. I'm Rahul at Gomti Nagar. Would a showroom visit or a home test drive suit you better this week?",
};

function baseLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    ref: "LD-1",
    source: "web",
    name: "Asha Verma",
    phone: "+919876543210",
    email: "asha@example.com",
    showroom_id: "s1",
    model_name: "Model H ZX",
    message: "petrol automatic this week, need a loan",
    status: "new",
    assigned_to: "c1",
    assigned_consultant_name: "Rahul Singh",
    sla_due_at: "2026-11-08T05:05:00Z",
    first_contacted_at: null,
    ai_summary: null,
    ai_draft: null,
    created_at: "2026-11-08T05:00:00Z",
    ...overrides,
  };
}

function generateOptions(calls: { n: number }, object = GOOD) {
  const deps: AiRunDeps = {
    enabled: () => state.aiOn,
    resolveModel: () => ({ model: {} as any, id: "test-model" }),
    timeoutMs: () => 500,
    isOverCap: async () => false,
    log: async (e) => {
      state.logs.push({ ...e });
    },
    now: () => Date.now(),
  };
  return {
    runner: <T,>(o: AiRunOptions<T>) => runWithFallback(o, deps),
    generate: async () => {
      calls.n += 1;
      return { object };
    },
  };
}

beforeEach(() => {
  state.aiOn = true;
  state.meta = null;
  state.failProfile = false;
  state.updates = [];
  state.logs = [];
});

describe("loadLeadAiInput", () => {
  it("sends the first name only and resolves the showroom", async () => {
    const input = await loadLeadAiInput(baseLead());
    expect(input.firstName).toBe("Asha");
    expect(input.consultantFirstName).toBe("Rahul");
    expect(input.showroomName).toBe("Gomti Nagar Showroom");
    expect(JSON.stringify(input)).not.toMatch(/9876543210|asha@example/);
  });
});

describe("ensureLeadCopilot", () => {
  it("writes the model's summary, profile, hash and draft for a new lead", async () => {
    const calls = { n: 0 };
    const lead = await ensureLeadCopilot(baseLead(), { actorId: "u1", generateOptions: generateOptions(calls) });
    expect(calls.n).toBe(1);
    expect(state.updates).toHaveLength(1);
    const patch = state.updates[0].patch;
    expect(patch).toMatchObject({ ai_summary: GOOD.summary, ai_draft: GOOD.draftReply });
    expect((patch.ai_profile as any).origin).toBe("ai");
    expect(patch.ai_input_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(patch.ai_generated_at).toBeTruthy();
    expect(lead.ai_summary).toBe(GOOD.summary);
  });

  it("does nothing when the lead is complete and AI is off", async () => {
    state.aiOn = false;
    const calls = { n: 0 };
    const lead = baseLead({ ai_summary: "old", ai_draft: "old draft" });
    expect(await ensureLeadCopilot(lead, { generateOptions: generateOptions(calls) })).toEqual(lead);
    expect(calls.n).toBe(0);
    expect(state.updates).toHaveLength(0);
  });

  it("does not call the model again within 10 minutes", async () => {
    const calls = { n: 0 };
    const lead = baseLead({ ai_summary: "s", ai_draft: "d", ai_generated_at: new Date().toISOString() });
    expect(await ensureLeadCopilot(lead, { generateOptions: generateOptions(calls) })).toEqual(lead);
    expect(calls.n).toBe(0);
  });

  it("does not call the model when nothing the summary depends on has changed", async () => {
    const calls = { n: 0 };
    const input = await loadLeadAiInput(baseLead());
    const hash = hashInput(leadFingerprint(input));
    const lead = baseLead({
      ai_summary: "s",
      ai_draft: "d",
      ai_input_hash: hash,
      ai_generated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    expect(await ensureLeadCopilot(lead, { generateOptions: generateOptions(calls) })).toEqual(lead);
    expect(calls.n).toBe(0);
  });

  it("regenerates after the lead changed, but keeps the draft once the buyer has been contacted", async () => {
    const calls = { n: 0 };
    const lead = baseLead({
      status: "contacted",
      first_contacted_at: "2026-11-08T05:03:00Z",
      ai_summary: "old summary",
      ai_draft: "the draft the consultant already used",
      ai_input_hash: "stale",
      ai_generated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    const out = await ensureLeadCopilot(lead, { generateOptions: generateOptions(calls) });
    expect(calls.n).toBe(1);
    expect(out.ai_summary).toBe(GOOD.summary);
    expect(out.ai_draft).toBe("the draft the consultant already used");
    expect(state.updates[0].patch).not.toHaveProperty("ai_draft");
  });

  it("Refresh forces a rebuild but not more often than every 30 seconds", async () => {
    const calls = { n: 0 };
    const justNow = baseLead({ ai_summary: "s", ai_draft: "d", ai_generated_at: new Date().toISOString() });
    expect(await ensureLeadCopilot(justNow, { force: true, generateOptions: generateOptions(calls) })).toEqual(justNow);
    expect(calls.n).toBe(0);

    const earlier = baseLead({ ai_summary: "s", ai_draft: "d", ai_generated_at: new Date(Date.now() - 120_000).toISOString() });
    await ensureLeadCopilot(earlier, { force: true, generateOptions: generateOptions(calls) });
    expect(calls.n).toBe(1);
  });

  it("with AI off, fills only empty fields from the rule-based version and logs one fallback row", async () => {
    state.aiOn = false;
    const calls = { n: 0 };
    const out = await ensureLeadCopilot(baseLead({ ai_summary: "Existing summary" }), { generateOptions: generateOptions(calls) });
    expect(calls.n).toBe(0);
    expect(out.ai_summary).toBe("Existing summary");
    expect(out.ai_draft).toContain("Asha");
    const patch = state.updates[0].patch;
    expect(patch).not.toHaveProperty("ai_summary");
    expect(patch).not.toHaveProperty("ai_input_hash");
    expect(patch).toHaveProperty("ai_draft");
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0]).toMatchObject({ action: "copilot_generated", status: "fallback", feature: "lead_summary" });
  });

  it("falls back to the rule-based draft, and never stores a discount, when the model offers one", async () => {
    const calls = { n: 0 };
    const out = await ensureLeadCopilot(baseLead(), {
      generateOptions: generateOptions(calls, {
        ...GOOD,
        draftReply: "Namaste Asha, I can give you a special discount if you visit this week. Shall we fix a time?",
      }),
    });
    expect(out.ai_draft).not.toMatch(/discount/i);
    expect(state.updates[0].patch).not.toHaveProperty("ai_input_hash");
    // exactly one audit row: the runner's "blocked" row (no extra fallback row)
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0]).toMatchObject({ status: "blocked" });
  });

  it("reads the AI profile columns separately and uses them to skip an unchanged lead", async () => {
    const calls = { n: 0 };
    const input = await loadLeadAiInput(baseLead());
    state.meta = {
      ai_profile: { origin: "ai", urgency: "high" },
      ai_input_hash: hashInput(leadFingerprint(input)),
      ai_generated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    };
    const out = await ensureLeadCopilot(baseLead({ ai_summary: "s", ai_draft: "d" }), {
      generateOptions: generateOptions(calls),
    });
    expect(calls.n).toBe(0);
    expect(out.ai_profile).toEqual({ origin: "ai", urgency: "high" });
  });

  it("still saves the summary and draft when the profile columns do not exist yet (migration 0036 pending)", async () => {
    state.failProfile = true;
    const calls = { n: 0 };
    const out = await ensureLeadCopilot(baseLead(), { generateOptions: generateOptions(calls) });
    expect(calls.n).toBe(1);
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].patch).toEqual({ ai_summary: GOOD.summary, ai_draft: GOOD.draftReply });
    expect(out.ai_summary).toBe(GOOD.summary);
  });
});
