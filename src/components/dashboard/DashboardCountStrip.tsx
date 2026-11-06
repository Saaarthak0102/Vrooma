"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface DashboardCountStripProps {
  bookingsCount: number;
  savedCount: number;
  chatsCount: number;
  activeView: string | null;
  onSelectView: (view: "bookings" | "saved" | "enquiries", triggerElement: HTMLElement) => void;
}

export function DashboardCountStrip({
  bookingsCount,
  savedCount,
  chatsCount,
  activeView,
  onSelectView,
}: DashboardCountStripProps) {
  const t = useTranslations("dashboard");

  const cells = [
    {
      key: "bookings" as const,
      label: t("upcomingBookings"),
      value: bookingsCount,
      caption: t("upcomingBookingsCaption"),
      isAction: true,
    },
    {
      key: "saved" as const,
      label: t("savedVehicles"),
      value: savedCount,
      caption: t("savedVehiclesCaption"),
      isAction: true,
    },
    {
      key: "enquiries" as const,
      label: t("chatsCount"),
      value: chatsCount,
      caption: t("chatsCountCaption"),
      isAction: true,
    },
    {
      key: "city" as const,
      label: t("showroomCity"),
      value: t("showroomCityName"),
      caption: t("showroomCityCaption"),
      isAction: false,
      href: "/showrooms",
    },
  ];

  return (
    <div
      role="region"
      aria-label="Dashboard metrics strip"
      className="dashboard-count-strip border-y border-border select-none my-1"
    >
      <div className="grid grid-cols-2 min-[1100px]:grid-cols-4 divide-y min-[1100px]:divide-y-0 divide-x min-[1100px]:divide-x divide-border">
        {cells.map((cell) => {
          const isActive = activeView === cell.key;

          if (cell.isAction) {
            return (
              <button
                key={cell.key}
                type="button"
                data-bento-origin={`strip-${cell.key}`}
                aria-expanded={isActive}
                aria-controls="dashboard-view-all-panel"
                onClick={(e) => onSelectView(cell.key as "bookings" | "saved" | "enquiries", e.currentTarget)}
                className={cn(
                  "count-strip-cell group relative flex flex-col justify-center text-left py-2 px-3 sm:px-4 min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  "hover:bg-black/[0.015]",
                  isActive && "bg-black/[0.02]"
                )}
              >
                <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-mute group-hover:text-ink-soft transition-colors truncate">
                  {cell.label}
                </span>
                <span className="count-strip-value font-black text-ink tabular-nums leading-none my-0.5 tracking-tight">
                  {cell.value}
                </span>
                <span className="text-[13px] text-ink-soft line-clamp-1">
                  {cell.caption}
                </span>

                {/* 2px accent underline when active */}
                <span
                  className={cn(
                    "absolute bottom-0 left-0 right-0 h-[2px] bg-accent transition-opacity duration-200",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-30"
                  )}
                  aria-hidden="true"
                />
              </button>
            );
          }

          return (
            <Link
              key={cell.key}
              href={cell.href as any}
              className="count-strip-cell group relative flex flex-col justify-center py-2 px-3 sm:px-4 min-h-[44px] hover:bg-black/[0.015] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-mute group-hover:text-ink-soft transition-colors truncate">
                {cell.label}
              </span>
              <span className="count-strip-value font-black text-ink leading-none my-0.5 tracking-tight truncate">
                {cell.value}
              </span>
              <span className="text-[13px] text-ink-soft line-clamp-1 group-hover:text-accent-ink transition-colors">
                {cell.caption} →
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
