import React from "react";
import { Wrench, Clock, MapPin, Check } from "lucide-react";

export interface PhoneScreenServiceProps {
  workshopName?: string;
  baysAvailable?: number;
}

export function PhoneScreenService({
  workshopName = "Central Workshop Transport Nagar",
  baysAvailable = 16,
}: PhoneScreenServiceProps) {
  return (
    <div className="flex flex-col h-full text-ink text-left space-y-2 pt-1">
      <div>
        <span className="text-[clamp(12px,3.8cqw,13px)] font-semibold text-accent-ink uppercase tracking-wider block">
          Authorized Workshop Service
        </span>
        <h4 className="text-[clamp(13px,4.5cqw,16px)] font-extrabold text-ink leading-tight">60-Second Booking</h4>
        <div className="flex items-center gap-1.5 text-[clamp(12px,3.5cqw,13px)] text-ink-mute mt-0.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{workshopName}</span>
        </div>
      </div>

      <div className="rounded-xl bg-white p-2.5 border border-border shadow-sm space-y-2 flex-1">
        <div className="flex items-center justify-between text-[clamp(12px,3.6cqw,13px)]">
          <span className="text-ink-soft">Workshop Bay Capacity</span>
          <span className="font-bold text-accent-ink">{baysAvailable} Bays Active</span>
        </div>

        <div className="space-y-1 pt-0.5">
          <span className="text-[clamp(12px,3.4cqw,12.5px)] font-bold text-ink-mute uppercase block">Selected Service</span>
          <div className="rounded-lg bg-ink/[0.03] p-2 border border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-accent-ink shrink-0" />
              <div>
                <span className="text-[clamp(12px,3.8cqw,13.5px)] font-bold text-ink block leading-tight">Periodic Maintenance</span>
                <span className="text-[clamp(12px,3.4cqw,12.5px)] text-ink-mute leading-tight block">Oil, filters & 30-pt check</span>
              </div>
            </div>
            <Check className="h-3.5 w-3.5 text-accent-ink shrink-0" />
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[clamp(12px,3.4cqw,12.5px)] font-bold text-ink-mute uppercase block">Preferred Slot</span>
          <div className="rounded-lg bg-dark text-white p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-accent shrink-0" />
              <span className="text-[clamp(12px,3.8cqw,13.5px)] font-bold">Tomorrow, 10:30 AM</span>
            </div>
            <span className="text-[clamp(12px,3.4cqw,12.5px)] font-semibold text-accent">Bay 04 Free</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-ink/5 p-2 text-center text-[clamp(12px,3.6cqw,13px)] font-semibold text-ink-soft">
        Pick-up & drop available across Lucknow
      </div>
    </div>
  );
}
