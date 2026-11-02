import React from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, Gauge, User } from "lucide-react";

export interface OwnerKmYearBadgesProps {
  year: number;
  km: number;
  owners: number;
  className?: string;
}

export function OwnerKmYearBadges({
  year,
  km,
  owners,
  className,
}: OwnerKmYearBadgesProps) {
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      <Badge variant="secondary" className="gap-1 text-[11px] font-medium text-ink-soft bg-ink/5">
        <Calendar className="h-3 w-3 text-ink-mute" />
        <span>{year}</span>
      </Badge>
      <Badge variant="secondary" className="gap-1 text-[11px] font-medium text-ink-soft bg-ink/5">
        <Gauge className="h-3 w-3 text-ink-mute" />
        <span>{km.toLocaleString()} km</span>
      </Badge>
      <Badge variant="secondary" className="gap-1 text-[11px] font-medium text-ink-soft bg-ink/5">
        <User className="h-3 w-3 text-ink-mute" />
        <span>{owners} {owners === 1 ? "Owner" : "Owners"}</span>
      </Badge>
    </div>
  );
}

