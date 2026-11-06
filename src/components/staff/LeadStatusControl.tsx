"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateLeadStatusAction } from "@/server/actions/leads";
import type { LeadStatus, Role } from "@/types/domain";

/** The stages a consultant moves a lead through, in funnel order. `new` is system-set so it is not listed. */
const STAGES: { value: LeadStatus; label: string }[] = [
  { value: "contacted", label: "Contacted" },
  { value: "test_drive_booked", label: "Test drive booked" },
  { value: "negotiating", label: "Negotiating" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export interface LeadStatusControlProps {
  leadId: string;
  status: LeadStatus;
  viewerRole: Role;
  onChanged: (status: LeadStatus) => void;
}

/**
 * One-step status change for a lead. "Lost" asks for a reason first.
 * The database (set_lead_status) is the authority: consultants cannot re-open a closed lead.
 */
export function LeadStatusControl({ leadId, status, viewerRole, onChanged }: LeadStatusControlProps) {
  const [pending, setPending] = useState<LeadStatus | null>(null);
  const [askingLostReason, setAskingLostReason] = useState(false);
  const [reason, setReason] = useState("");

  const closed = status === "won" || status === "lost";
  const locked = closed && viewerRole === "consultant";

  const apply = async (next: LeadStatus, lostReason?: string) => {
    setPending(next);
    try {
      const res = await updateLeadStatusAction(leadId, next, lostReason);
      if (!res.ok) {
        toast.error(res.error?.message || "Could not update the lead status.");
        return;
      }
      toast.success(`Lead marked ${STAGES.find((s) => s.value === next)?.label ?? next}.`);
      setAskingLostReason(false);
      setReason("");
      onChanged(res.data.status);
    } finally {
      setPending(null);
    }
  };

  const choose = (next: LeadStatus) => {
    if (next === status) return;
    if (next === "lost") {
      setAskingLostReason(true);
      return;
    }
    setAskingLostReason(false);
    void apply(next);
  };

  return (
    <section
      aria-labelledby="lead-status-heading"
      className="rounded-2xl border border-border bg-surface p-5 shadow-card space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="lead-status-heading" className="text-sm font-bold text-ink">
          Lead stage
        </h2>
        {locked && (
          <span className="text-[11px] text-ink-mute">Closed. A manager can re-open this lead.</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Change lead stage">
        {STAGES.map((stage) => {
          const active = stage.value === status;
          return (
            <Button
              key={stage.value}
              type="button"
              size="sm"
              variant={active ? "primary" : "outline"}
              aria-pressed={active}
              disabled={locked || pending !== null}
              onClick={() => choose(stage.value)}
              className="h-11 min-w-[44px] px-4 text-xs"
            >
              {pending === stage.value ? "Saving…" : stage.label}
            </Button>
          );
        })}
      </div>

      {askingLostReason && (
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            void apply("lost", reason.trim() || "Not specified");
          }}
        >
          <label htmlFor="lost-reason" className="sr-only">
            Reason the lead was lost
          </label>
          <Input
            id="lost-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why was this lead lost? (e.g. bought elsewhere)"
            maxLength={200}
            autoFocus
            className="h-11 text-xs"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending !== null} className="h-11 px-4 text-xs">
              Confirm lost
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAskingLostReason(false)}
              className="h-11 px-4 text-xs"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
