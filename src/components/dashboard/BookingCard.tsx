"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Booking } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, User, Car, Clock, Loader2 } from "lucide-react";
import { bookingRef } from "@/lib/booking-ref";
import { cancelBookingAction } from "@/server/actions/booking";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function BookingCard({ booking }: { booking: Booking }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [cancelling, setCancelling] = useState(false);

  const isTestDrive = booking.kind === "test_drive";
  const isCancelled = booking.status === "cancelled";
  // Fixed timeZone: server (UTC on Vercel) and browser (IST) must render identical text, or React hydration fails.
  const dateFormatted = new Date(booking.starts_at).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeFormatted = new Date(booking.starts_at).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handleCancel = async () => {
    const ok = await confirm({
      title: "Cancel this booking?",
      description: "The slot will be released and this can't be undone.",
      confirmLabel: "Cancel booking",
      destructive: true,
    });
    if (!ok) return;
    setCancelling(true);
    try {
      const res = await cancelBookingAction(booking.id);
      if (res.ok) {
        toast.success("Booking cancelled successfully.");
        router.refresh();
      } else {
        toast.error(res.error.message || "Failed to cancel booking.");
      }
    } catch {
      toast.error("Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Badge variant="accent" className="capitalize text-xs">
            {isTestDrive ? "Test Drive" : "Workshop Service"}
          </Badge>
          <span className="text-xs font-mono text-ink-mute font-medium">{bookingRef(booking.id)}</span>
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

      {!isCancelled && (
        <div className="pt-2 border-t border-border flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs text-danger hover:bg-danger/10"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

