import fs from "node:fs";
import { describe, expect, it } from "vitest";

import {
  MAX_PROPOSALS,
  finalizeProposals,
  ruleBasedProposals,
  validateProposal,
  type AgentProposal,
  type ProposalContext,
} from "@/lib/lead-agent";
import { buildAgentTools, suggestNextSteps } from "@/server/ai/lead-agent";
import type { LeadAiInput } from "@/server/ai/lead-context";
import { FOLLOWUP_LIMITS, planFollowUps, type BookingFollowUp, type StaleLead } from "@/server/automations/followups";
import { runWithFallback, type AiRunDeps, type AiRunOptions } from "@/server/ai/runner";
import type { AiLogEntry } from "@/server/ai/types";
import { findForbiddenDiscountWord } from "@/lib/validation/discount";

const opts = { toolCallId: "t", messages: [] } as any;

const ctx: ProposalContext = {
  slots: [
    { id: "s1", label: "Tue, 10 Nov, 11:00 am at Hazratganj" },
    { id: "s2", label: "Tue, 10 Nov, 4:00 pm at Hazratganj" },
  ],
  consultants: [
    { id: "c1", name: "Rahul Singh", openLeads: 12 },
    { id: "c2", name: "Anita Verma", openLeads: 3 },
  ],
  currentAssigneeId: "c1",
};

function lead(over: Partial<LeadAiInput> = {}): LeadAiInput {
  return {
    ref: "LD-1", source: "web", status: "new", firstName: "Asha", modelName: "Model H ZX", isUsed: false,
    message: "Looking at the petrol automatic, can we talk this week?", showroomName: "Hazratganj", consultantFirstName: "Rahul",
    firstContacted: false, createdAt: "2026-11-08T05:00:00Z", events: [], chat: [], saved: [], bookings: [], ...over,
  };
}

describe("validateProposal", () => {
  it("accepts a clean reply and trims it", () => {
    const v = validateProposal({ kind: "reply", reason: "First message", text: "  Namaste Asha, happy to help with the Model H ZX. Would a test drive this week suit you?  " }, ctx);
    expect(v.ok && v.proposal.kind === "reply" && v.proposal.text.startsWith("Namaste")).toBe(true);
  });

  it.each([
    ["a discount", "Namaste Asha, I can give you a discount if you visit today, shall we fix a time?"],
    ["a price", "Namaste Asha, the Model H ZX is ₹12,45,000, shall we fix a visit this week?"],
    ["a registration number", "Namaste Asha, the car UP32 AB 1234 is ready for a visit, shall we fix a time?"],
  ])("rejects a reply containing %s, with a message the model can act on", (_n, text) => {
    const v = validateProposal({ kind: "reply", reason: "x reason", text }, ctx);
    expect(v.ok).toBe(false);
    expect(!v.ok && v.error).toContain("Reply rejected");
  });

  it("only accepts real slot ids and takes the label from our data, not the model", () => {
    expect(validateProposal({ kind: "offer_slot", slotId: "made-up", label: "x", reason: "because" }, ctx).ok).toBe(false);
    const v = validateProposal({ kind: "offer_slot", slotId: "s2", label: "Friday midnight", reason: "because" }, ctx);
    expect(v.ok && v.proposal.kind === "offer_slot" && v.proposal.label).toBe("Tue, 10 Nov, 4:00 pm at Hazratganj");
  });

  it("never allows proposing won or lost, and only moves to contacted / test_drive_booked / negotiating", () => {
    for (const status of ["won", "lost", "new"]) {
      expect(validateProposal({ kind: "status_change", status: status as any, reason: "because" }, ctx).ok).toBe(false);
    }
    expect(validateProposal({ kind: "status_change", status: "negotiating", reason: "because" }, ctx).ok).toBe(true);
  });

  it("checks reassignment against real consultants and the current owner", () => {
    expect(validateProposal({ kind: "reassign", consultantId: "ghost", consultantName: "", reason: "because" }, ctx).ok).toBe(false);
    expect(validateProposal({ kind: "reassign", consultantId: "c1", consultantName: "", reason: "because" }, ctx).ok).toBe(false);
    const v = validateProposal({ kind: "reassign", consultantId: "c2", consultantName: "made up", reason: "lighter load" }, ctx);
    expect(v.ok && v.proposal.kind === "reassign" && v.proposal.consultantName).toBe("Anita Verma");
  });

  it("clamps task due time, requires a title and a reason", () => {
    const v = validateProposal({ kind: "task", title: "Call now", dueInHours: 9999, reason: "SLA" }, ctx);
    expect(v.ok && v.proposal.kind === "task" && v.proposal.dueInHours).toBe(168);
    expect(validateProposal({ kind: "task", title: "x", dueInHours: 1, reason: "SLA" }, ctx).ok).toBe(false);
    expect(validateProposal({ kind: "escalate", reason: "" }, ctx).ok).toBe(false);
  });

  it("keeps one proposal per kind, at most three, in ranked order", () => {
    const mk = (kind: AgentProposal["kind"], i: number): AgentProposal =>
      ({ kind, reason: "r" + i, text: "t", slotId: "s1", label: "l", status: "contacted", consultantId: "c2", consultantName: "n", title: "T" + i, dueInHours: 1 }) as any;
    const out = finalizeProposals([mk("task", 1), mk("task", 2), mk("reply", 3), mk("escalate", 4), mk("status_change", 5)]);
    expect(out.map((p) => p.kind)).toEqual(["task", "reply", "escalate"]);
    expect(out.length).toBeLessThanOrEqual(MAX_PROPOSALS);
  });
});

