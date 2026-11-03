"use client";

import React, { useState, useId } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Booking, Lead, Model, UsedCar } from "@/types/domain";
import { SavedVehicleRecord } from "@/server/repositories/saved";
import { bookingRef } from "@/lib/booking-ref";
import { formatAppointmentDate, formatEnquiryDate } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { BuyerStatusPill } from "./BuyerStatusPill";
import { Button } from "@/components/ui/button";
import { notWired } from "@/components/dev/NotWired";
import {
  Calendar,
  Bookmark,
  MessageSquare,
  Clock,
  MapPin,
  User,
  Car,
  Trash2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getVehicleAsset } from "@/constants/vehicle-assets";

export interface DashboardPanelContentProps {
  activeTab: "bookings" | "saved" | "enquiries";
  onTabChange: (tab: "bookings" | "saved" | "enquiries") => void;
  bookings: Booking[];
  savedVehicles: SavedVehicleRecord[];
  enquiries: Lead[];
  onRemoveSaved?: (id: string) => void;
  isSheet?: boolean;
}

export function DashboardPanelContent({
  activeTab,
  onTabChange,
  bookings,
  savedVehicles,
  enquiries,
  onRemoveSaved,
  isSheet = false,
}: DashboardPanelContentProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tablistId = useId();

  // Internal tab sub-filters
  const [bookingSubTab, setBookingSubTab] = useState<"upcoming" | "past">("upcoming");
  const [savedFilter, setSavedFilter] = useState<"all" | "model" | "used">("all");
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState<string>("all");

  const now = new Date();
  const upcomingBookings = bookings.filter((b) => new Date(b.starts_at).getTime() >= now.getTime());
  const pastBookings = bookings.filter((b) => new Date(b.starts_at).getTime() < now.getTime());

  // Has both new and used vehicles?
  const hasModels = savedVehicles.some((s) => s.type === "model");
  const hasUsed = savedVehicles.some((s) => s.type === "used");
  const showSavedTypeFilter = hasModels && hasUsed;

  const filteredSaved = savedVehicles.filter((s) => {
    if (savedFilter === "model") return s.type === "model";
    if (savedFilter === "used") return s.type === "used";
    return true;
  });

  // Unique statuses for enquiries filter
  const uniqueEnquiryStatuses = Array.from(new Set(enquiries.map((e) => e.status)));
  const showEnquiryStatusFilter = uniqueEnquiryStatuses.length > 1;

  const filteredEnquiries = enquiries.filter((e) => {
    if (enquiryStatusFilter === "all") return true;
    return e.status === enquiryStatusFilter;
  });

  // Cap at 50 items
  const cappedBookings = (bookingSubTab === "upcoming" ? upcomingBookings : pastBookings).slice(0, 50);
  const cappedSaved = filteredSaved.slice(0, 50);
  const cappedEnquiries = filteredEnquiries.slice(0, 50);

  const tabs: Array<{ key: "bookings" | "saved" | "enquiries"; label: string; count: number }> = [
    { key: "bookings", label: t("tabBookings"), count: bookings.length },
    { key: "saved", label: t("tabSaved"), count: savedVehicles.length },
    { key: "enquiries", label: t("tabEnquiries"), count: enquiries.length },
  ];

  const handleKeyDown = (e: React.KeyboardEvent, currentKey: "bookings" | "saved" | "enquiries") => {
    const keys: Array<"bookings" | "saved" | "enquiries"> = ["bookings", "saved", "enquiries"];
    const currentIndex = keys.indexOf(currentKey);

    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = keys[(currentIndex + 1) % keys.length];
      onTabChange(next);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = keys[(currentIndex - 1 + keys.length) % keys.length];
      onTabChange(prev);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Top Segmented Tabs */}
      <div
        role="tablist"
        aria-label="Dashboard views"
        id={tablistId}
        className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-full w-fit mb-4 shrink-0 select-none border border-border"
      >
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={isSelected}
              aria-controls={`panel-${tab.key}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onTabChange(tab.key)}
              onKeyDown={(e) => handleKeyDown(e, tab.key)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-160 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isSelected
                  ? "bg-white text-ink shadow-sm"
                  : "text-ink-soft hover:text-ink hover:bg-white/50"
              )}
            >
              {tab.label} <span className="tabular-nums text-[11px] opacity-75">({tab.count})</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Panels with 160ms crossfade transition */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin transition-opacity duration-160">
        {/* ===================== TAB 1: BOOKINGS ===================== */}
        {activeTab === "bookings" && (
          <div
            role="tabpanel"
            id="panel-bookings"
            aria-labelledby="tab-bookings"
            className="space-y-4"
          >
            {/* Sub-tabs: Upcoming | Past */}
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBookingSubTab("upcoming")}
                  className={cn(
                    "text-xs font-bold pb-1 transition-colors relative",
                    bookingSubTab === "upcoming"
                      ? "text-ink border-b-2 border-accent"
                      : "text-ink-soft hover:text-ink"
                  )}
                >
                  {t("subTabUpcoming")} ({upcomingBookings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBookingSubTab("past")}
                  className={cn(
                    "text-xs font-bold pb-1 transition-colors relative",
                    bookingSubTab === "past"
                      ? "text-ink border-b-2 border-accent"
                      : "text-ink-soft hover:text-ink"
                  )}
                >
                  {t("subTabPast")} ({pastBookings.length})
                </button>
              </div>

              {cappedBookings.length === 50 && (
                <span className="text-[11px] font-medium text-ink-mute">
                  {t("showingLatest50")}
                </span>
              )}
            </div>

            {cappedBookings.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
                <Calendar className="h-8 w-8 text-ink-mute" />
                <p className="text-sm text-ink-soft">
                  {bookingSubTab === "upcoming" ? t("noUpcoming") : "No past appointments found."}
                </p>
                {bookingSubTab === "upcoming" && (
                  <Button asChild variant="primary" size="sm" className="text-xs">
                    <Link href="/book/test-drive">{t("bookTestDriveBtn")}</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div
                className={cn(
                  "grid gap-3.5",
                  isSheet ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
                )}
              >
                {cappedBookings.map((b) => {
                  const dateDetails = formatAppointmentDate(b.starts_at, locale);
                  const isTestDrive = b.kind === "test_drive";
                  const isUpcoming = bookingSubTab === "upcoming";

                  return (
                    <article
                      key={b.id}
                      className="rounded-[14px] border border-border bg-white p-4 shadow-sm hover:border-black/20 transition-colors flex flex-col justify-between space-y-3"
                    >
                      {/* Top meta row */}
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-soft text-accent-ink border border-accent/20">
                            {isTestDrive ? t("testDrive") : t("service")}
                          </span>
                          <span className="text-xs font-mono font-medium text-ink-mute">
                            {bookingRef(b.id)}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                          {b.status}
                        </span>
                      </div>

                      {/* Vehicle & Date */}
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-ink flex items-center gap-1.5">
                          <Car className="h-4 w-4 text-ink-mute shrink-0" />
                          <span>
                            {b.vehicle_info.model_name} {b.vehicle_info.variant_name || ""}
                          </span>
                        </h4>

                        <p className="text-xs text-ink-soft flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-accent-ink shrink-0" />
                          <span className="font-semibold text-ink">
                            {dateDetails.fullDateString} · {dateDetails.time}
                          </span>
                          {dateDetails.relativeLabel && isUpcoming && (
                            <span className="text-accent-ink text-[11px] font-semibold ml-1">
                              ({dateDetails.relativeLabel})
                            </span>
                          )}
                        </p>

                        <p className="text-xs text-ink-soft flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-accent-ink shrink-0" />
                          <span className="truncate">{b.showroom_or_workshop_name}</span>
                        </p>

                        {b.consultant_name && (
                          <p className="text-xs text-ink-soft flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-accent-ink shrink-0" />
                            <span>
                              {t("assigned")}: <strong>{b.consultant_name}</strong>
                            </span>
                          </p>
                        )}
                      </div>

                      {/* Actions for upcoming only */}
                      {isUpcoming && (
                        <div className="pt-2 border-t border-border flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-1/2 text-xs"
                            onClick={notWired("Reschedule Booking", 4)}
                          >
                            {t("reschedule")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-1/2 text-xs text-danger hover:bg-danger/10"
                            onClick={notWired("Cancel Booking", 4)}
                          >
                            {t("cancel")}
                          </Button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 2: SAVED VEHICLES ===================== */}
        {activeTab === "saved" && (
          <div
            role="tabpanel"
            id="panel-saved"
            aria-labelledby="tab-saved"
            className="space-y-4"
          >
            {/* Filter buttons if both model and used cars exist */}
            {showSavedTypeFilter && (
              <div className="flex items-center gap-1.5 pb-2 border-b border-border">
                <button
                  type="button"
                  onClick={() => setSavedFilter("all")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                    savedFilter === "all"
                      ? "bg-dark text-white"
                      : "bg-stone-100 text-ink-soft hover:text-ink"
                  )}
                >
                  {t("filterAll")} ({savedVehicles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSavedFilter("model")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                    savedFilter === "model"
                      ? "bg-dark text-white"
                      : "bg-stone-100 text-ink-soft hover:text-ink"
                  )}
                >
                  {t("filterNew")} ({savedVehicles.filter((s) => s.type === "model").length})
                </button>
                <button
                  type="button"
                  onClick={() => setSavedFilter("used")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                    savedFilter === "used"
                      ? "bg-dark text-white"
                      : "bg-stone-100 text-ink-soft hover:text-ink"
                  )}
                >
                  {t("filterUsed")} ({savedVehicles.filter((s) => s.type === "used").length})
                </button>
              </div>
            )}

            {cappedSaved.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
                <Bookmark className="h-8 w-8 text-ink-mute" />
                <p className="text-sm text-ink-soft">{t("noSavedTitle")}</p>
                <Button asChild variant="primary" size="sm" className="text-xs">
                  <Link href="/cars">{t("browseCars")}</Link>
                </Button>
              </div>
            ) : (
              <div
                className={cn(
                  "grid gap-3.5",
                  isSheet ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                )}
              >
                {cappedSaved.map((record) => {
                  const isUsed = record.type === "used";
                  const car = record.item as UsedCar;
                  const model = record.item as Model;

                  const title = isUsed ? car.model_name : model.name;
                  const subtitle = isUsed ? car.variant_name : model.tagline || "";
                  const image = isUsed ? car.images[0] : model.hero_image;
                  const price = isUsed ? car.price : model.min_price;
                  const priceLabel = isUsed ? "Price" : "Ex-showroom";
                  const linkHref = isUsed ? `/used-cars/${car.stock_id}` : `/cars/${model.slug}`;

                  return (
                    <article
                      key={record.id}
                      className="rounded-[14px] border border-border bg-white overflow-hidden shadow-sm hover:border-black/20 transition-colors flex flex-col justify-between"
                    >
                      <div className="relative aspect-[16/10] bg-stone-100">
                        <Image
                          src={getVehicleAsset(image || record.item)}
                          alt={title}
                          fill
                          sizes="(max-width: 640px) 100vw, 320px"
                          className="object-contain p-2"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 text-ink shadow-sm">
                          {isUsed ? "Certified Used" : "Brand New"}
                        </span>
                      </div>

                      <div className="p-3.5 flex flex-col justify-between flex-1 space-y-2">
                        <div>
                          <h4 className="font-bold text-sm text-ink truncate leading-tight">
                            <Link href={linkHref as any} className="hover:underline">
                              {title}
                            </Link>
                          </h4>
                          {subtitle && (
                            <p className="text-[11px] text-ink-soft truncate leading-tight mt-0.5">
                              {subtitle}
                            </p>
                          )}
                          <p className="text-xs font-bold text-ink mt-1.5 tabular-nums">
                            <span className="text-[11px] font-normal text-ink-mute mr-1">
                              {priceLabel}:
                            </span>
                            {formatINR(price)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                          <Button
                            asChild
                            variant="secondary"
                            size="sm"
                            className="flex-1 text-xs h-8"
                          >
                            <Link href={linkHref as any}>
                              <span>{t("view")}</span>
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-ink-mute hover:text-danger rounded-lg"
                            onClick={() => onRemoveSaved?.(record.id) || notWired("Remove Saved", 4)()}
                            aria-label={`${t("remove")} ${title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 3: ENQUIRIES ===================== */}
        {activeTab === "enquiries" && (
          <div
            role="tabpanel"
            id="panel-enquiries"
            aria-labelledby="tab-enquiries"
            className="space-y-4"
          >
            {/* Status filter if > 1 status exists */}
            {showEnquiryStatusFilter && (
              <div className="flex items-center gap-1.5 pb-2 border-b border-border overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setEnquiryStatusFilter("all")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors",
                    enquiryStatusFilter === "all"
                      ? "bg-dark text-white"
                      : "bg-stone-100 text-ink-soft hover:text-ink"
                  )}
                >
                  {t("filterAllStatus")} ({enquiries.length})
                </button>
                {uniqueEnquiryStatuses.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setEnquiryStatusFilter(st)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors capitalize",
                      enquiryStatusFilter === st
                        ? "bg-dark text-white"
                        : "bg-stone-100 text-ink-soft hover:text-ink"
                    )}
                  >
                    {st.replace(/_/g, " ")} ({enquiries.filter((e) => e.status === st).length})
                  </button>
                ))}
              </div>
            )}

            {cappedEnquiries.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
                <MessageSquare className="h-8 w-8 text-ink-mute" />
                <p className="text-sm text-ink-soft">{t("noEnquiriesTitle")}</p>
                <Button asChild variant="primary" size="sm" className="text-xs">
                  <Link href="/cars">{t("browseCars")}</Link>
                </Button>
              </div>
            ) : (
              <div
                className={cn(
                  "grid gap-3.5",
                  isSheet ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
                )}
              >
                {cappedEnquiries.map((lead) => {
                  const dateStr = formatEnquiryDate(lead.created_at, locale);
                  const specialistName = lead.assigned_consultant_name || "Assigned under 5 min";
                  const vehicleHref = lead.used_car_id
                    ? `/used-cars/${lead.used_car_id}`
                    : lead.model_id
                    ? `/cars/${lead.model_id}`
                    : null;

                  return (
                    <article
                      key={lead.id}
                      className="rounded-[14px] border border-border bg-white p-4 shadow-sm hover:border-black/20 transition-colors flex flex-col justify-between space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <h4 className="font-bold text-sm text-ink truncate leading-tight">
                            {lead.model_name || "Vehicle Quotation Request"}
                          </h4>
                          {vehicleHref && (
                            <Link
                              href={vehicleHref as any}
                              className="text-ink-mute hover:text-accent-ink"
                              title="View car page"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                        <BuyerStatusPill status={lead.status} />
                      </div>

                      {/* Full message, not clamped */}
                      <p className="text-xs text-ink-soft whitespace-pre-wrap leading-relaxed">
                        {lead.message || "Requested showroom quotation and specs"}
                      </p>

                      <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-ink-mute">
                        <span>{dateStr}</span>
                        <span>
                          {t("specialist")}:{" "}
                          <strong className="font-medium text-ink-soft">{specialistName}</strong>
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

