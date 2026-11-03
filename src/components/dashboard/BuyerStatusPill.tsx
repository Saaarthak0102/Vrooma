"use client";

import React from "react";
import { useLocale } from "next-intl";
import { getBuyerEnquiryStatus } from "@/lib/enquiry-status";
import { cn } from "@/lib/utils";

export interface BuyerStatusPillProps {
  status: string;
  className?: string;
}

export function BuyerStatusPill({ status, className }: BuyerStatusPillProps) {
  const locale = useLocale();
  const config = getBuyerEnquiryStatus(status);
  const label = locale === "hi" ? config.labelHi : config.labelEn;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide select-none",
        config.tone === "active"
          ? "bg-accent-soft text-accent-ink border border-accent/20"
          : "bg-ink/5 text-ink-mute border border-border",
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          config.tone === "active" ? "bg-accent" : "bg-ink-tertiary"
        )}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}

