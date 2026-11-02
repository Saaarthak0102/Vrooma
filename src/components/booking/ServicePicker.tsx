import React from "react";
import { Check, Wrench, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";

export interface ServiceOption {
  id: string;
  name: string;
  duration: string;
  description: string;
  icon: any;
}

export const SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: "periodic-maintenance",
    name: "Periodic Maintenance Service (PMS)",
    duration: "90 Mins",
    description: "Engine oil, filters, 40-point safety check, brake inspection, fluid top-ups.",
    icon: Wrench,
  },
  {
    id: "general-repair",
    name: "Mechanical / Running Repairs",
    duration: "2-4 Hours",
    description: "Brake overhaul, suspension noise diagnosis, clutch or electrical rectification.",
    icon: RefreshCw,
  },
  {
    id: "ac-service",
    name: "AC Cooling & Disinfection Service",
    duration: "60 Mins",
    description: "Refrigerant gas top-up, condenser flush, cabin pollen filter replacement.",
    icon: Sparkles,
  },
  {
    id: "accidental-insurance",
    name: "Bodywork & Cashless Insurance Claim",
    duration: "Same-Day Assessment",
    description: "Zero-depreciation cashless processing with paint booth baked refinishing.",
    icon: ShieldAlert,
  },
];

export interface ServicePickerProps {
  selectedId: string;
  onSelect: (service: ServiceOption) => void;
  className?: string;
}

export function ServicePicker({ selectedId, onSelect, className }: ServicePickerProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block">
        Select Workshop Service Type
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SERVICE_OPTIONS.map((opt) => {
          const isSelected = opt.id === selectedId;
          const Icon = opt.icon;
          return (
            <div
              key={opt.id}
              onClick={() => onSelect(opt)}
              className={`cursor-pointer rounded-lg border p-4 transition-all flex flex-col justify-between ${
                isSelected
                  ? "border-accent bg-accent-soft/40 shadow-sm ring-1 ring-accent"
                  : "border-border bg-white hover:border-ink/20"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-accent-ink" />
                    <h4 className="text-sm font-bold text-ink">{opt.name}</h4>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-accent-ink" />}
                </div>
                <p className="text-xs text-ink-soft leading-relaxed">{opt.description}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-border/60 text-[11px] font-semibold text-ink-mute">
                Estimated turnaround: {opt.duration}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
