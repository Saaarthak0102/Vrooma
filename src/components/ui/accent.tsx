"use client";

import React from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

export interface AccentProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  tone?: "mute" | "accent";
}

/**
 * Renders an accent phrase in headlines.
 * In English: Instrument Serif italic.
 * In Hindi: Noto Serif Devanagari, NOT italic.
 * Tones:
 * - "mute": var(--ink-mute)
 * - "accent": var(--accent-ink)
 */
export function Accent({
  children,
  tone = "accent",
  className,
  ...props
}: AccentProps) {
  const locale = useLocale();
  const isHindi = locale === "hi";

  return (
    <span
      className={cn(
        "inline-block px-1",
        isHindi
          ? "font-devanagari not-italic font-medium"
          : "font-serif italic font-normal tracking-normal",
        tone === "mute" ? "text-ink-mute" : "text-accent-ink",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
