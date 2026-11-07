"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CalendarClock, CheckCircle2, Flag, ListChecks, MessageSquareText, PhoneCall, Sparkles, UserCog, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

const KIND_BADGE: Record<AgentProposal["kind"], "accent" | "outline" | "warn"> = {
  reply: "accent",
  offer_slot: "accent",
  status_change: "outline",
  reassign: "outline",
  task: "outline",
  escalate: "warn",
};

function iconFor(p: AgentProposal) {
  switch (p.kind) {
    case "reply":
      return MessageSquareText;
    case "offer_slot":
      return CalendarClock;
    case "status_change":
      return Workflow;
    case "reassign":
      return UserCog;
    case "task":
      return p.dueInHours === 0 ? PhoneCall : ListChecks;
    case "escalate":
      return Flag;
  }
}

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

type RowState = "idle" | "loading" | "success";

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
  /** Keyed by kind: there is at most one proposal per kind. */
  const [rows, setRows] = useState<Partial<Record<AgentProposal["kind"], RowState>>>({});
  const [tasks, setTasks] = useState<LeadTaskView[]>([]);
  const timers = useRef<number[]>([]);

  const loadTasks = useCallback(async () => {
    const res = await listLeadTasksAction(leadId);
    if (res.ok) setTasks(res.data);
  }, [leadId]);

  useEffect(() => {
    setProposals(null);
    setRows({});
    void loadTasks();
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [leadId, loadTasks]);

  const suggest = async () => {
    setLoading(true);
    setRows({});
    const res = await getLeadProposalsAction(leadId);
    setLoading(false);
    if (res.ok) {
      setProposals(res.data.proposals);
      setFromAi(res.data.source === "ai");
    } else {
      toast.error(res.error.message);
    }
  };

  const setRow = (kind: AgentProposal["kind"], state: RowState) => setRows((r) => ({ ...r, [kind]: state }));

  const apply = async (p: AgentProposal) => {
    setRow(p.kind, "loading");
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
    if (!ok) {
      setRow(p.kind, "idle");
      toast.error(message);
      return;
    }
    toast.success(message);
    setRow(p.kind, "success");
    // Let the "Done" state show for a moment, then take the row out.
    timers.current.push(
      window.setTimeout(() => setProposals((cur) => (cur ? cur.filter((x) => x.kind !== p.kind) : cur)), 900),
    );
  };

  const finishTask = async (id: string) => {
    const res = await completeLeadTaskAction(id, "done");
    if (res.ok) setTasks((t) => t.filter((x) => x.id !== id));
    else toast.error(res.error.message);
  };

  const busy = Object.values(rows).includes("loading");

  return (
    <section aria-label="Next steps" className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-mute">
          <Sparkles className="h-4 w-4 text-accent-ink" />
          Next steps
          {proposals && !fromAi && (
            <Badge variant="secondary" className="px-2 py-0 text-[10px] normal-case tracking-normal">
              Rule-based
            </Badge>
          )}
        </h3>
        <Button
          size="md"
          variant="outline"
          shape="soft"
          onClick={suggest}
          status={loading ? "loading" : "idle"}
          loadingText="Thinking…"
          className="h-11 text-xs"
        >
          {proposals ? "Suggest again" : "Suggest next steps"}
        </Button>
      </div>

      {loading && (
        <div className="space-y-2" aria-busy="true" aria-label="Working out next steps">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-lg" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
      )}

      {!loading && proposals && proposals.length === 0 && (
        <p className="flex items-center gap-2 py-2 text-xs text-ink-soft">
          <CheckCircle2 className="h-4 w-4 text-accent-ink" /> Nothing more to suggest right now.
        </p>
      )}

      {!loading && proposals && proposals.length > 0 && (
        <ol className="space-y-2">
          {proposals.map((p, i) => {
            const Icon = iconFor(p);
            const state = rows[p.kind] ?? "idle";
            return (
              <li
                key={p.kind}
                style={{ "--i": i } as React.CSSProperties}
                className={`fade-up-item rounded-xl border border-border p-3 transition-[opacity,border-color] duration-200 [@media(hover:hover)_and_(pointer:fine)]:hover:border-black/20 ${
                  state === "success" ? "opacity-60" : ""
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink-soft">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 space-y-1">
                      <Badge variant={KIND_BADGE[p.kind]} className="px-2 py-0 text-[10px]">
                        {KIND_LABEL[p.kind]}
                      </Badge>
                      <p className="text-xs leading-relaxed text-ink">{describe(p)}</p>
                      <p className="text-[11px] text-ink-mute">Why: {p.reason}</p>
                    </div>
                  </div>
                  <Button
                    size="md"
                    variant={p.kind === "escalate" ? "outline" : "primary"}
                    shape="soft"
                    className="h-11 w-full shrink-0 text-xs sm:w-auto"
                    status={state}
                    successText="Done"
                    disabled={busy && state !== "loading"}
                    onClick={() => void apply(p)}
                  >
                    {APPLY_LABEL[p.kind]}
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {tasks.length > 0 && (
        <div className="space-y-1.5 border-t border-border pt-3">
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-mute">
            <ListChecks className="h-3.5 w-3.5" /> Open tasks
          </p>
          <ul className="divide-y divide-border">
            {tasks.map((t) => {
              const overdue = new Date(t.dueAt).getTime() < Date.now();
              return (
                <li key={t.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                  <span className="min-w-0 space-y-0.5">
                    <span className="block truncate font-semibold text-ink">{t.title}</span>
                    <span className="flex items-center gap-1.5 text-ink-mute">
                      Due {dueFmt.format(new Date(t.dueAt))}
                      {overdue && (
                        <Badge variant="danger" className="px-1.5 py-0 text-[10px]">
                          Overdue
                        </Badge>
                      )}
                    </span>
                  </span>
                  <Button
                    size="md"
                    variant="ghost"
                    shape="soft"
                    className="h-11 shrink-0 px-3 text-xs"
                    onClick={() => void finishTask(t.id)}
                    aria-label={`Mark done: ${t.title}`}
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Done
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
