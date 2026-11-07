"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logCallAction } from "@/server/actions/calls";
import { CALL_OUTCOMES, type CallOutcome } from "@/lib/call-outcomes";

const OUTCOME_LABEL: Record<CallOutcome, string> = {
  answered: "Answered",
  missed: "Missed",
  voicemail: "Went to voicemail",
};

/** Manual entry for a service-desk call until a telephony vendor posts to /api/webhooks/calls. */
export function LogCallForm({ workshops }: { workshops: { id: string; name: string }[] }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<CallOutcome>("answered");
  const [workshopId, setWorkshopId] = useState("");
  const [callerNumber, setCallerNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await logCallAction({
        outcome,
        direction: "inbound",
        workshopId: workshopId || undefined,
        callerNumber: callerNumber || undefined,
        notes: notes || undefined,
      });
      if (!res.ok) throw new Error(res.error.message);
      toast.success("Call logged.");
      setCallerNumber("");
      setNotes("");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Could not log the call.");
    } finally {
      setBusy(false);
    }
  }

  const field = "min-h-[44px] rounded-md border border-border bg-surface px-3 text-sm text-ink";

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-3" aria-label="Log a service call">
      <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
        Outcome
        <select className={field} value={outcome} onChange={(e) => setOutcome(e.target.value as CallOutcome)}>
          {CALL_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {OUTCOME_LABEL[o]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
        Workshop
        <select className={field} value={workshopId} onChange={(e) => setWorkshopId(e.target.value)}>
          <option value="">Any</option>
          {workshops.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
        Caller number (optional, stored masked)
        <input className={field} inputMode="tel" value={callerNumber} onChange={(e) => setCallerNumber(e.target.value)} maxLength={32} />
      </label>
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-semibold text-ink-soft">
        Note (optional)
        <input className={field} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
      </label>
      <Button type="submit" disabled={busy} className="min-h-[44px]">
        {busy ? "Saving…" : "Log call"}
      </Button>
    </form>
  );
}
