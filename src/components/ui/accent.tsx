import React from "react";
import { cn } from "@/lib/utils";

export interface AccentProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

/**
 * Renders an italic accent word in headlines using the serif font token.
 * Follows design rule: "Instrument Serif italic only for the single accent word in a headline".
 */
export function Accent({ children, className, ...props }: AccentProps) {
  return (
    <span
      className={cn(
        "font-serif italic font-normal tracking-normal text-ink inline-block px-1",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

