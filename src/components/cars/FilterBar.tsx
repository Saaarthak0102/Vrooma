"use client";

import React from "react";
import { BODY_TYPES, FUEL_TYPES, CITIES } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export interface FilterValues {
  bodyType: string;
  fuel: string;
  city: string;
  maxBudget: number | null;
}

export interface FilterBarProps {
  filters: FilterValues;
  onChange: (key: keyof FilterValues, value: any) => void;
  onReset: () => void;
  className?: string;
}

export function FilterBar({ filters, onChange, onReset, className }: FilterBarProps) {
  const hasActiveFilters =
    filters.bodyType !== "all" ||
    filters.fuel !== "all" ||
    filters.maxBudget !== null;

  return (
    <div className={`flex flex-wrap items-center gap-3 p-3 rounded-lg bg-white/70 border border-border ${className}`}>
      {/* City */}
      <div className="w-36">
        <Select value={filters.city} onValueChange={(val) => onChange("city", val)}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            {CITIES.map((c) => (
              <SelectItem key={c.slug} value={c.slug} className="text-xs">
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Body Type */}
      <div className="w-36">
        <Select value={filters.bodyType} onValueChange={(val) => onChange("bodyType", val)}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Body Style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All Body Styles
            </SelectItem>
            {BODY_TYPES.map((b) => (
              <SelectItem key={b.value} value={b.value} className="text-xs">
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Fuel Type */}
      <div className="w-36">
        <Select value={filters.fuel} onValueChange={(val) => onChange("fuel", val)}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Fuel Type" />
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

      {/* Budget */}
      <div className="w-40">
        <Select
          value={filters.maxBudget ? filters.maxBudget.toString() : "all"}
          onValueChange={(val) => onChange("maxBudget", val === "all" ? null : parseInt(val, 10))}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Max Budget" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              Any Budget
            </SelectItem>
            <SelectItem value="800000" className="text-xs">
              Under ₹8 Lakh
            </SelectItem>
            <SelectItem value="1200000" className="text-xs">
              Under ₹12 Lakh
            </SelectItem>
            <SelectItem value="1500000" className="text-xs">
              Under ₹15 Lakh
            </SelectItem>
            <SelectItem value="2000000" className="text-xs">
              Under ₹20 Lakh
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
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
