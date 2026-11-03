"use client";

import React from "react";
import { Inspection } from "@/types/domain";
import { ShieldCheck, UserCheck, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InspectionSummaryCardProps {
  inspection: Inspection;
  stockId: string;
  className?: string;
}

export function InspectionSummaryCard({
  inspection,
  stockId,
  className,
}: InspectionSummaryCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-white p-6 shadow-card space-y-4",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent-ink shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-bold text-ink">
              140-Point Vrooma Inspection Summary
            </h3>
          </div>
          <p className="text-xs text-ink-mute mt-1 font-mono">Stock ID: {stockId}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left sm:text-right">
            <span className="text-2xl font-black text-accent-ink">
              {inspection.score}
            </span>
            <span className="text-xs font-semibold text-ink-mute">/100</span>
            <p className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold">
              Certified Score
            </p>
          </div>
        </div>
      </div>

      <p className="text-sm text-ink-soft leading-relaxed italic bg-ink/[0.02] p-4 rounded-lg border border-border/60">
        &ldquo;{inspection.summary}&rdquo;
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-ink-mute pt-1">
        <span className="flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5 text-accent-ink shrink-0" />
          <span>Inspector: <strong className="font-semibold text-ink">{inspection.inspector}</strong></span>
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>Inspected: <strong className="font-semibold text-ink">{inspection.date}</strong></span>
        </span>
      </div>
    </div>
  );
}

