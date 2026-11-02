import React from "react";
import { Link } from "@/i18n/navigation";
import { Booking } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, MapPin, User, MessageSquare, ArrowRight } from "lucide-react";

export interface BookingConfirmationProps {
  booking: Booking;
  customerName: string;
  customerPhone: string;
}

export function BookingConfirmation({
  booking,
  customerName,
  customerPhone,
}: BookingConfirmationProps) {
  const isTestDrive = booking.kind === "test_drive";
  const dateFormatted = new Date(booking.starts_at).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeFormatted = new Date(booking.starts_at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="max-w-xl mx-auto rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-xl space-y-6 text-center animate-in fade-in">
      {/* Top Success Badge */}
      <div className="h-16 w-16 rounded-full bg-accent/20 text-accent-ink flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
      </div>

      <div>
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-mute">
          Booking Reference #{booking.id.toUpperCase().slice(-8)}
        </span>
        <h2 className="text-2xl font-black text-ink mt-1">
          {isTestDrive ? "Test Drive Locked!" : "Workshop Slot Confirmed!"}
        </h2>
        <p className="text-xs text-ink-soft mt-1">
          We have reserved your dedicated demo slot at Vrooma Lucknow.
        </p>
      </div>

      {/* Appointment Summary Box */}
      <div className="rounded-xl bg-ink/[0.02] border border-border p-4 text-left space-y-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Calendar className="h-4 w-4 text-accent-ink shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-ink block">{dateFormatted} at {timeFormatted}</span>
            <span className="text-ink-mute">Scheduled Appointment Window</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <MapPin className="h-4 w-4 text-accent-ink shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-ink block">{booking.showroom_or_workshop_name}</span>
            <span className="text-ink-mute">Assigned Facility Location</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <User className="h-4 w-4 text-accent-ink shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-ink block">
              {booking.consultant_name || "Rohit Verma (Senior Product Specialist)"}
            </span>
            <span className="text-ink-mute">Assigned Relationship Manager</span>
          </div>
        </div>
      </div>

      {/* In-App Message Preview */}
      <div className="rounded-xl border border-dashed border-accent/40 bg-accent/5 p-4 text-left space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-accent-ink">
          <MessageSquare className="h-4 w-4" />
          <span>In-App WhatsApp Dispatch Preview</span>
        </div>
        <p className="text-xs text-ink leading-relaxed italic bg-white p-3 rounded-lg border border-border/80">
          &ldquo;Namaste {customerName}, your {booking.vehicle_info.model_name} demo drive is confirmed for {dateFormatted} at {timeFormatted} at {booking.showroom_or_workshop_name}. Your consultant {booking.consultant_name || "Rohit Verma"} will welcome you with the sanitized demo vehicle.&rdquo;
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button asChild variant="outline" className="w-full text-xs">
          <Link href="/dashboard/bookings">View in My Dashboard</Link>
        </Button>
        <Button asChild variant="primary" className="w-full text-xs gap-1">
          <Link href="/">
            <span>Return to Showroom</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
