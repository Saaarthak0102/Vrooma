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
import { SuggestionSchema, suggestNextSteps, toProposals, type RawSuggestion } from "@/server/ai/lead-agent";
import type { LeadAiInput } from "@/server/ai/lead-context";
import { FOLLOWUP_LIMITS, planFollowUps, type BookingFollowUp, type StaleLead } from "@/server/automations/followups";
import { runWithFallback, type AiRunDeps, type AiRunOptions } from "@/server/ai/runner";
import type { AiLogEntry } from "@/server/ai/types";
import { findForbiddenDiscountWord } from "@/lib/validation/discount";

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

const raw = (over: Partial<RawSuggestion> = {}): RawSuggestion => ({
  kind: "task", reason: "New lead, the 5-minute SLA applies", text: null, slotId: null, status: null, consultantId: null, title: null, dueInHours: null, ...over,
});

describe("toProposals (the model's flat suggestions, checked against real data)", () => {
  it("keeps valid suggestions of every kind, with labels and names taken from our data", () => {
    const out = toProposals(
      [
        raw({ kind: "task", title: "Call now", dueInHours: 0 }),
        raw({ kind: "reply", text: "Namaste Asha, happy to help with the Model H ZX. Would a test drive this week suit you?" }),
        raw({ kind: "offer_slot", slotId: "s2" }),
      ],
      ctx,
    );
    expect(out.map((p) => p.kind)).toEqual(["task", "reply", "offer_slot"]);
    expect(out[2]).toMatchObject({ slotId: "s2", label: "Tue, 10 Nov, 4:00 pm at Hazratganj" });
    const reassign = toProposals([raw({ kind: "reassign", consultantId: "c2", reason: "lighter load" })], ctx);
    expect(reassign[0]).toMatchObject({ consultantId: "c2", consultantName: "Anita Verma" });
  });

  it("drops anything with a missing field or that breaks a rule", () => {
    const out = toProposals(
      [
        raw({ kind: "task", title: null }), // no title
        raw({ kind: "reply", text: null }), // no text
        raw({ kind: "reply", text: "Namaste Asha, I can give you a discount if you visit today, shall we fix a time?" }),
        raw({ kind: "reply", text: "Namaste Asha, the Model H ZX is ₹12,45,000, shall we fix a visit this week?" }),
        raw({ kind: "offer_slot", slotId: "made-up" }),
        raw({ kind: "reassign", consultantId: "c1" }), // already the owner
        raw({ kind: "reassign", consultantId: "ghost" }),
        raw({ kind: "status_change", status: null }),
      ],
      ctx,
    );
    expect(out).toEqual([]);
  });

  it("keeps one per kind and at most three, in the model's order", () => {
    const out = toProposals(
      [raw({ kind: "task", title: "Call now", dueInHours: 0 }), raw({ kind: "task", title: "Again", dueInHours: 1 }), raw({ kind: "escalate" }), raw({ kind: "offer_slot", slotId: "s1" }), raw({ kind: "status_change", status: "contacted" })],
      ctx,
    );
    expect(out.map((p) => p.kind)).toEqual(["task", "escalate", "offer_slot"]);
  });

  it("clamps a task's due time and defaults a missing one to a day", () => {
    expect(toProposals([raw({ kind: "task", title: "Call now", dueInHours: 9999 })], ctx)[0]).toMatchObject({ dueInHours: 168 });
    expect(toProposals([raw({ kind: "task", title: "Call now", dueInHours: null })], ctx)[0]).toMatchObject({ dueInHours: 24 });
  });
});

describe("SuggestionSchema", () => {
  it("accepts null fields and rejects an unknown kind, a status of won, or too many suggestions", () => {
    expect(SuggestionSchema.safeParse({ proposals: [raw()] }).success).toBe(true);
    expect(SuggestionSchema.safeParse({ proposals: [raw({ kind: "send_money" as never })] }).success).toBe(false);
    expect(SuggestionSchema.safeParse({ proposals: [raw({ kind: "status_change", status: "won" as never })] }).success).toBe(false);
    expect(SuggestionSchema.safeParse({ proposals: Array.from({ length: 5 }, () => raw()) }).success).toBe(false);
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

describe("suggestNextSteps (one request, no tools)", () => {
  it("sends the lead, the open slots and the workload in a single prompt and returns the validated suggestions", async () => {
    const { runner, logs } = fakeRunner();
    let seen: Record<string, unknown> = {};
    const out = await suggestNextSteps(lead(), ctx, {
      runner,
      generate: async (args) => {
        seen = args as never;
        return {
          object: { proposals: [raw({ kind: "task", title: "Call now", dueInHours: 0 }), raw({ kind: "offer_slot", slotId: "s2", reason: "Buyer wants this week" })] },
          usage: { promptTokens: 900, completionTokens: 120 },
        };
      },
    });
    expect(out.source).toBe("ai");
    expect(out.proposals.map((p) => p.kind)).toEqual(["task", "offer_slot"]);
    expect(Object.keys(seen)).not.toContain("tools");
    expect(String(seen.prompt)).toContain("s1 | Tue, 10 Nov, 11:00 am at Hazratganj");
    expect(String(seen.prompt)).toContain("c2 | Anita Verma | 3 open leads");
    expect(String(seen.prompt)).toContain("CURRENT OWNER");
    expect(String(seen.prompt)).toContain("Buyer first name: Asha");
    expect(logs[0]).toMatchObject({ feature: "lead_agent", status: "ok", usage: { inputTokens: 900, outputTokens: 120 } });
  });

  it("falls back to rule-based suggestions when nothing the model says survives validation", async () => {
    const { runner, logs } = fakeRunner();
    const out = await suggestNextSteps(lead(), ctx, {
      runner,
      generate: async () => ({ object: { proposals: [raw({ kind: "reply", text: "Namaste Asha, I can offer a discount today, shall we fix a time?" })] } }),
    });
    expect(out).toMatchObject({ source: "fallback", reason: "empty" });
    expect(out.proposals[0].kind).toBe("task");
    expect(logs[0].status).toBe("blocked");
  });

  it("uses the rule-based suggestions without calling the model when AI is off", async () => {
    const { runner } = fakeRunner(false);
    let called = false;
    const out = await suggestNextSteps(lead(), ctx, { runner, generate: async () => ((called = true), { object: { proposals: [] } }) });
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
