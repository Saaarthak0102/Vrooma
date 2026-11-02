"use client";

import React, { useState } from "react";
import { VariantColor } from "@/types/domain";
import { Check } from "lucide-react";

export interface ColorSwatchesProps {
  colors?: VariantColor[];
  onColorChange?: (color: VariantColor) => void;
}

export function ColorSwatches({ colors = [], onColorChange }: ColorSwatchesProps) {
  const [selectedId, setSelectedId] = useState(colors[0]?.id || "");

  if (colors.length === 0) return null;

  const activeColor = colors.find((c) => c.id === selectedId) || colors[0];

  const handleSelect = (color: VariantColor) => {
    setSelectedId(color.id);
    onColorChange?.(color);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold uppercase tracking-wider text-ink-soft">
          Exterior Shade
        </span>
        <span className="font-semibold text-ink">{activeColor.name}</span>
      </div>
      <div className="flex items-center gap-3">
        {colors.map((c) => {
          const isSelected = c.id === activeColor.id;
          return (
            <button
              key={c.id}
              onClick={() => handleSelect(c)}
              className={`h-9 w-9 rounded-full border-2 transition-all flex items-center justify-center ${
                isSelected
                  ? "border-dark ring-2 ring-accent scale-105"
                  : "border-border hover:scale-105"
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.name}
              aria-label={`Select ${c.name} color`}
            >
              {isSelected && (
                <Check
                  className={`h-4 w-4 ${
                    c.hex === "#F8FAFC" || c.hex === "#FFFFFF"
                      ? "text-black"
                      : "text-white"
                  }`}
                />
              )}
            </button>
          ))}
        </div>
    </div>
  );
}
