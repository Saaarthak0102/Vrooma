"use client";

import React from "react";
import { CITIES } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";

export interface CitySelectProps {
  value: string; // city slug
  onChange: (citySlug: string) => void;
  className?: string;
}

export function CitySelect({ value, onChange, className }: CitySelectProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <MapPin className="h-4 w-4 text-accent-ink shrink-0" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 min-w-[130px] text-xs bg-white font-medium">
          <SelectValue placeholder="Select City" />
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
  );
}