describe("ruleBasedProposals (fallback)", () => {
  it("a brand new lead: call now first, then a draft, then a slot", () => {
    const out = ruleBasedProposals(lead(), ctx);
    expect(out.map((p) => p.kind)).toEqual(["task", "reply", "offer_slot"]);
    expect(out[0]).toMatchObject({ kind: "task", dueInHours: 0 });
    expect(out[2]).toMatchObject({ kind: "offer_slot", slotId: "s1" });
  });

  it("a buyer asking for a discount is escalated to a manager and never answered", () => {
    const out = ruleBasedProposals(lead({ message: "Give me 50,000 off and a discount or I walk" }), ctx);
    expect(out[0].kind).toBe("escalate");
    for (const p of out) if (p.kind === "reply") expect(findForbiddenDiscountWord(p.text)).toBeNull();
  });

  it("follows up a quiet contacted lead and confirms a booked test drive", () => {
    expect(ruleBasedProposals(lead({ status: "contacted", firstContacted: true }), ctx).map((p) => p.kind)).toEqual(["reply", "task", "offer_slot"]);
    expect(ruleBasedProposals(lead({ status: "test_drive_booked", firstContacted: true }), ctx)[0]).toMatchObject({ kind: "task", title: "Confirm the test drive slot" });
  });

  it("works with no open slots", () => {
    expect(ruleBasedProposals(lead(), { ...ctx, slots: [] }).map((p) => p.kind)).toEqual(["task", "reply"]);
  });
});

