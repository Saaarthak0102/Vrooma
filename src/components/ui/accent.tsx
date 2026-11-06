"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface AccentProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  tone?: "mute" | "accent";
}

/**
 * Renders an accent phrase in headlines.
 * Instrument Serif italic.
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
  return (
    <span
      className={cn(
        "inline-block px-1",
        "font-serif italic font-normal tracking-normal",
        tone === "mute" ? "text-ink-mute" : "text-accent-ink",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
