"use client";

import React from "react";
import { Inspection } from "@/types/domain";
import { AuthGate } from "@/components/auth/AuthGate";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, ShieldCheck, UserCheck, Calendar } from "lucide-react";

export interface InspectionReportProps {
  inspection: Inspection;
  stockId: string;
}

export function InspectionReport({ inspection, stockId }: InspectionReportProps) {
  return (
    <div className="space-y-6">
      {/* Free Summary Card */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent-ink">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-bold text-ink">
                140-Point Vrooma Inspection Summary
              </h3>
            </div>
            <p className="text-xs text-ink-mute mt-1">Stock ID: {stockId}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
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

        <div className="flex items-center justify-between text-xs text-ink-mute pt-1">
          <span className="flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-accent-ink" />
            Inspector: {inspection.inspector}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Inspected: {inspection.date}
          </span>
        </div>
      </div>

      {/* Gated Detailed Inspection Report */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold uppercase tracking-wider text-ink-soft">
          Detailed Checkpoint Breakdown
        </h4>

        <AuthGate
          actionLabel="Sign in to view all 140 mechanical checks"
          className="rounded-xl border border-dashed border-border bg-white p-8 text-center"
        >
          <div className="rounded-xl border border-border bg-white overflow-hidden shadow-card">
            <div className="p-4 bg-ink/[0.02] border-b border-border flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink">
                Verified Checkpoints ({inspection.checks.length} logged items)
              </span>
              <Badge variant="ok" className="text-xs">
                All Major Systems Passed
              </Badge>
            </div>

            <div className="divide-y divide-border text-xs">
              {inspection.checks.map((check, idx) => {
                const isPass = check.status === "pass";
                return (
                  <div key={idx} className="p-4 flex items-start justify-between gap-4 hover:bg-ink/[0.01]">
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-mute block">
                        {check.category}
                      </span>
                      <p className="font-semibold text-ink">{check.item}</p>
                      {check.notes && (
                        <p className="text-ink-soft text-[11px]">{check.notes}</p>
                      )}
                    </div>
                    <div>
                      {isPass ? (
                        <Badge variant="ok" className="gap-1 text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>PASS</span>
                        </Badge>
                      ) : (
                        <Badge variant="warn" className="gap-1 text-[11px]">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>ATTENTION</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </AuthGate>
      </div>
    </div>
  );
}
