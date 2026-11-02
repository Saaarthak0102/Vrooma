import React from "react";
import { Showroom } from "@/types/domain";
import { MapPin, Phone, Check } from "lucide-react";

export interface ShowroomPickerProps {
  showrooms: Showroom[];
  selectedId: string;
  onSelect: (showroom: Showroom) => void;
  className?: string;
}

export function ShowroomPicker({
  showrooms,
  selectedId,
  onSelect,
  className,
}: ShowroomPickerProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block">
        Select Showroom Location
      </label>
      <div className="grid grid-cols-1 gap-3">
        {showrooms.map((s) => {
          const isSelected = s.id === selectedId;
          return (
            <div
              key={s.id}
              onClick={() => onSelect(s)}
              className={`cursor-pointer rounded-lg border p-4 transition-all flex items-start justify-between ${
                isSelected
                  ? "border-accent bg-accent-soft/40 shadow-sm ring-1 ring-accent"
                  : "border-border bg-white hover:border-ink/20"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-ink">{s.name}</h4>
                  {isSelected && <Check className="h-4 w-4 text-accent-ink" />}
                </div>
                <p className="text-xs text-ink-soft flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-accent-ink shrink-0" />
                  {s.address}
                </p>
                <p className="text-xs text-ink-mute flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {s.phone}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
