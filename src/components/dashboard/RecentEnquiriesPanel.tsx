"use client";

import React from "react";
import { Lead } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BuyerStatusPill } from "./BuyerStatusPill";
import { formatEnquiryDate } from "@/lib/date";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RecentEnquiriesPanelProps {
  enquiries: Lead[];
  onViewAll: (triggerElement: HTMLElement) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function RecentEnquiriesPanel({
  enquiries,
  onViewAll,
  className,
  style,
}: RecentEnquiriesPanelProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const displayItems = enquiries.slice(0, 2);

  return (
    <section
      data-bento-origin="enquiries"
      aria-labelledby="recent-enquiries-heading"
      style={style}
      className={cn(
        "bento-block bento-enquiries border-y border-border py-2 sm:py-3 flex flex-col justify-between overflow-hidden",
        className
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between pb-2">
        <span
          id="recent-enquiries-heading"
          className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-mute"
        >
          {t("recentEnquiries")}
        </span>
        <Button
          variant="link"
          size="sm"
          onClick={(e) => onViewAll(e.currentTarget)}
          className="h-auto p-0 text-xs font-semibold text-accent-ink hover:underline"
        >
          {t("viewAll")}
        </Button>
      </div>

      {displayItems.length === 0 ? (
        <div className="flex-1 flex items-center justify-between py-3">
          <div className="flex items-center gap-2 text-ink-soft text-xs">
            <MessageSquare className="h-4 w-4 text-ink-mute" />
            <span>{t("noEnquiriesTitle")}</span>
          </div>
          <Button asChild variant="secondary" size="sm" className="h-8 text-xs">
            <Link href="/cars">{t("browseCars")}</Link>
          </Button>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border pt-1">
          {displayItems.map((lead, idx) => {
            const dateStr = formatEnquiryDate(lead.created_at, locale);
            const specialistName = lead.assigned_consultant_name || "Assigned under 5 min";

            return (
              <div
                key={lead.id}
                className={cn(
                  "enquiry-column flex flex-col justify-between py-1.5",
                  idx === 0 ? "sm:pr-4" : "sm:pl-4"
                )}
              >
                {/* Title & Status */}
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-xs sm:text-sm text-ink truncate leading-tight">
                    {lead.model_name || "Vehicle Enquiry"}
                  </h4>
                  <BuyerStatusPill status={lead.status} />
                </div>

                {/* Clamped Message */}
                <p className="enquiry-message text-xs text-ink-soft line-clamp-2 my-1 leading-snug">
                  {lead.message || "Requested showroom quotation and specs"}
                </p>

                {/* Footer line: date + specialist */}
                <div className="text-[11px] text-ink-mute truncate">
                  <span>{dateStr}</span>
                  <span className="mx-1" aria-hidden="true">·</span>
                  <span>
                    {t("specialist")}: <strong className="font-medium text-ink-soft">{specialistName}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
