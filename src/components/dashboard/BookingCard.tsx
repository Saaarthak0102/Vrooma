"use client";

import React from "react";
import { Booking } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, User, Car, Clock } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

export function BookingCard({ booking }: { booking: Booking }) {
  const isTestDrive = booking.kind === "test_drive";
  const dateFormatted = new Date(booking.starts_at).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeFormatted = new Date(booking.starts_at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Badge variant="accent" className="capitalize text-xs">
            {isTestDrive ? "Test Drive" : "Workshop Service"}
          </Badge>
          <span className="text-xs font-mono text-ink-mute">#{booking.id.slice(-6)}</span>
        </div>
        <Badge variant={booking.status === "confirmed" ? "ok" : "secondary"} className="text-[10px]">
          {booking.status.toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2 text-ink font-bold text-sm">
          <Car className="h-4 w-4 text-ink-mute" />
          <span>{booking.vehicle_info.model_name} {booking.vehicle_info.variant_name || ""}</span>
        </div>

        <div className="flex items-center gap-2 text-ink-soft">
          <Clock className="h-3.5 w-3.5 text-accent-ink" />
          <span>{dateFormatted} at {timeFormatted}</span>
        </div>

        <div className="flex items-center gap-2 text-ink-soft">
          <MapPin className="h-3.5 w-3.5 text-accent-ink" />
          <span>{booking.showroom_or_workshop_name}</span>
        </div>

        {booking.consultant_name && (
          <div className="flex items-center gap-2 text-ink-soft">
            <User className="h-3.5 w-3.5 text-accent-ink" />
            <span>Assigned: {booking.consultant_name}</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-border flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="w-1/2 text-xs"
          onClick={notWired("Reschedule Booking", 4)}
        >
          Reschedule
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-1/2 text-xs text-danger hover:bg-danger/10"
          onClick={notWired("Cancel Booking", 4)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

