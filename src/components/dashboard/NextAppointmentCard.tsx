"use client";

import React from "react";
import { Booking } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { bookingRef } from "@/lib/booking-ref";
import { formatAppointmentDate } from "@/lib/date";
import { MapPin, User, Calendar, Plus } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";
import { cn } from "@/lib/utils";

export interface NextAppointmentCardProps {
  booking: Booking | null;
  totalBookingsCount: number;
  onViewAll: (triggerElement: HTMLElement) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function NextAppointmentCard({
  booking,
  totalBookingsCount,
  onViewAll,
  className,
  style,
}: NextAppointmentCardProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard");

  const dateDetails = booking ? formatAppointmentDate(booking.starts_at, locale) : null;
  const isTestDrive = booking?.kind === "test_drive";

  return (
    <article
      data-bento-origin="appointment"
      style={style}
      className={cn(
        "bento-block bento-appointment rounded-[16px] border border-border bg-white p-4 sm:p-5 flex flex-col justify-between shadow-sm transition-colors hover:border-black/20 overflow-hidden",
        className
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between shrink-0 pb-2 border-b border-border">
        <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-mute">
          {t("nextAppointment")}
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

      {!booking ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-3">
          <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-ink-mute">
            <Calendar className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-ink-soft">{t("noUpcoming")}</p>
          <Button asChild variant="primary" size="sm" className="text-xs">
            <Link href="/book/test-drive">
              <Plus className="h-3.5 w-3.5 mr-1" />
              <span>{t("bookTestDriveBtn")}</span>
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between py-2 space-y-2.5">
          {/* Chip, Reference & Status row */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-soft text-accent-ink border border-accent/20 truncate">
                {isTestDrive ? t("testDrive") : t("service")}
              </span>
              <span className="text-xs font-mono font-medium text-ink-soft shrink-0">
                {bookingRef(booking.id)}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              {booking.status}
            </span>
          </div>

          {/* Big Date Block */}
          <div className="flex items-center gap-3.5 py-1 shrink-0">
            <span className="appt-date-numeral font-black text-ink leading-none tabular-nums tracking-tighter">
              {dateDetails?.dayNumeral}
            </span>
            <div className="flex flex-col justify-center min-w-0 leading-tight">
              <span className="text-sm sm:text-base font-bold text-ink truncate">
                {dateDetails?.weekday}, {dateDetails?.month} · {dateDetails?.time}
              </span>
              {dateDetails?.relativeLabel && (
                <span className="text-xs font-semibold text-accent-ink mt-0.5">
                  {dateDetails.relativeLabel}
                </span>
              )}
            </div>
          </div>

          {/* Showroom & Advisor details separated by hairlines */}
          <div className="border-t border-border divide-y divide-border text-xs text-ink-soft shrink-0">
            <div className="py-2 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-accent-ink shrink-0" />
              <span className="truncate">{booking.showroom_or_workshop_name}</span>
            </div>
            {booking.consultant_name && (
              <div className="py-2 flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-accent-ink shrink-0" />
                <span className="truncate">
                  {t("assigned")}: {booking.consultant_name}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons at bottom */}
          <div className="pt-2 border-t border-border grid grid-cols-2 gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              className="w-full text-xs"
              onClick={notWired("Reschedule Booking", 4)}
            >
              {t("reschedule")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs text-danger hover:bg-danger/10"
              onClick={notWired("Cancel Booking", 4)}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
