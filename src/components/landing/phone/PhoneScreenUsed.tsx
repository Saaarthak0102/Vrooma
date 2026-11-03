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
    <div className="flex flex-col h-full text-ink text-left space-y-2 pt-1">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[clamp(12px,3.8cqw,13px)] font-semibold text-accent-ink uppercase tracking-wider block">
            Certified Pre-Owned
          </span>
          <span className="text-[clamp(12px,3.5cqw,13px)] font-mono font-bold bg-ink/5 px-1.5 py-0.5 rounded text-ink-mute">
            {stockId}
          </span>
        </div>
        <h4 className="text-[clamp(13px,4.5cqw,16px)] font-extrabold text-ink leading-tight">
          {modelName} {variantName}
        </h4>
        <span className="text-[clamp(12px,3.5cqw,13px)] font-mono text-ink-mute block">{regMasked}</span>
      </div>

      <div className="rounded-xl bg-white p-2.5 border border-border shadow-sm space-y-1.5">
        <div className="grid grid-cols-3 gap-1 text-center py-1 bg-ink/[0.02] rounded-lg">
          <div>
            <span className="text-[clamp(12px,3.4cqw,12.5px)] text-ink-mute uppercase block">Year</span>
            <span className="text-[clamp(12px,3.8cqw,14px)] font-bold text-ink">{year}</span>
          </div>
          <div>
            <span className="text-[clamp(12px,3.4cqw,12.5px)] text-ink-mute uppercase block">Driven</span>
            <span className="text-[clamp(12px,3.8cqw,14px)] font-bold text-ink truncate block">{km.toLocaleString("en-IN")} km</span>
          </div>
          <div>
            <span className="text-[clamp(12px,3.4cqw,12.5px)] text-ink-mute uppercase block">Owner</span>
            <span className="text-[clamp(12px,3.8cqw,14px)] font-bold text-ink">{owners}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-[clamp(12px,3.5cqw,13px)] text-ink-mute block leading-tight">Price (Certified)</span>
            <span className="text-[clamp(13px,4.5cqw,16px)] font-black text-ink">{formatINR(price)}</span>
          </div>
          <div className="text-right">
            <span className="text-[clamp(12px,3.5cqw,13px)] text-ink-mute block leading-tight">Inspection</span>
            <span className="text-[clamp(12px,4cqw,14px)] font-extrabold text-emerald-600 flex items-center gap-1 justify-end">
              <ShieldCheck className="h-3.5 w-3.5" />
              {score}/100
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2 space-y-0.5">
        <div className="flex items-center gap-1.5 text-[clamp(12px,3.6cqw,13px)] font-bold text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>140-Point Rigorous Check</span>
        </div>
        <p className="text-[clamp(12px,3.4cqw,12.5px)] text-emerald-700 leading-tight">
          First owner, full service logs verified. Masked plate.
        </p>
      </div>
    </div>
  );
}
