"use client";

import React, { useState } from "react";
import { Booking } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookingDetailsDialog } from "./BookingDetailsDialog";
import { useLocale, useTranslations } from "next-intl";
import { bookingRef } from "@/lib/booking-ref";
import { formatAppointmentDate } from "@/lib/date";
import { MapPin, User, Calendar, Plus, Car, Wrench } from "lucide-react";
import { cancelBookingAction } from "@/server/actions/booking";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface NextAppointmentCardProps {
  bookings?: Booking[];
  upcomingBookings?: Booking[];
  booking?: Booking | null;
  totalBookingsCount: number;
  onViewAll: (triggerElement: HTMLElement) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface AppointmentSubCardProps {
  booking: Booking;
  locale: string;
  t: any;
  onViewBooking: (b: Booking) => void;
}

function AppointmentSubCard({
  booking,
  locale,
  t,
  onViewBooking,
}: AppointmentSubCardProps) {
  const dateDetails = formatAppointmentDate(booking.starts_at, locale);
  const isTestDrive = booking.kind === "test_drive";
  const title = isTestDrive
    ? `${booking.vehicle_info.model_name} ${booking.vehicle_info.variant_name || ""}`.trim()
    : `${booking.vehicle_info.model_name} (${booking.vehicle_info.variant_name || "Service"})`;
  const location = booking.showroom_or_workshop_name;
  const advisor = booking.consultant_name;

  return (
    <div
      style={{
        backgroundColor: "color-mix(in srgb, var(--ink) 2%, white)",
        containerType: "inline-size",
      }}
      className="appt-subcard rounded-xl border border-border p-3 sm:p-3.5 flex flex-col justify-between transition-colors hover:border-black/20 overflow-hidden"
    >
      {/* 1. Meta Line (Type chip, reference, status dot) */}
      <div className="appt-meta-line flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-soft text-accent-ink border border-accent/20 truncate">
            {isTestDrive ? t("testDrive") : t("service")}
          </span>
          <span className="text-[11px] font-mono font-medium text-ink-soft shrink-0">
            {bookingRef(booking.id)}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          {t("confirmed")}
        </span>
      </div>

      {/* 2. Main Line (Date numeral + Model title + relative time) */}
      <div className="appt-main-line flex items-center gap-3 py-0.5 shrink-0 min-w-0">
        <span className="appt-numeral font-black text-ink leading-none tabular-nums tracking-tighter shrink-0">
          {dateDetails.dayNumeral}
        </span>
        <div
          className="flex flex-col justify-center min-w-0 leading-tight"
          title={`${title} · ${location}${advisor ? ` · ${advisor}` : ""}`}
        >
          <span className="appt-title font-bold text-ink truncate text-sm sm:text-base">
            {title}
          </span>
          <span className="appt-subtitle text-xs text-ink-soft truncate mt-0.5">
            {dateDetails.weekday}, {dateDetails.month} · {dateDetails.time} ·{" "}
            <span className="font-semibold text-accent-ink">{dateDetails.relativeLabel}</span>
          </span>
        </div>
      </div>

      {/* 3. Location & Advisor Line */}
      <div className="appt-location-line pt-1.5 border-t border-border flex items-center justify-between gap-2 text-xs text-ink-soft shrink-0">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <MapPin className="h-3.5 w-3.5 text-accent-ink shrink-0" />
          <span className="truncate">{location}</span>
        </div>
        {advisor && (
          <div className="flex items-center gap-1.5 shrink-0">
            <User className="h-3.5 w-3.5 text-accent-ink shrink-0" />
            <span className="truncate">{advisor}</span>
          </div>
        )}
      </div>

      {/* 4. Action Buttons: "View Booking" opens detailed card; "Cancel" remains */}
      <div className="appt-actions-line pt-2 flex gap-2 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 text-xs h-8"
          onClick={() => onViewBooking(booking)}
        >
          {t("viewBooking")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-8 text-danger hover:bg-danger/10"
          onClick={async () => {
            if (!confirm("Are you sure you want to cancel this booking?")) return;
            try {
              const res = await cancelBookingAction(booking.id);
              if (res.ok) {
                toast.success("Booking cancelled.");
                window.location.reload();
              } else {
                toast.error(res.error.message || "Failed to cancel.");
              }
            } catch {
              toast.error("Failed to cancel.");
            }
          }}
        >
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}

export function NextAppointmentCard({
  bookings,
  upcomingBookings,
  booking,
  totalBookingsCount,
  onViewAll,
  className,
  style,
}: NextAppointmentCardProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard");

  // State to track which booking is currently opened in the detailed view dialog
  const [detailedBooking, setDetailedBooking] = useState<Booking | null>(null);

  // Determine top 2 confirmed upcoming bookings sorted soonest first
  const now = new Date().getTime();
  const candidateList = bookings || (booking ? [booking] : []);
  const confirmedUpcoming = candidateList
    .filter((b) => b.status === "confirmed" && new Date(b.starts_at).getTime() >= now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const displayList = upcomingBookings || confirmedUpcoming.slice(0, 2);

  return (
    <>
      <article
        data-bento-origin="appointment"
        style={style}
        className={cn(
          "bento-block bento-appointment rounded-[16px] border border-border bg-white p-4 sm:p-5 flex flex-col justify-between shadow-sm transition-colors hover:border-black/20 overflow-hidden",
          className
        )}
      >
        {/* Row 1: Header */}
        <div className="appt-card-header flex items-center justify-between shrink-0 pb-2 border-b border-border">
          <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-mute">
            {t("upcomingAppointments")}
          </span>
          <Button
            variant="link"
            size="sm"
            onClick={(e) => onViewAll(e.currentTarget)}
            className="h-auto p-0 text-xs font-semibold text-accent-ink hover:underline"
          >
            {t("viewAllCount", { count: totalBookingsCount })}
          </Button>
        </div>

        {/* Row 2 & 3: Sub-card slots */}
        {displayList.length === 0 ? (
          <div className="appt-empty-both flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-border rounded-xl space-y-2 min-h-0">
            <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-ink-mute">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-ink">{t("noUpcomingBookings")}</p>
              <p className="text-xs text-ink-soft">{t("noUpcomingHint")}</p>
            </div>
          </div>
        ) : displayList.length === 1 ? (
          <>
            <AppointmentSubCard
              booking={displayList[0]}
              locale={locale}
              t={t}
              onViewBooking={setDetailedBooking}
            />
            <div className="appt-empty-second flex-1 flex items-center justify-center text-center p-3 border border-dashed border-border rounded-xl min-h-0">
              <span className="text-xs text-ink-mute font-medium">{t("noOtherUpcoming")}</span>
            </div>
          </>
        ) : (
          <>
            <AppointmentSubCard
              booking={displayList[0]}
              locale={locale}
              t={t}
              onViewBooking={setDetailedBooking}
            />
            <AppointmentSubCard
              booking={displayList[1]}
              locale={locale}
              t={t}
              onViewBooking={setDetailedBooking}
            />
          </>
        )}

        {/* Row 4: Add New Booking Button with Upward Dropdown */}
        <div className="appt-card-footer shrink-0 pt-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="md"
                className="w-full h-11 text-xs font-semibold gap-2 border border-border shadow-sm hover:border-black/20"
              >
                <Plus className="h-4 w-4 text-ink-soft" />
                <span>{t("addNewBooking")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="center"
              sideOffset={8}
              className="w-56 p-1.5 shadow-xl origin-dropdown"
            >
              <DropdownMenuItem asChild className="h-11 px-3 cursor-pointer rounded-lg flex items-center gap-2.5 text-xs font-semibold hover:bg-ink/5">
                <Link href="/book/test-drive" className="flex items-center gap-2.5 w-full">
                  <Car className="h-4 w-4 text-accent" />
                  <span>{t("testDrive")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="h-11 px-3 cursor-pointer rounded-lg flex items-center gap-2.5 text-xs font-semibold hover:bg-ink/5">
                <Link href="/book/service" className="flex items-center gap-2.5 w-full">
                  <Wrench className="h-4 w-4 text-accent" />
                  <span>{t("service")}</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </article>

      {/* Modal Dialog with complete booking dossier details */}
      <BookingDetailsDialog
        booking={detailedBooking}
        open={!!detailedBooking}
        onOpenChange={(open) => !open && setDetailedBooking(null)}
      />
    </>
  );
}
