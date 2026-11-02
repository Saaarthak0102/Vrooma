"use client";

import React, { useState } from "react";
import { OnRoadBreakup } from "@/lib/price-engine";
import { formatINR } from "@/lib/money";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, Info } from "lucide-react";

export interface PriceBreakupProps {
  breakup: OnRoadBreakup | null;
  cityName: string;
  onToggleAccessories?: (include: boolean) => void;
  includeAccessories?: boolean;
}

export function PriceBreakup({
  breakup,
  cityName,
  onToggleAccessories,
  includeAccessories = true,
}: PriceBreakupProps) {
  if (!breakup) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center bg-white/40">
        <Info className="h-6 w-6 text-ink-mute mx-auto mb-2" />
        <h4 className="text-sm font-bold text-ink">Price Table Not Available</h4>
        <p className="text-xs text-ink-soft mt-1">
          No active RTO price rule found for {cityName}. Please contact our showroom desk for an official quote.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h4 className="text-base font-bold text-ink flex items-center gap-2">
            On-Road Price Breakdown
            <span className="text-xs font-semibold text-accent-ink bg-accent/15 px-2 py-0.5 rounded-pill">
              {cityName}
            </span>
          </h4>
          <p className="text-xs text-ink-mute mt-0.5">
            Valid until {breakup.validUntil} · Official Dealer RTO Rates
          </p>
        </div>
        <ShieldCheck className="h-5 w-5 text-accent-ink shrink-0" />
      </div>

      {/* Component lines */}
      <div className="space-y-2.5 text-xs">
        {breakup.lines.map((line) => {
          if (line.key === "accessories") {
            return (
              <div
                key={line.key}
                className="flex items-center justify-between py-1 px-2 rounded-md bg-ink/[0.02]"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="acc-toggle"
                    checked={includeAccessories}
                    onCheckedChange={(c) => onToggleAccessories?.(!!c)}
                  />
                  <label htmlFor="acc-toggle" className="cursor-pointer font-medium text-ink">
                    {line.label} (Optional)
                  </label>
                </div>
                <span className="font-semibold text-ink">{formatINR(line.amount)}</span>
              </div>
            );
          }

          return (
            <div key={line.key} className="flex items-center justify-between py-0.5 px-2">
              <span className="text-ink-soft">{line.label}</span>
              <span className="font-semibold text-ink">{formatINR(line.amount)}</span>
            </div>
          );
        })}
      </div>

      {/* Total on-road */}
      <div className="pt-3 border-t border-border flex items-baseline justify-between px-2 bg-accent/10 rounded-lg p-3">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-dark">
            Total On-Road Price ({cityName})
          </span>
          <p className="text-[10px] text-ink-soft">Includes RTO, 3-Yr Insurance & statutory levies</p>
        </div>
        <span className="text-xl font-extrabold text-ink">{formatINR(breakup.total)}</span>
      </div>

      {/* Statutory warning */}
      <p className="text-[11px] text-ink-mute leading-tight pt-1 px-1">
        * Prices, RTO road taxes and statutory levies are indicative and subject to change per government regulations at the time of invoicing.
      </p>
    </div>
  );
}

