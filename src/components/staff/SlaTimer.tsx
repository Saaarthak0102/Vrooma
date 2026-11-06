"use client";

import React, { useState, useEffect } from "react";
import { slaState, SlaResult } from "@/lib/sla";
import { Clock, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

export interface SlaTimerProps {
  dueAt: string;
  firstContactedAt?: string | null;
  className?: string;
}

export function SlaTimer({ dueAt, firstContactedAt, className }: SlaTimerProps) {
  // The countdown depends on "now". Rendering it with new Date() on the server and again on the client makes the
  // two texts differ by a few seconds, which React reports as a hydration mismatch (error #418). So the first
  // render is time-independent (a neutral placeholder, or the final "met" state when already contacted) and the
  // live value is filled in after mount.
  const [sla, setSla] = useState<SlaResult | null>(() =>
    firstContactedAt ? slaState(dueAt, firstContactedAt, new Date(firstContactedAt)) : null
  );

  useEffect(() => {
    // If already contacted, timer does not need to tick
    if (firstContactedAt) {
      setSla(slaState(dueAt, firstContactedAt, new Date(firstContactedAt)));
      return;
    }

    setSla(slaState(dueAt, null, new Date()));
    const interval = setInterval(() => {
      setSla(slaState(dueAt, null, new Date()));
    }, 1000);

    return () => clearInterval(interval);
  }, [dueAt, firstContactedAt]);

  if (!sla) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill border text-xs font-mono font-medium select-none bg-emerald-50 text-emerald-700 border-emerald-200 ${className ?? ""}`}
        aria-busy="true"
      >
        <Clock className="h-3 w-3" />
        <span>--:--</span>
      </span>
    );
  }

  const stateStyles = {
    met: "bg-accent/15 text-accent-ink border-accent/30",
    ok: "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse",
    warn: "bg-amber-50 text-amber-700 border-amber-300 font-bold animate-bounce",
    breached: "bg-red-50 text-danger border-red-200 font-bold",
  };

  const icons = {
    met: <CheckCircle2 className="h-3 w-3" />,
    ok: <Clock className="h-3 w-3" />,
    warn: <AlertTriangle className="h-3 w-3" />,
    breached: <AlertCircle className="h-3 w-3" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill border text-xs font-mono font-medium transition-colors select-none ${stateStyles[sla.state]} ${className}`}
      title={`SLA Target: 5 mins | Current State: ${sla.state.toUpperCase()}`}
    >
      {icons[sla.state]}
      <span>{sla.label}</span>
    </span>
  );
}

