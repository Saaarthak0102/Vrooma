import React from "react";
import { formatINR } from "@/lib/money";
import { Calendar, ShieldCheck, Clock, MapPin } from "lucide-react";

export interface PhoneScreenHomeProps {
  modelName?: string;
  variantName?: string;
  onRoadPrice?: number | null;
  validUntil?: string;
  nextSlotTime?: string;
  nextShowroom?: string;
}

export function PhoneScreenHome({
  modelName = "Model H",
  variantName = "ZX Automatic",
  onRoadPrice = 1459450,
  validUntil = "31 Dec 2026",
  nextSlotTime = "Today, 4:00 PM",
  nextShowroom = "Hazratganj Flagship",
}: PhoneScreenHomeProps) {
  return (
    <div className="flex flex-col h-full text-ink text-left space-y-3 pt-1">
      {/* Top greeting */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-ink-mute">Vrooma Lucknow</span>
          <h4 className="text-sm font-extrabold tracking-tight text-ink leading-tight">Welcome, Buyer</h4>
        </div>
        <div className="h-6 px-2 rounded-pill bg-accent/15 text-accent-ink text-[10px] font-bold flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          <span>Authorised</span>
        </div>
      </div>

      {/* Hero Car Miniature Card */}
      <div className="rounded-2xl bg-white p-3 border border-border/80 shadow-sm space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-semibold text-accent-ink uppercase">Featured Model</span>
            <h5 className="text-xs font-bold text-ink">{modelName}</h5>
            <p className="text-[10px] text-ink-mute">{variantName}</p>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-ink-mute block">On-road Lucknow</span>
            <span className="text-xs font-black text-ink">{formatINR(onRoadPrice)}</span>
          </div>
        </div>
        <div className="text-[9px] text-ink-mute border-t border-border/60 pt-1 flex items-center justify-between">
          <span>Valid until {validUntil}</span>
          <span className="text-accent-ink font-semibold">Ready in stock</span>
        </div>
      </div>

      {/* Next Free Slot Chip */}
      <div className="rounded-xl bg-dark text-white p-2.5 space-y-1.5 shadow-sm">
        <div className="flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1 text-slate-300">
            <Clock className="h-3 w-3 text-accent" />
            Next Free Slot
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold text-white">{nextSlotTime}</span>
          <span className="text-[9px] text-slate-400 truncate max-w-[120px]">{nextShowroom}</span>
        </div>
      </div>

      {/* Quick Action Badges */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <div className="rounded-xl bg-white/80 border border-border p-2">
          <span className="text-[10px] font-bold text-ink block">Test Drive</span>
          <span className="text-[9px] text-ink-mute">Demo car at home</span>
        </div>
        <div className="rounded-xl bg-white/80 border border-border p-2">
          <span className="text-[10px] font-bold text-ink block">Book Service</span>
          <span className="text-[9px] text-ink-mute">16 bays available</span>
        </div>
      </div>
    </div>
  );
}
