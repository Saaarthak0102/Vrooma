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
    <div className="flex flex-col h-full text-ink text-left space-y-2.5 pt-1">
      {/* Top greeting */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[clamp(12px,3.8cqw,13px)] uppercase font-bold tracking-wider text-ink-mute block">
            Vrooma Lucknow
          </span>
          <h4 className="text-[clamp(14px,5.2cqw,18px)] font-extrabold tracking-tight text-ink leading-tight">
            Welcome, Buyer
          </h4>
        </div>
        <div className="h-6 px-2 rounded-pill bg-accent/15 text-accent-ink text-[clamp(12px,3.6cqw,13px)] font-bold flex items-center gap-1 shrink-0">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Authorised</span>
        </div>
      </div>

      {/* Hero Car Miniature Card */}
      <div className="rounded-2xl bg-white p-2.5 sm:p-3 border border-border/80 shadow-sm space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[clamp(12px,3.6cqw,13px)] font-semibold text-accent-ink uppercase block leading-tight">
              Featured Model
            </span>
            <h5 className="text-[clamp(13px,4.5cqw,16px)] font-bold text-ink leading-snug">{modelName}</h5>
            <p className="text-[clamp(12px,3.6cqw,13px)] text-ink-mute leading-tight">{variantName}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[clamp(12px,3.5cqw,13px)] text-ink-mute block leading-tight">On-road Lucknow</span>
            <span className="text-[clamp(13px,4.5cqw,16px)] font-black text-ink">{formatINR(onRoadPrice)}</span>
          </div>
        </div>
        <div className="text-[clamp(12px,3.5cqw,13px)] text-ink-mute border-t border-border/60 pt-1.5 flex flex-wrap items-center justify-between gap-1 leading-tight">
          <span>Valid until {validUntil}</span>
          <span className="text-accent-ink font-semibold">Ready in stock</span>
        </div>
      </div>

      {/* Next Free Slot Chip */}
      <div className="rounded-xl bg-dark text-white p-2.5 space-y-1 shadow-sm">
        <div className="flex items-center justify-between text-[clamp(12px,3.6cqw,13px)]">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Clock className="h-3.5 w-3.5 text-accent" />
            Next Free Slot
          </span>
          <span className="h-2 w-2 rounded-full bg-accent" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[clamp(13px,4.2cqw,15px)] font-bold text-white leading-tight">{nextSlotTime}</span>
          <span className="text-[clamp(12px,3.6cqw,13px)] text-slate-300 truncate max-w-[130px]">{nextShowroom}</span>
        </div>
      </div>

      {/* Quick Action Badges */}
      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
        <div className="rounded-xl bg-white/90 border border-border p-2">
          <span className="text-[clamp(12px,3.8cqw,13px)] font-bold text-ink block leading-tight">Test Drive</span>
          <span className="text-[clamp(12px,3.5cqw,13px)] text-ink-mute block leading-tight">Demo car at home</span>
        </div>
        <div className="rounded-xl bg-white/90 border border-border p-2">
          <span className="text-[clamp(12px,3.8cqw,13px)] font-bold text-ink block leading-tight">Book Service</span>
          <span className="text-[clamp(12px,3.5cqw,13px)] text-ink-mute block leading-tight">16 bays available</span>
        </div>
      </div>
    </div>
  );
}
