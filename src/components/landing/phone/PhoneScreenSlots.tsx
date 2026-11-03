import React from "react";
import { Check, Calendar, MapPin } from "lucide-react";

export interface PhoneScreenSlotsProps {
  showroomId?: string;
  showroomName?: string;
  carName?: string;
}

export function PhoneScreenSlots({
  showroomName = "Hazratganj Flagship",
  carName = "Model H ZX Automatic (Petrol)",
}: PhoneScreenSlotsProps) {
  const slots = [
    { time: "10:00 AM - 11:00 AM", status: "booked" },
    { time: "11:30 AM - 12:30 PM", status: "available" },
    { time: "02:00 PM - 03:00 PM", status: "selected" },
    { time: "04:00 PM - 05:00 PM", status: "available" },
  ];

  return (
    <div className="flex flex-col h-full text-ink text-left space-y-2 pt-1">
      <div>
        <span className="text-[clamp(12px,3.8cqw,13px)] font-semibold text-accent-ink uppercase tracking-wider block">
          Instant Slot Reservation
        </span>
        <h4 className="text-[clamp(13px,4.5cqw,16px)] font-extrabold text-ink leading-tight">{carName}</h4>
        <div className="flex items-center gap-1.5 text-[clamp(12px,3.5cqw,13px)] text-ink-mute mt-0.5">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{showroomName}</span>
        </div>
      </div>

      <div className="space-y-1.5 flex-1">
        <span className="text-[clamp(12px,3.6cqw,13px)] font-bold text-ink-soft uppercase tracking-wider block">
          Available Today
        </span>
        {slots.map((s, i) => (
          <div
            key={i}
            className={`rounded-xl p-2 sm:p-2.5 border text-[clamp(12px,3.8cqw,13.5px)] flex items-center justify-between transition-colors ${
              s.status === "selected"
                ? "bg-dark text-white border-dark shadow-sm"
                : s.status === "booked"
                ? "bg-ink/[0.03] text-ink-mute border-border/50 line-through opacity-60"
                : "bg-white text-ink border-border hover:border-accent"
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 opacity-70 shrink-0" />
              <span className="font-semibold text-[clamp(12px,3.8cqw,13.5px)]">{s.time}</span>
            </div>
            {s.status === "selected" && (
              <span className="h-4 w-4 rounded-full bg-accent text-dark flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>
            )}
            {s.status === "available" && (
              <span className="text-[clamp(12px,3.5cqw,13px)] font-bold text-accent-ink">Free</span>
            )}
            {s.status === "booked" && (
              <span className="text-[clamp(12px,3.4cqw,12.5px)] font-medium text-ink-mute">Reserved</span>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-accent-soft p-2 text-center text-[clamp(12px,3.6cqw,13px)] font-bold text-accent-ink">
        Locked for 10 minutes · No phone tag
      </div>
    </div>
  );
}
