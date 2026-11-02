"use client";

import React from "react";
import { FilterValues } from "./FilterBar";
import { BODY_TYPES, FUEL_TYPES, CITIES } from "@/lib/constants";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal, RotateCcw } from "lucide-react";

export interface FilterSheetProps {
  filters: FilterValues;
  onChange: (key: keyof FilterValues, value: any) => void;
  onReset: () => void;
  resultsCount: number;
}

export function FilterSheet({ filters, onChange, onReset, resultsCount }: FilterSheetProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2 text-xs h-10 px-4 md:hidden">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="p-6">
        <SheetHeader className="text-left pb-4 border-b border-border">
          <SheetTitle className="text-lg font-bold">Filter Vehicles</SheetTitle>
          <p className="text-xs text-ink-soft">Narrow down showroom lineup</p>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-xs font-semibold uppercase text-ink-soft mb-1.5 block">
              City / RTO Region
            </label>
            <Select value={filters.city} onValueChange={(val) => onChange("city", val)}>
              <SelectTrigger>
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-ink-soft mb-1.5 block">
              Body Style
            </label>
            <Select value={filters.bodyType} onValueChange={(val) => onChange("bodyType", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Body Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Body Styles</SelectItem>
                {BODY_TYPES.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-ink-soft mb-1.5 block">
              Fuel Type
            </label>
            <Select value={filters.fuel} onValueChange={(val) => onChange("fuel", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Fuel Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fuels</SelectItem>
                {FUEL_TYPES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-ink-soft mb-1.5 block">
              Maximum Budget
            </label>
            <Select
              value={filters.maxBudget ? filters.maxBudget.toString() : "all"}
              onValueChange={(val) => onChange("maxBudget", val === "all" ? null : parseInt(val, 10))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Max Budget" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Budget</SelectItem>
                <SelectItem value="800000">Under ₹8 Lakh</SelectItem>
                <SelectItem value="1200000">Under ₹12 Lakh</SelectItem>
                <SelectItem value="1500000">Under ₹15 Lakh</SelectItem>
                <SelectItem value="2000000">Under ₹20 Lakh</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onReset} className="w-1/3 gap-1">
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => setOpen(false)} className="w-2/3">
            Show {resultsCount} Vehicles
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
