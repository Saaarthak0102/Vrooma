import { findForbiddenDiscountWord } from "@/lib/validation/discount";
import { guardAiText } from "@/server/ai/guard";
import { ruleBasedCopilot, type LeadAiInput } from "@/server/ai/lead-context";

/**
 * Lead Desk Agent: shared types and the rules that apply to EVERY proposal, whether a model or the rule-based
 * fallback produced it. The agent only proposes; a consultant approves, and approval runs the existing guarded
 * actions (set_lead_status, reassign_lead) or fills the editable reply box. Nothing is sent or booked by the agent.
 */

export const PROPOSABLE_STATUSES = ["contacted", "test_drive_booked", "negotiating"] as const;
export type ProposableStatus = (typeof PROPOSABLE_STATUSES)[number];

export type AgentProposal =
  | { kind: "reply"; reason: string; text: string }
  | { kind: "offer_slot"; reason: string; slotId: string; label: string }
  | { kind: "status_change"; reason: string; status: ProposableStatus }
  | { kind: "reassign"; reason: string; consultantId: string; consultantName: string }
  | { kind: "task"; reason: string; title: string; dueInHours: number }
  | { kind: "escalate"; reason: string };

export interface SlotOption {
  id: string;
  label: string;
}
export interface ConsultantOption {
  id: string;
  name: string;
  openLeads: number;
}

export const MAX_PROPOSALS = 3;
const MAX_REASON = 160;

export interface ProposalContext {
  slots: SlotOption[];
  consultants: ConsultantOption[];
  currentAssigneeId: string | null;
}

/**
 * Checks one proposal against what is actually possible and allowed. Returns the cleaned proposal (labels and names
 * come from our data, never from the model) or an error string the model can read and correct.
 */
export function validateProposal(p: AgentProposal, ctx: ProposalContext): { ok: true; proposal: AgentProposal } | { ok: false; error: string } {
  const reason = (p.reason ?? "").trim().slice(0, MAX_REASON);
  if (reason.length < 3) return { ok: false, error: "Give a short reason." };

  switch (p.kind) {
    case "reply": {
      const verdict = guardAiText(p.text, { maxChars: 420, groundingSources: [] });
      if (!verdict.ok) {
        return { ok: false, error: `Reply rejected (${verdict.reason}): no discounts or price cuts, no rupee amounts, no registration numbers, under 420 characters.` };
      }
      return { ok: true, proposal: { ...p, reason, text: p.text.trim() } };
    }
    case "offer_slot": {
      const slot = ctx.slots.find((s) => s.id === p.slotId);
      if (!slot) return { ok: false, error: "Unknown slot. Use an id from get_open_slots." };
      return { ok: true, proposal: { kind: "offer_slot", reason, slotId: slot.id, label: slot.label } };
    }
    case "status_change":
      if (!PROPOSABLE_STATUSES.includes(p.status)) {
        return { ok: false, error: "Only contacted, test_drive_booked or negotiating can be proposed. Won and lost are the consultant's decision." };
      }
      return { ok: true, proposal: { ...p, reason } };
    case "reassign": {
      const target = ctx.consultants.find((c) => c.id === p.consultantId);
      if (!target) return { ok: false, error: "Unknown consultant. Use an id from get_consultant_load." };
      if (target.id === ctx.currentAssigneeId) return { ok: false, error: "That consultant already owns this lead." };
      return { ok: true, proposal: { kind: "reassign", reason, consultantId: target.id, consultantName: target.name } };
    }
    case "task": {
      const title = (p.title ?? "").trim();
      if (title.length < 3 || title.length > 100) return { ok: false, error: "Task title must be 3-100 characters." };
      const due = Number.isFinite(p.dueInHours) ? Math.min(168, Math.max(0, Math.round(p.dueInHours))) : 24;
      return { ok: true, proposal: { kind: "task", reason, title, dueInHours: due } };
    }
    case "escalate":
      return { ok: true, proposal: { kind: "escalate", reason } };
    default:
      return { ok: false, error: "Unknown proposal kind." };
  }
}

/** Keeps at most one proposal per kind, in the given (ranked) order, and no more than MAX_PROPOSALS. */
export function finalizeProposals(proposals: AgentProposal[]): AgentProposal[] {
  const seen = new Set<string>();
  const out: AgentProposal[] = [];
  for (const p of proposals) {
    if (seen.has(p.kind)) continue;
    seen.add(p.kind);
    out.push(p);
    if (out.length === MAX_PROPOSALS) break;
  }
  return out;
}

const buyerWords = (input: LeadAiInput) =>
  [input.message ?? "", ...input.chat.filter((c) => c.role === "buyer").map((c) => c.text)].join(" \n ");

/**
 * The deterministic suggestions used when AI is off, capped, slow, or blocked. Same output shape as the agent, and
 * every proposal passes through validateProposal like the model's do.
 */
export function ruleBasedProposals(input: LeadAiInput, ctx: ProposalContext): AgentProposal[] {
  const out: AgentProposal[] = [];
  const asksForDiscount = findForbiddenDiscountWord(buyerWords(input)) !== null;
  const draft = ruleBasedCopilot(input).draftReply;
  const first = input.firstName || "there";

  if (asksForDiscount) {
    out.push({ kind: "escalate", reason: "The buyer asked about a discount. Pricing talks belong with the manager, not in chat." });
  }

  if (input.status === "new" && !input.firstContacted) {
    out.push({ kind: "task", title: "Call the buyer now", dueInHours: 0, reason: "New lead, not contacted yet. The 5-minute SLA applies." });
    out.push({ kind: "reply", text: draft, reason: "A short first message for WhatsApp while you dial." });
    if (ctx.slots[0]) {
      out.push({ kind: "offer_slot", slotId: ctx.slots[0].id, label: ctx.slots[0].label, reason: "Offer the next free test drive slot in your reply." });
    }
  } else if (input.status === "test_drive_booked") {
    out.push({ kind: "task", title: "Confirm the test drive slot", dueInHours: 4, reason: "A drive is booked: confirm and have the car ready." });
  } else if (input.status === "contacted" || input.status === "negotiating") {
    out.push({
      kind: "reply",
      text: `Namaste ${first}, just checking in on the ${input.modelName ?? "car"} you were looking at. I can book a test drive or answer any question. What would help most?`,
      reason: "A light follow-up keeps the conversation warm.",
    });
    out.push({ kind: "task", title: "Follow up with the buyer", dueInHours: 24, reason: "No next step is recorded yet." });
    if (ctx.slots[0]) {
      out.push({ kind: "offer_slot", slotId: ctx.slots[0].id, label: ctx.slots[0].label, reason: "A concrete slot moves the lead forward." });
    }
  }

  const valid: AgentProposal[] = [];
  for (const p of out) {
    const v = validateProposal(p, ctx);
    if (v.ok) valid.push(v.proposal);
  }
  return finalizeProposals(valid);
}
