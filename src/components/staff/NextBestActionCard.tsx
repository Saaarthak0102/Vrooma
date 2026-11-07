"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ListChecks, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AgentProposal } from "@/lib/lead-agent";
import {
  completeLeadTaskAction,
  createLeadTaskAction,
  escalateLeadAction,
  getLeadProposalsAction,
  listLeadTasksAction,
  type LeadTaskView,
} from "@/server/actions/lead-agent";
import { reassignLeadAction, updateLeadStatusAction } from "@/server/actions/leads";
import type { LeadStatus } from "@/types/domain";

const dueFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const KIND_LABEL: Record<AgentProposal["kind"], string> = {
  reply: "Draft a message",
  offer_slot: "Offer a test drive slot",
  status_change: "Move the stage",
  reassign: "Hand to another consultant",
  task: "Add a follow-up",
  escalate: "Ask a manager",
};

function describe(p: AgentProposal): string {
  switch (p.kind) {
    case "reply":
      return `“${p.text}”`;
    case "offer_slot":
      return p.label;
    case "status_change":
      return `Mark as ${p.status.replace(/_/g, " ")}`;
    case "reassign":
      return `Reassign to ${p.consultantName}`;
    case "task":
      return `${p.title}${p.dueInHours === 0 ? " (now)" : ` (within ${p.dueInHours} h)`}`;
    case "escalate":
      return "Pricing or a complaint needs a manager";
  }
}

const APPLY_LABEL: Record<AgentProposal["kind"], string> = {
  reply: "Use as draft",
  offer_slot: "Add to draft",
  status_change: "Apply",
  reassign: "Reassign",
  task: "Add task",
  escalate: "Escalate",
};

/**
 * The Lead Desk Agent in the lead drawer. "Suggest next steps" asks for up to three proposals; nothing happens until
 * the consultant presses Apply on one. Messages only go into the editable reply box; they are never sent from here.
 */
export function NextBestActionCard({
  leadId,
  onUseDraft,
  onLeadChanged,
}: {
  leadId: string;
  /** Put text into the reply box: replace it, or append a sentence to what is there. */
  onUseDraft: (text: string, mode: "replace" | "append") => void;
  /** The stage or owner changed; reload the lead. */
  onLeadChanged: () => void;
}) {
  const [proposals, setProposals] = useState<AgentProposal[] | null>(null);
  const [fromAi, setFromAi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [tasks, setTasks] = useState<LeadTaskView[]>([]);

  const loadTasks = useCallback(async () => {
    const res = await listLeadTasksAction(leadId);
    if (res.ok) setTasks(res.data);
  }, [leadId]);

  useEffect(() => {
    setProposals(null);
    void loadTasks();
  }, [leadId, loadTasks]);

  const suggest = async () => {
    setLoading(true);
    const res = await getLeadProposalsAction(leadId);
    setLoading(false);
    if (res.ok) {
      setProposals(res.data.proposals);
      setFromAi(res.data.source === "ai");
    } else {
      toast.error(res.error.message);
    }
  };

  const apply = async (p: AgentProposal, index: number) => {
    setBusy(index);
    try {
      let ok = true;
      let message = "Done.";
      switch (p.kind) {
        case "reply":
          onUseDraft(p.text, "replace");
          message = "Added to the reply box. Edit it, then send.";
          break;
        case "offer_slot":
          onUseDraft(`Would ${p.label} suit you for a test drive?`, "append");
          message = "Added to the reply box.";
          break;
        case "status_change": {
          const r = await updateLeadStatusAction(leadId, p.status as LeadStatus);
          ok = r.ok;
          if (!r.ok) message = r.error.message;
          else onLeadChanged();
          break;
        }
        case "reassign": {
          const r = await reassignLeadAction(leadId, p.consultantId, p.reason);
          ok = r.ok;
          if (!r.ok) message = r.error.message;
          else onLeadChanged();
          break;
        }
        case "task": {
          const r = await createLeadTaskAction(leadId, p.title, p.dueInHours, p.reason);
          ok = r.ok;
          if (!r.ok) message = r.error.message;
          else void loadTasks();
          break;
        }
        case "escalate": {
          const r = await escalateLeadAction(leadId, p.reason);
          ok = r.ok;
          message = r.ok ? (r.data.queued ? "A manager has been notified." : "Escalation recorded.") : r.error.message;
          break;
        }
      }
      if (ok) {
        toast.success(message);
        setProposals((cur) => (cur ? cur.filter((_, i) => i !== index) : cur));
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(null);
    }
  };

  const finishTask = async (id: string) => {
    const res = await completeLeadTaskAction(id, "done");
    if (res.ok) setTasks((t) => t.filter((x) => x.id !== id));
    else toast.error(res.error.message);
  };

  return (
    <section aria-label="Next steps" className="space-y-3 rounded-xl border border-border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink">
          <Sparkles className="h-4 w-4 text-accent-ink" />
          Next steps
        </h3>
        <Button size="sm" variant="outline" onClick={suggest} disabled={loading}>
          {loading ? "Thinking…" : proposals ? "Suggest again" : "Suggest next steps"}
        </Button>
      </div>

      {proposals && proposals.length === 0 && <p className="text-xs text-ink-soft">Nothing more to suggest right now.</p>}
      {proposals && proposals.length > 0 && (
        <>
          {!fromAi && <p className="text-[11px] text-ink-mute">Rule-based suggestions (the AI assistant is not available right now).</p>}
          <ol className="space-y-2">
            {proposals.map((p, i) => (
              <li key={`${p.kind}-${i}`} className="rounded-lg border border-border/70 bg-bg-sheen/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{KIND_LABEL[p.kind]}</p>
                    <p className="text-xs leading-relaxed text-ink">{describe(p)}</p>
                    <p className="text-[11px] text-ink-mute">Why: {p.reason}</p>
                  </div>
                  <Button size="sm" className="shrink-0" disabled={busy !== null} onClick={() => apply(p, i)}>
                    {APPLY_LABEL[p.kind]}
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {tasks.length > 0 && (
        <div className="space-y-1.5 border-t border-border/60 pt-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
            <ListChecks className="h-3.5 w-3.5" /> Open tasks
          </p>
          <ul className="space-y-1.5">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0">
                  <span className="font-semibold text-ink">{t.title}</span>
                  <span className={`ml-2 ${new Date(t.dueAt).getTime() < Date.now() ? "text-danger" : "text-ink-mute"}`}>due {dueFmt.format(new Date(t.dueAt))}</span>
                </span>
                <Button size="sm" variant="ghost" className="h-11 shrink-0 px-2" onClick={() => finishTask(t.id)} aria-label={`Mark done: ${t.title}`}>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Done
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
