"use client";

import React from "react";
import { FUEL_TYPES } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export interface UsedFilterValues {
  modelId: string;
  fuel: string;
  minYear: number | null;
  maxKm: number | null;
  maxPrice: number | null;
}

export interface UsedFiltersProps {
  filters: UsedFilterValues;
  onChange: (key: keyof UsedFilterValues, val: any) => void;
  onReset: () => void;
  className?: string;
}

export function UsedFilters({ filters, onChange, onReset, className }: UsedFiltersProps) {
  const hasActive =
    filters.modelId !== "all" ||
    filters.fuel !== "all" ||
    filters.minYear !== null ||
    filters.maxKm !== null ||
    filters.maxPrice !== null;

  return (
    <div className={`flex flex-wrap items-center gap-3 p-3 rounded-lg bg-white/70 border border-border ${className}`}>
      {/* Model */}
      <div className="w-36">
        <Select value={filters.modelId} onValueChange={(val) => onChange("modelId", val)}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All Models
            </SelectItem>
            <SelectItem value="model-h" className="text-xs">
              Model H
            </SelectItem>
            <SelectItem value="model-c" className="text-xs">
              Model C
            </SelectItem>
            <SelectItem value="model-s" className="text-xs">
              Model S
            </SelectItem>
            <SelectItem value="model-x" className="text-xs">
              Model X
            </SelectItem>
            <SelectItem value="model-t" className="text-xs">
              Model T
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Fuel */}
      <div className="w-36">
        <Select value={filters.fuel} onValueChange={(val) => onChange("fuel", val)}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Fuel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All Fuels
            </SelectItem>
            {FUEL_TYPES.map((f) => (
              <SelectItem key={f.value} value={f.value} className="text-xs">
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Max Km */}
      <div className="w-36">
        <Select
          value={filters.maxKm ? filters.maxKm.toString() : "all"}
          onValueChange={(val) => onChange("maxKm", val === "all" ? null : parseInt(val, 10))}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Max Km" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              Any Kilometers
            </SelectItem>
            <SelectItem value="30000" className="text-xs">
              &lt; 30,000 km
            </SelectItem>
            <SelectItem value="50000" className="text-xs">
              &lt; 50,000 km
            </SelectItem>
            <SelectItem value="80000" className="text-xs">
              &lt; 80,000 km
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Max Budget */}
      <div className="w-36">
        <Select
          value={filters.maxPrice ? filters.maxPrice.toString() : "all"}
          onValueChange={(val) => onChange("maxPrice", val === "all" ? null : parseInt(val, 10))}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Budget" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              Any Price
            </SelectItem>
            <SelectItem value="600000" className="text-xs">
              Under ₹6 Lakh
            </SelectItem>
            <SelectItem value="900000" className="text-xs">
              Under ₹9 Lakh
            </SelectItem>
            <SelectItem value="1200000" className="text-xs">
              Under ₹12 Lakh
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-9 px-3 text-xs gap-1 text-ink-soft hover:text-ink ml-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </Button>
      )}
    </div>
  );
}

