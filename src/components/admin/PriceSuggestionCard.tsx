"use client";

import { setUsedCarFinalPriceAction } from "@/server/actions/admin-catalog";
import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import { calculateUsedCarPriceBand } from "@/server/services/price-suggestion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, ShieldAlert, Check } from "lucide-react";

export interface PriceSuggestionCardProps {
  car: {
    id: string;
    stock_id: string;
    model_name: string;
    year: number;
    km: number;
    price: number;
  };
  onPriceUpdate?: (finalPrice: number) => void;
  className?: string;
}

export function PriceSuggestionCard({
  car,
  onPriceUpdate,
  className,
}: PriceSuggestionCardProps) {
  const suggestion = calculateUsedCarPriceBand(car);
  const [finalPrice, setFinalPrice] = useState(car.price.toString());
  const [saved, setSaved] = useState(false);

  const handleSaveFinalPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(finalPrice, 10);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Invalid price amount");
      return;
    }
    const res = await setUsedCarFinalPriceAction(car.id, parsed);
    if (!res.ok) {
      toast.error(res.error.message || "Could not save the final price.");
      return;
    }
    setSaved(true);
    toast.success(`Manager final listing price saved at ${formatINR(parsed)}`);
    onPriceUpdate?.(parsed);
  };

  return (
    <div className={`rounded-xl border border-border bg-white p-6 shadow-card space-y-4 ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center text-accent-ink">
            <Sparkles className="h-4 w-4" />
          </span>
          <h4 className="text-sm font-bold text-ink">
            Manager AI Valuation Recommendation ({car.stock_id})
          </h4>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded-pill">
          <ShieldAlert className="h-3 w-3" />
          Used-Car Manager Eyes Only
        </span>
      </div>

      <div className="bg-ink/[0.02] border border-border p-4 rounded-lg space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-mute block">
          Suggested Price Band (Historical Benchmark)
        </span>
        <div className="text-2xl font-black text-ink">
          {formatINR(suggestion.low)} – {formatINR(suggestion.high)}
        </div>
        <p className="text-xs text-ink-soft italic leading-relaxed">
          &ldquo;{suggestion.rationale}&rdquo;
        </p>
      </div>

      {/* Final Price Form by Manager */}
      <form onSubmit={handleSaveFinalPrice} className="space-y-3 pt-2">
        <label className="text-xs font-bold uppercase tracking-wider text-ink block">
          Manager Final Authorised Price (INR)
        </label>
        <div className="flex gap-2">
          <Input
            type="number"
            value={finalPrice}
            onChange={(e) => {
              setFinalPrice(e.target.value);
              setSaved(false);
            }}
            className="h-10 text-sm font-bold font-mono"
            required
          />
          <Button type="submit" size="sm" className="h-10 px-4 text-xs shrink-0 gap-1.5">
            {saved ? <Check className="h-4 w-4" /> : null}
            <span>{saved ? "Saved" : "Set Final Price"}</span>
          </Button>
        </div>
        <p className="text-[11px] text-ink-mute">
          Rule: AI suggests; the Used-Car Manager sets the final price visible to customers.
        </p>
      </form>
    </div>
  );
}