describe("agent tools", () => {
  const make = () => {
    const collected: AgentProposal[] = [];
    return { collected, tools: buildAgentTools({ ctx, collected }) as any };
  };

  it("exposes only read-only lookups and propose_* tools, no way to send or change anything", () => {
    const names = Object.keys(make().tools).sort();
    expect(names).toEqual(["get_consultant_load", "get_open_slots", "propose_escalate", "propose_offer_slot", "propose_reassign", "propose_reply", "propose_status_change", "propose_task"]);
  });

  it("lookups return our data", async () => {
    const { tools } = make();
    expect((await tools.get_open_slots.execute({}, opts)).slots).toHaveLength(2);
    expect((await tools.get_consultant_load.execute({}, opts)).consultants[1]).toMatchObject({ id: "c2", openLeads: 3 });
  });

  it("records valid proposals, rejects invalid ones with an error, one per kind, three at most", async () => {
    const { tools, collected } = make();
    expect(await tools.propose_offer_slot.execute({ slotId: "nope", reason: "because" }, opts)).toMatchObject({ accepted: false });
    expect(await tools.propose_reply.execute({ text: "Namaste Asha, I can offer a discount today, shall we fix a time?", reason: "because" }, opts)).toMatchObject({ accepted: false });
    expect(await tools.propose_task.execute({ title: "Call now", dueInHours: 0, reason: "SLA" }, opts)).toEqual({ accepted: true });
    expect(await tools.propose_task.execute({ title: "Call again", dueInHours: 1, reason: "SLA" }, opts)).toMatchObject({ accepted: false });
    await tools.propose_offer_slot.execute({ slotId: "s1", reason: "next slot" }, opts);
    await tools.propose_escalate.execute({ reason: "asked about price" }, opts);
    expect(await tools.propose_status_change.execute({ status: "contacted", reason: "spoke today" }, opts)).toMatchObject({ accepted: false });
    expect(collected.map((p) => p.kind)).toEqual(["task", "offer_slot", "escalate"]);
  });
});

function fakeRunner(enabled = true) {
  const logs: AiLogEntry[] = [];
  const deps: AiRunDeps = {
    enabled: () => enabled,
    resolveModel: () => ({ model: {} as any, id: "test-model" }),
    timeoutMs: () => 500,
    isOverCap: async () => false,
    log: async (e) => void logs.push(e),
    now: () => Date.now(),
  };
  return { logs, runner: <T,>(o: AiRunOptions<T>) => runWithFallback(o, deps) };
}

describe("suggestNextSteps", () => {
  it("returns the proposals the model recorded through the tools", async () => {
    const { runner, logs } = fakeRunner();
    const out = await suggestNextSteps(lead(), ctx, {
      runner,
      generate: async ({ tools }) => {
        const t = tools as any;
        await t.propose_task.execute({ title: "Call now", dueInHours: 0, reason: "New lead, SLA running" }, opts);
        await t.propose_offer_slot.execute({ slotId: "s2", reason: "Buyer wants this week" }, opts);
        return { usage: { promptTokens: 900, completionTokens: 120 } };
      },
    });
    expect(out.source).toBe("ai");
    expect(out.proposals.map((p) => p.kind)).toEqual(["task", "offer_slot"]);
    expect(logs[0]).toMatchObject({ feature: "lead_agent", status: "ok", usage: { inputTokens: 900, outputTokens: 120 } });
  });

  it("falls back to rule-based suggestions when the model proposes nothing usable", async () => {
    const { runner, logs } = fakeRunner();
    const out = await suggestNextSteps(lead(), ctx, {
      runner,
      generate: async ({ tools }) => {
        await (tools as any).propose_status_change.execute({ status: "won", reason: "they will buy" }, opts);
        return {};
      },
    });
    expect(out).toMatchObject({ source: "fallback", reason: "empty" });
    expect(out.proposals[0].kind).toBe("task");
    expect(logs[0].status).toBe("blocked");
  });

  it("uses the rule-based suggestions without calling the model when AI is off", async () => {
    const { runner } = fakeRunner(false);
    let called = false;
    const out = await suggestNextSteps(lead(), ctx, { runner, generate: async () => ((called = true), {}) });
    expect(called).toBe(false);
    expect(out).toMatchObject({ source: "fallback", reason: "disabled" });
  });

  it("falls back when the model call throws", async () => {
    const { runner } = fakeRunner();
    const out = await suggestNextSteps(lead(), ctx, { runner, generate: async () => { throw new Error("overloaded"); } });
    expect(out).toMatchObject({ source: "fallback", reason: "error" });
  });
});

