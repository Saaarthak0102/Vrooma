"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface SortSelectProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export function SortSelect({ value, onChange, className }: SortSelectProps) {
  return (
    <div className={`w-44 ${className}`}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 bg-white text-xs">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="price_asc" className="text-xs">
            Price: Low to High
          </SelectItem>
          <SelectItem value="price_desc" className="text-xs">
            Price: High to Low
          </SelectItem>
          <SelectItem value="newest" className="text-xs">
            Newest Arrivals
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

