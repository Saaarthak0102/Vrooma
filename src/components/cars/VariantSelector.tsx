"use client";

import React from "react";
import { Variant } from "@/types/domain";
import { formatINR } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export interface VariantSelectorProps {
  variants: Variant[];
  selectedVariantId: string;
  onSelect: (variant: Variant) => void;
}

export function VariantSelector({
  variants,
  selectedVariantId,
  onSelect,
}: VariantSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">
        Select Variant ({variants.length} available)
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {variants.map((v) => {
          const isSelected = v.id === selectedVariantId;
          return (
            <div
              key={v.id}
              onClick={() => onSelect(v)}
              className={`cursor-pointer rounded-lg border p-3.5 transition-all flex items-start justify-between ${
                isSelected
                  ? "border-accent bg-accent-soft/40 shadow-sm ring-1 ring-accent"
                  : "border-border bg-white hover:border-ink/20"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-ink">{v.name}</h4>
                  {isSelected && <Check className="h-4 w-4 text-accent-ink" />}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-[10px] py-0 px-1 capitalize">
                    {v.fuel}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] py-0 px-1 capitalize">
                    {v.transmission}
                  </Badge>
                </div>
                <div className="mt-2 text-sm font-extrabold text-ink">
                  {formatINR(v.ex_showroom)}
                  <span className="text-[11px] font-normal text-ink-mute ml-1">ex-showroom</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
