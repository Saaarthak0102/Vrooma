"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { suggestNextService } from "@/lib/garage";

export interface ServiceVisitDetails {
  odometerKm: number;
  nextDueOn: string | null;
  nextDueKm: number | null;
  summary: string | null;
}

const istToday = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

/**
 * Shown when staff mark a service appointment as attended. The odometer and next due date go to the buyer's service
 * history (and drive the "service due" reminder, if they opted in). "Attended without details" still records the visit.
 */
export function ServiceVisitDialog({
  open,
  label,
  busy,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  label: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (details: ServiceVisitDetails | null) => void;
}) {
  const [odometer, setOdometer] = useState("");
  const [nextDueOn, setNextDueOn] = useState("");
  const [nextDueKm, setNextDueKm] = useState("");
  const [summary, setSummary] = useState("");

  useEffect(() => {
    if (open) {
      setOdometer("");
      setNextDueOn("");
      setNextDueKm("");
      setSummary("");
    }
  }, [open]);

  const km = Number(odometer);
  const valid = odometer !== "" && Number.isInteger(km) && km >= 0 && km <= 999_999;

  // Suggest the usual interval once the odometer is known; staff can overwrite either field.
  const suggestion = valid ? suggestNextService(istToday(), km) : null;

  const inMonths = (months: number) => {
    const d = new Date(`${istToday()}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + months);
    return d.toISOString().slice(0, 10);
  };
  const dateValue = nextDueOn || suggestion?.nextDueOn || "";
  const kmValue = nextDueKm || (suggestion ? String(suggestion.nextDueKm) : "");
  const quickDates: [string, string][] = [
    ["3 months", inMonths(3)],
    ["6 months", inMonths(6)],
    ["12 months", inMonths(12)],
  ];
  const quickKm = valid ? [5_000, 10_000, 15_000] : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Service attended</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink">Odometer reading (km)</span>
            <Input inputMode="numeric" className="h-11" value={odometer} onChange={(e) => setOdometer(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 18250" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-ink">Next service on</span>
              <Input type="date" className="h-11" value={dateValue} onChange={(e) => setNextDueOn(e.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-ink">or at (km)</span>
              <Input inputMode="numeric" className="h-11" value={kmValue} onChange={(e) => setNextDueKm(e.target.value.replace(/\D/g, ""))} />
            </label>
          </div>
          <div className="space-y-1.5" aria-label="Quick picks for the next service">
            <div className="flex flex-wrap gap-1.5">
              {quickDates.map(([text, date]) => (
                <Button
                  key={text}
                  type="button"
                  size="sm"
                  shape="pill"
                  variant={dateValue === date ? "primary" : "outline"}
                  className="h-11 px-3 text-xs"
                  onClick={() => setNextDueOn(date)}
                >
                  In {text}
                </Button>
              ))}
              {quickKm.map((add) => (
                <Button
                  key={add}
                  type="button"
                  size="sm"
                  shape="pill"
                  variant={kmValue === String(km + add) ? "primary" : "outline"}
                  className="h-11 px-3 text-xs"
                  onClick={() => setNextDueKm(String(km + add))}
                >
                  +{add.toLocaleString("en-IN")} km
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-ink-mute">The owner is reminded 14 and 3 days before this date, if they opted in.</p>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink">Work done (optional)</span>
            <Input maxLength={300} className="h-11" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. Periodic service, brake pads replaced" />
          </label>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" className="h-11" disabled={busy} onClick={() => onSubmit(null)}>
            Attended without details
          </Button>
          <Button
            className="h-11"
            status={busy ? "loading" : "idle"}
            loadingText="Saving…"
            disabled={!valid || busy}
            onClick={() =>
              onSubmit({
                odometerKm: km,
                nextDueOn: nextDueOn || suggestion?.nextDueOn || null,
                nextDueKm: nextDueKm ? Number(nextDueKm) : (suggestion?.nextDueKm ?? null),
                summary: summary.trim() || null,
              })
            }
          >
            Save and mark attended
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