describe("follow-up automations", () => {
  const now = new Date("2026-11-08T06:00:00Z");
  const stale = (over: Partial<StaleLead> = {}): StaleLead => ({
    leadId: "l1", ref: "LD-1", name: "Asha", status: "contacted", idleDays: 4, stageDate: "2026-11-04",
    consultantId: "c1", consultantEmail: "rahul@vrooma.in", ...over,
  });
  const booking = (over: Partial<BookingFollowUp> = {}): BookingFollowUp => ({
    bookingId: "b1", leadId: "l2", leadName: "Vikram", leadRef: "LD-2", car: "Model H", consultantId: "c1", consultantEmail: "rahul@vrooma.in", ...over,
  });

  it("creates one task and one consultant email per stale lead, keyed by stage so a moved-on lead restarts", () => {
    const { tasks, rows } = planFollowUps({ stale: [stale()], postDrive: [], noShows: [] }, now, { ALERT_EMAIL: "ops@vrooma.in" });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ lead_id: "l1", assigned_to: "c1", kind: "stale", source: "automation", idempotency_key: "stale3:l1:2026-11-04" });
    expect(rows.map((r) => [r.to_address, r.template, r.idempotency_key])).toEqual([["rahul@vrooma.in", "lead_task_assigned", "task:stale3:l1:2026-11-04"]]);
  });

  it("tells the alert mailbox only once a lead has been quiet for a week", () => {
    const week = planFollowUps({ stale: [stale({ idleDays: FOLLOWUP_LIMITS.staleManagerDays })], postDrive: [], noShows: [] }, now, { ALERT_EMAIL: "ops@vrooma.in" });
    expect(week.rows.map((r) => r.to_address)).toEqual(["rahul@vrooma.in", "ops@vrooma.in"]);
    expect(week.rows[1]).toMatchObject({ template: "lead_stale_alert", idempotency_key: "stale7:l1:2026-11-04" });
    const noMailbox = planFollowUps({ stale: [stale({ idleDays: 9 })], postDrive: [], noShows: [] }, now, {});
    expect(noMailbox.rows).toHaveLength(1);
  });

  it("creates post-test-drive and no-show tasks keyed by booking", () => {
    const { tasks } = planFollowUps({ stale: [], postDrive: [booking()], noShows: [booking({ bookingId: "b2", leadId: "l3" })] }, now);
    expect(tasks.map((t) => [t.kind, t.idempotency_key])).toEqual([["post_drive", "postdrive:b1"], ["no_show", "noshow:b2"]]);
    expect(tasks[0].title).toContain("Vikram");
  });

  it("still creates the task when the consultant has no email, and caps each run", () => {
    const { tasks, rows } = planFollowUps({ stale: [stale({ consultantEmail: null })], postDrive: [], noShows: [] }, now);
    expect(tasks).toHaveLength(1);
    expect(rows).toHaveLength(0);
    const many = Array.from({ length: 80 }, (_, i) => stale({ leadId: `l${i}` }));
    expect(planFollowUps({ stale: many, postDrive: [], noShows: [] }, now).tasks).toHaveLength(FOLLOWUP_LIMITS.perRun);
  });
});

describe("migration 0040", () => {
  const sql = fs.readFileSync("supabase/migrations/0040_lead_tasks.sql", "utf8");
  it("is RLS-protected, readable by the assignee or a manager, deduplicated by key and cascades with the lead", () => {
    expect(sql).toContain("ALTER TABLE public.lead_tasks ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("assigned_to = auth.uid() OR private.is_manager()");
    expect(sql).toContain("idempotency_key TEXT UNIQUE");
    expect(sql).toMatch(/lead_id UUID NOT NULL REFERENCES public\.leads\(id\) ON DELETE CASCADE/);
    expect(sql).not.toMatch(/FOR (INSERT|UPDATE|DELETE|ALL)/);
  });
});
