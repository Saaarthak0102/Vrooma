import React from "react";
import { DemoCar } from "@/types/domain";
import { Car, Check } from "lucide-react";

export interface DemoCarPickerProps {
  demoCars: DemoCar[];
  selectedId: string;
  onSelect: (demoCar: DemoCar) => void;
  className?: string;
}

export function DemoCarPicker({
  demoCars,
  selectedId,
  onSelect,
  className,
}: DemoCarPickerProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block">
        Available Showroom Demo Fleet
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {demoCars.map((d) => {
          const isSelected = d.id === selectedId;
          return (
            <div
              key={d.id}
              onClick={() => onSelect(d)}
              className={`cursor-pointer rounded-lg border p-4 transition-all flex items-start justify-between ${
                isSelected
                  ? "border-accent bg-accent-soft/40 shadow-sm ring-1 ring-accent"
                  : "border-border bg-white hover:border-ink/20"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-ink-mute" />
                  <h4 className="text-sm font-bold text-ink">{d.variant_name}</h4>
                  {isSelected && <Check className="h-4 w-4 text-accent-ink" />}
                </div>
                <span className="inline-block font-mono text-[11px] bg-ink/5 px-2 py-0.5 rounded text-ink-soft">
                  {d.reg_label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

