"use client";

import React from "react";
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
      <div className="rounded-xl border border-dashed border-border p-6 text-center bg-white/60">
        <Info className="h-6 w-6 text-ink-mute mx-auto mb-2" />
        <h4 className="text-sm font-bold text-ink">Price Table Not Available</h4>
        <p className="text-xs text-ink-soft mt-1">
          No active RTO price rule found for {cityName}. Please contact our showroom desk for an official quote.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-white p-5 sm:p-6 shadow-sm space-y-4 text-left">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-ink">
              On-Road Price Breakdown
            </h4>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-600/20 px-2 py-0.5 rounded-full">
              {cityName}
            </span>
          </div>
          <p className="text-xs text-ink-mute mt-1">
            Valid until {breakup.validUntil} · Official Dealer RTO Rates
          </p>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50/80 px-2 py-1 rounded-md shrink-0">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>Verified</span>
        </div>
      </div>

      {/* Component lines */}
      <div className="space-y-2 divide-y divide-border/30 text-xs sm:text-[13px]">
        {breakup.lines.map((line) => {
          if (line.key === "accessories") {
            return (
              <div
                key={line.key}
                className="flex items-center justify-between pt-2 py-1 px-1 rounded-md bg-stone-50/60"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="acc-toggle"
                    checked={includeAccessories}
                    onCheckedChange={(c) => onToggleAccessories?.(!!c)}
                  />
                  <label htmlFor="acc-toggle" className="cursor-pointer font-medium text-ink">
                    {line.label} <span className="text-[11px] text-ink-mute">(Optional)</span>
                  </label>
                </div>
                <span className="font-semibold text-ink">{formatINR(line.amount)}</span>
              </div>
            );
          }

          return (
            <div key={line.key} className="flex items-center justify-between pt-2 px-1">
              <span className="text-ink-soft">{line.label}</span>
              <span className="font-semibold text-ink">{formatINR(line.amount)}</span>
            </div>
          );
        })}
      </div>

      {/* Total on-road summary */}
      <div className="pt-3 border-t border-border/60">
        <div className="flex items-center justify-between p-3.5 bg-emerald-50/60 border border-emerald-600/20 rounded-xl">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-ink block">
              Total On-Road Price ({cityName})
            </span>
            <span className="text-[10px] text-ink-soft block mt-0.5">
              Includes RTO, 3-Yr Insurance & statutory levies
            </span>
          </div>
          <span className="text-lg sm:text-xl font-black text-ink tracking-tight ml-2">
            {formatINR(breakup.total)}
          </span>
        </div>
      </div>

      {/* Statutory warning */}
      <p className="text-[11px] text-ink-mute leading-relaxed pt-1">
        * Prices, RTO road taxes and statutory levies are indicative and subject to change per government regulations at the time of invoicing.
      </p>
    </div>
  );
}

