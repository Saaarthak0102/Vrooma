"use client";

import React from "react";
import { Booking } from "@/types/domain";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { bookingRef } from "@/lib/booking-ref";
import { formatAppointmentDate } from "@/lib/date";
import { cancelBookingAction } from "@/server/actions/booking";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Car,
  Wrench,
  FileText,
  CheckCircle2,
} from "lucide-react";

export interface BookingDetailsDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingDetailsDialog({
  booking,
  open,
  onOpenChange,
}: BookingDetailsDialogProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const t = useTranslations("dashboard");

  if (!booking) return null;

  const handleCancel = async () => {
    const ok = await confirm({
      title: "Cancel this booking?",
      description: "The slot will be released and this can't be undone.",
      confirmLabel: "Cancel booking",
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await cancelBookingAction(booking.id);
      if (res.ok) {
        toast.success("Booking cancelled successfully.");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error.message || "Failed to cancel.");
      }
    } catch {
      toast.error("Failed to cancel.");
    }
  };

  const dateDetails = formatAppointmentDate(booking.starts_at);
  const isTestDrive = booking.kind === "test_drive";
  const title = isTestDrive
    ? `${booking.vehicle_info.model_name} ${booking.vehicle_info.variant_name || ""}`.trim()
    : `${booking.vehicle_info.model_name} (${booking.vehicle_info.variant_name || "Service"})`;
  const location = booking.showroom_or_workshop_name;
  const advisor = booking.consultant_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6 bg-white rounded-2xl shadow-elevated border border-border">
        <DialogHeader className="space-y-2 pb-3 border-b border-border text-left">
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-soft text-accent-ink border border-accent/20">
                {isTestDrive ? (
                  <Car className="h-3.5 w-3.5 text-accent-ink" />
                ) : (
                  <Wrench className="h-3.5 w-3.5 text-accent-ink" />
                )}
                <span>{isTestDrive ? t("testDrive") : t("service")}</span>
              </span>
              <span className="text-xs font-mono font-bold text-ink-soft bg-stone-100 px-2 py-0.5 rounded">
                {booking.ref || bookingRef(booking.id)}
              </span>
            </div>
            <Badge variant="ok" className="text-[10px] uppercase font-bold tracking-wide">
              {t("confirmed")}
            </Badge>
          </div>
          <DialogTitle className="text-lg font-bold text-ink tracking-tight">
            {t("bookingDetails")}
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-soft">
            {t("bookingDetailsDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* Detailed Content */}
        <div className="space-y-4 py-2 text-xs">
          {/* Vehicle Info Section */}
          <div className="rounded-xl bg-stone-50/80 border border-border p-3.5 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-white border border-border flex items-center justify-center shrink-0 text-ink">
              {isTestDrive ? <Car className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-mute block">
                {t("vehicleDetails")}
              </span>
              <p className="text-sm font-bold text-ink truncate mt-0.5">{title}</p>
              {booking.vehicle_info.reg_no && (
                <p className="text-[11px] font-mono text-ink-soft mt-0.5">
                  Reg: {booking.vehicle_info.reg_no}
                </p>
              )}
            </div>
          </div>

          {/* Date & Time Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-3 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-mute flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-accent-ink" />
                <span>{t("dateTime")}</span>
              </span>
              <p className="text-xs font-bold text-ink">
                {dateDetails.weekday}, {dateDetails.fullDateString}
              </p>
              <p className="text-xs text-ink-soft font-semibold flex items-center gap-1">
                <Clock className="h-3 w-3 text-ink-mute" />
                <span>{dateDetails.time}</span>
                {dateDetails.relativeLabel && (
                  <span className="text-accent-ink text-[11px] font-bold ml-1">
                    ({dateDetails.relativeLabel})
                  </span>
                )}
              </p>
            </div>

            <div className="rounded-xl border border-border p-3 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-mute flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-accent-ink" />
                <span>{t("facility")}</span>
              </span>
              <p className="text-xs font-bold text-ink truncate">{location}</p>
              <p className="text-[11px] text-ink-soft">Lucknow, Uttar Pradesh</p>
            </div>
          </div>

          {/* Assigned Consultant & Notes */}
          <div className="rounded-xl border border-border divide-y divide-border">
            {advisor && (
              <div className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-mute block">
                      {t("assigned")}
                    </span>
                    <span className="text-xs font-bold text-ink truncate block">
                      {advisor}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-accent-ink bg-accent-soft/60 px-2 py-0.5 rounded shrink-0">
                  {isTestDrive ? "Sales Specialist" : "Service Advisor"}
                </span>
              </div>
            )}

            {booking.notes && (
              <div className="p-3 flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-ink-mute shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-mute block">
                    {t("specialInstructions")}
                  </span>
                  <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">
                    {booking.notes}
                  </p>
                </div>
              </div>
            )}

            <div className="p-3 flex items-center justify-between text-[11px] text-ink-mute">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent-ink" />
                <span>DPDP Act 2023 Verified Session</span>
              </span>
              <span>
                {t("bookedOn")}: {new Date(booking.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-border flex flex-wrap sm:flex-nowrap gap-2 items-center justify-between">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-danger hover:bg-danger/10 flex-1 sm:flex-initial"
              onClick={handleCancel}
            >
              {t("cancel")}
            </Button>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="text-xs w-full sm:w-auto px-5"
            onClick={() => onOpenChange(false)}
          >
            {t("done")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
