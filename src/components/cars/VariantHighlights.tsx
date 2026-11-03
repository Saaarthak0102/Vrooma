"use client";

import React, { useMemo } from "react";
import { Variant, Model } from "@/types/domain";
import { cn } from "@/lib/utils";

export interface VariantHighlightsProps {
  variant: Variant;
  model: Model;
  className?: string;
}

/**
 * Generates 2-3 concise, practical selling points for a selected variant
 * grounded in actual variant data (transmission, fuel, trim price, body type).
 */
export function getVariantHighlights(variant: Variant, model: Model): string[] {
  const highlights: string[] = [];
  const allVariants = model.variants || [];

  const isLowestPrice =
    allVariants.length > 1 &&
    allVariants.every((v) => v.id === variant.id || variant.ex_showroom <= v.ex_showroom);

  const isHighestPrice =
    allVariants.length > 1 &&
    allVariants.every((v) => v.id === variant.id || variant.ex_showroom >= v.ex_showroom);

  // 1. Practical city/usage consideration based on body type & trim
  if (model.body_type === "hatchback") {
    highlights.push("Everyday city commuting");
  } else if (model.body_type === "suv") {
    highlights.push("Commanding road presence & high clearance");
  } else if (model.body_type === "sedan") {
    highlights.push("Spacious passenger comfort & executive travel");
  } else {
    highlights.push("Everyday practical commuting");
  }

  // 2. Budget or Fuel efficiency consideration
  if (isLowestPrice) {
    highlights.push("Budget-conscious buyers");
  } else if (variant.fuel === "cng") {
    highlights.push("Ultra-low running costs with CNG");
  } else if (variant.fuel === "ev") {
    highlights.push("Zero-emission electric daily driving");
  } else if (variant.fuel === "diesel") {
    highlights.push("High-torque efficiency for long distances");
  } else if (variant.fuel === "hybrid") {
    highlights.push("Exceptional self-charging fuel economy");
  } else if (isHighestPrice && variant.features && variant.features.length > 0) {
    highlights.push("Feature-rich cabin & premium tech");
  } else {
    highlights.push("Refined & responsive performance");
  }

  // 3. Transmission driving preference
  if (variant.transmission === "automatic") {
    if (variant.fuel === "cng") {
      highlights.push("Suitable for stop-and-go traffic");
    } else {
      highlights.push("Effortless automatic driving in traffic");
    }
  } else {
    highlights.push("Drivers who prefer manual control");
  }

  // Ensure exactly 2 or 3 concise points
  return highlights.slice(0, 3);
}

export function VariantHighlights({
  variant,
  model,
  className,
}: VariantHighlightsProps) {
  const highlights = useMemo(
    () => getVariantHighlights(variant, model),
    [variant, model]
  );

  if (highlights.length === 0) return null;

  return (
    <div className={cn("pt-3 border-t border-border/60 space-y-2 text-left", className)}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-mute block">
        Best For
      </span>
      <ul className="space-y-1.5 text-xs">
        {highlights.map((point, index) => (
          <li key={index} className="flex items-start gap-2 text-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
            <span className="font-medium text-ink-soft leading-normal">{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

