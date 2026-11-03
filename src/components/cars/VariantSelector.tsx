"use client";

import React from "react";
import { Variant } from "@/types/domain";
import { formatINR } from "@/lib/money";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">
          Select Variant ({variants.length} available)
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {variants.map((v) => {
          const isSelected = v.id === selectedVariantId;
          return (
            <div
              key={v.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(v)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(v);
                }
              }}
              className={cn(
                "cursor-pointer rounded-xl border p-3.5 transition-all duration-200 flex flex-col justify-between text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                isSelected
                  ? "border-emerald-600 bg-emerald-50/30 shadow-sm ring-1 ring-emerald-600/30"
                  : "border-border/80 bg-white hover:border-ink/20 hover:shadow-xs"
              )}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-ink leading-tight">{v.name}</h4>
                  {isSelected && (
                    <div className="h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-100 text-ink-soft capitalize">
                    {v.fuel}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-100 text-ink-soft capitalize">
                    {v.transmission}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-border/40 text-sm font-black text-ink">
                {formatINR(v.ex_showroom)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

