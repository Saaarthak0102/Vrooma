import React from "react";
import { formatINR } from "@/lib/money";
import { Info } from "lucide-react";

export interface PhoneScreenPriceProps {
  variantName?: string;
  exShowroom?: number;
  rto?: number;
  insurance?: number;
  handling?: number;
  tcs?: number;
  total?: number;
  validUntil?: string;
}

export function PhoneScreenPrice({
  variantName = "Model H ZX Automatic",
  exShowroom = 1245000,
  rto = 124500,
  insurance = 42000,
  handling = 8500,
  tcs = 12450,
  total = 1432450,
  validUntil = "31 Dec 2026",
}: PhoneScreenPriceProps) {
  const rows = [
    { label: "Ex-Showroom Price", amount: exShowroom },
    { label: "RTO Road Tax (UP 10%)", amount: rto },
    { label: "Comprehensive Insurance", amount: insurance },
    { label: "Dealer Logistics & Handling", amount: handling },
    { label: "Statutory TCS (1%)", amount: tcs },
  ];

  return (
    <div className="flex flex-col h-full text-ink text-left space-y-2.5 pt-1">
      <div>
        <span className="text-[10px] font-semibold text-accent-ink uppercase tracking-wider">
          Official Price Breakup
        </span>
        <h4 className="text-xs font-extrabold text-ink leading-tight">{variantName}</h4>
        <span className="text-[9px] text-ink-mute">Lucknow RTO Jurisdiction</span>
      </div>

      <div className="rounded-xl bg-white p-2.5 border border-border shadow-sm space-y-1.5 flex-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between text-[10px]">
            <span className="text-ink-soft">{r.label}</span>
            <span className="font-semibold text-ink">{formatINR(r.amount)}</span>
          </div>
        ))}

        <div className="border-t border-border/80 pt-1.5 mt-1.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-ink block">On-Road Lucknow</span>
            <span className="text-[8px] text-ink-mute">Itemised total</span>
          </div>
          <span className="text-xs font-black text-ink">{formatINR(total)}</span>
        </div>
      </div>

      {/* Validity caption */}
      <div className="rounded-lg bg-ink/5 p-2 flex items-start gap-1.5 text-[8.5px] text-ink-soft leading-tight">
        <Info className="h-3 w-3 shrink-0 text-ink-mute mt-0.5" />
        <div>
          <span>Valid until {validUntil}</span>
          <p className="text-ink-mute text-[8px] mt-0.5">Statutory charges subject to RTO revision.</p>
        </div>
      </div>
    </div>
  );
}
