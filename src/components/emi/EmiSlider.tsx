"use client";

import React from "react";
import { Slider } from "@/components/ui/slider";

export interface EmiSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  formatValue: (v: number) => string;
  onChange: (v: number) => void;
  className?: string;
}

export function EmiSlider({
  label,
  value,
  min,
  max,
  step = 1,
  formatValue,
  onChange,
  className,
}: EmiSliderProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink-soft uppercase tracking-wider">
          {label}
        </span>
        <span className="font-extrabold text-sm text-ink">{formatValue(value)}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(val) => onChange(val[0])}
      />
      <div className="flex items-center justify-between text-[10px] text-ink-mute">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}

