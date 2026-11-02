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
    <div className="flex flex-col h-full text-ink text-left space-y-2.5 pt-1">
      <div>
        <span className="text-[10px] font-semibold text-accent-ink uppercase tracking-wider">
          Authorized Workshop Service
        </span>
        <h4 className="text-xs font-extrabold text-ink leading-tight">60-Second Booking</h4>
        <div className="flex items-center gap-1 text-[9px] text-ink-mute mt-0.5">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{workshopName}</span>
        </div>
      </div>

      <div className="rounded-xl bg-white p-2.5 border border-border shadow-sm space-y-2 flex-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-ink-soft">Workshop Bay Capacity</span>
          <span className="font-bold text-accent-ink">{baysAvailable} Bays Active</span>
        </div>

        <div className="space-y-1 pt-1">
          <span className="text-[9px] font-bold text-ink-mute uppercase">Selected Service</span>
          <div className="rounded-lg bg-ink/[0.03] p-2 border border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-accent-ink" />
              <div>
                <span className="text-[10.5px] font-bold text-ink block">Periodic Maintenance</span>
                <span className="text-[8.5px] text-ink-mute">Engine oil, filters & 30-point check</span>
              </div>
            </div>
            <Check className="h-3.5 w-3.5 text-accent-ink" />
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] font-bold text-ink-mute uppercase">Preferred Slot</span>
          <div className="rounded-lg bg-dark text-white p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-accent" />
              <span className="text-[11px] font-bold">Tomorrow, 10:30 AM</span>
            </div>
            <span className="text-[9px] font-semibold text-accent">Bay 04 Free</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-ink/5 p-2 text-center text-[10px] font-semibold text-ink-soft">
        Pick-up & drop available across Lucknow
      </div>
    </div>
  );
}
