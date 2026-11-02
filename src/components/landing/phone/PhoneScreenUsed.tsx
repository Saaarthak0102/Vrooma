import React from "react";
import { formatINR } from "@/lib/money";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

export interface PhoneScreenUsedProps {
  stockId?: string;
  modelName?: string;
  variantName?: string;
  year?: number;
  km?: number;
  owners?: number;
  price?: number;
  regMasked?: string;
  score?: number;
}

export function PhoneScreenUsed({
  stockId = "UC-1182",
  modelName = "Model C",
  variantName = "VX Turbo Diesel",
  year = 2022,
  km = 41200,
  owners = 1,
  price = 845000,
  regMasked = "UP32 ** **** 4120",
  score = 94,
}: PhoneScreenUsedProps) {
  return (
    <div className="flex flex-col h-full text-ink text-left space-y-2.5 pt-1">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-accent-ink uppercase tracking-wider">
            Certified Pre-Owned
          </span>
          <span className="text-[9px] font-mono font-bold bg-ink/5 px-1.5 py-0.5 rounded text-ink-mute">
            {stockId}
          </span>
        </div>
        <h4 className="text-xs font-extrabold text-ink leading-tight">
          {modelName} {variantName}
        </h4>
        <span className="text-[9px] font-mono text-ink-mute block">{regMasked}</span>
      </div>

      <div className="rounded-xl bg-white p-2.5 border border-border shadow-sm space-y-2">
        <div className="grid grid-cols-3 gap-1 text-center py-1 bg-ink/[0.02] rounded-lg">
          <div>
            <span className="text-[8px] text-ink-mute uppercase block">Year</span>
            <span className="text-[11px] font-bold text-ink">{year}</span>
          </div>
          <div>
            <span className="text-[8px] text-ink-mute uppercase block">Driven</span>
            <span className="text-[11px] font-bold text-ink">{km.toLocaleString("en-IN")} km</span>
          </div>
          <div>
            <span className="text-[8px] text-ink-mute uppercase block">Owner</span>
            <span className="text-[11px] font-bold text-ink">{owners}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-[9px] text-ink-mute block">Price (Certified)</span>
            <span className="text-sm font-black text-ink">{formatINR(price)}</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-ink-mute block">Inspection</span>
            <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              {score}/100
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2 space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          <span>140-Point Rigorous Check Passed</span>
        </div>
        <p className="text-[8.5px] text-emerald-700 leading-tight">
          First owner, full authorized dealership service logs verified. Registration masked for privacy.
        </p>
      </div>
    </div>
  );
}
