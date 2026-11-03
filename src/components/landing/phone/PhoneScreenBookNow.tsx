import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { MapPin, Home, Car, Tag, Calendar, User } from "lucide-react";
import { BookNowPreviewData } from "@/server/landing-data";
import { getVehicleAsset } from "@/constants/vehicle-assets";

export interface PhoneScreenBookNowProps {
  modelName?: string;
  variantName?: string;
  preview: BookNowPreviewData;
}

export function PhoneScreenBookNow({
  modelName = "Model H",
  variantName = "ZX Automatic",
  preview,
}: PhoneScreenBookNowProps) {
  const t = useTranslations("home.phone");

  return (
    <div className="flex flex-col h-full text-ink text-left justify-between space-y-2 pt-0.5 overflow-hidden">
      {/* 1. Mini header: "Book Test Drive" + featured model name & variant + small thumbnail */}
      <div className="rounded-2xl bg-white p-2.5 border border-border/80 shadow-sm shrink-0">
        <span className="text-[clamp(12px,3.6cqw,13px)] uppercase font-bold tracking-wider text-accent-ink block leading-tight">
          {t("bookTestDriveHeader")}
        </span>
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="min-w-0">
            <h4 className="text-[clamp(13px,4.5cqw,16px)] font-extrabold tracking-tight text-ink leading-tight truncate">
              {modelName}
            </h4>
            <p className="text-[clamp(12px,3.6cqw,13px)] text-ink-mute leading-tight truncate">
              {variantName}
            </p>
          </div>
          <div className="relative w-16 h-8 shrink-0 select-none">
            <Image
              src={getVehicleAsset(modelName)}
              alt={modelName}
              fill
              className="object-contain"
            />
          </div>
        </div>
      </div>

      {/* 2. Step 1: "Pick a showroom" - 2 showroom rows with name, neighbourhood, and today's hours. Row 1 selected. */}
      <div className="space-y-1 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[clamp(12px,3.8cqw,13px)] font-bold uppercase tracking-wider text-ink-mute">
            {t("step1PickShowroom")}
          </span>
          <span className="text-[clamp(12px,3.4cqw,13px)] font-semibold text-accent-ink">
            2 {t("nearby")}
          </span>
        </div>

        <div className="space-y-1.5">
          {preview?.showrooms?.slice(0, 2).map((sr, idx) => {
            const isSelected = idx === 0;
            return (
              <div
                key={sr.id}
                className={`rounded-xl p-2 flex items-center justify-between transition-colors border ${
                  isSelected
                    ? "bg-white border-dark text-ink shadow-sm"
                    : "bg-white/60 border-border/70 text-ink-soft"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-dark text-white" : "bg-ink/5 text-ink-mute"
                    }`}
                  >
                    <MapPin className="h-3 w-3" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[clamp(12px,3.8cqw,14px)] font-bold text-ink block leading-tight truncate">
                      {sr.name}
                    </span>
                    <span className="text-[clamp(12px,3.4cqw,13px)] text-ink-mute block leading-tight truncate">
                      {sr.area}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-1.5">
                  <span
                    className={`text-[clamp(12px,3.4cqw,13px)] font-semibold block leading-tight ${
                      sr.openNow ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {sr.label}
                  </span>
                  {isSelected && (
                    <span className="text-[clamp(12px,3.2cqw,13px)] text-accent-ink font-bold block pt-0.5">
                      {t("selected")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Step 2: "Today's free slots" - 3 pills. First slot selected. If fallback, show tomorrow's with "Tomorrow" chip */}
      <div className="space-y-1 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[clamp(12px,3.8cqw,13px)] font-bold uppercase tracking-wider text-ink-mute">
            {t("step2TodaySlots")}
          </span>
          {preview?.nextDayLabel ? (
            <span className="text-[clamp(12px,3.4cqw,13px)] px-1.5 py-0.5 rounded bg-accent/15 text-accent-ink font-bold leading-none">
              {t("tomorrow")}
            </span>
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          )}
        </div>

        <div className="grid grid-cols-3 gap-1">
          {preview?.slots?.slice(0, 3).map((slot, sIdx) => {
            const isSlotSelected = sIdx === 0;
            return (
              <div
                key={slot.id}
                className={`py-1.5 px-1 rounded-xl text-center border transition-all ${
                  isSlotSelected
                    ? "bg-dark text-white border-dark shadow-sm"
                    : "bg-white border-border/80 text-ink"
                }`}
              >
                <span className="text-[clamp(12px,3.6cqw,13px)] font-bold block leading-tight truncate">
                  {slot.timeFormatted}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Mini visual "Confirm test drive" button (decorative / non-clickable, aria-hidden) */}
      <div aria-hidden="true" className="pt-0.5 shrink-0">
        <div className="w-full h-8 rounded-pill bg-accent text-white flex items-center justify-center font-bold text-[clamp(12px,3.6cqw,14px)] shadow-sm select-none pointer-events-none">
          {t("confirmTestDrive")}
        </div>
      </div>

      {/* 5. Bottom tab bar pinned to screen bottom: Home, Cars, Used, Bookings, Profile (Bookings active) */}
      <div
        aria-hidden="true"
        className="mt-auto border-t border-border/80 bg-white/95 backdrop-blur-sm -mx-3 -mb-3 px-2 py-2 flex items-center justify-around shrink-0 rounded-b-[36px]"
      >
        <div className="flex flex-col items-center gap-0.5 text-ink-mute">
          <Home className="h-3.5 w-3.5" />
          <span className="text-[clamp(12px,3.2cqw,13px)] leading-none">{t("tabHome")}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 text-ink-mute">
          <Car className="h-3.5 w-3.5" />
          <span className="text-[clamp(12px,3.2cqw,13px)] leading-none">{t("tabCars")}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 text-ink-mute">
          <Tag className="h-3.5 w-3.5" />
          <span className="text-[clamp(12px,3.2cqw,13px)] leading-none">{t("tabUsed")}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 text-accent-ink font-bold">
          <Calendar className="h-3.5 w-3.5" />
          <span className="text-[clamp(12px,3.2cqw,13px)] leading-none">{t("tabBookings")}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 text-ink-mute">
          <User className="h-3.5 w-3.5" />
          <span className="text-[clamp(12px,3.2cqw,13px)] leading-none">{t("tabProfile")}</span>
        </div>
      </div>
    </div>
  );
}
