"use client";

import React from "react";
import { toast } from "sonner";

/**
 * Dead-button policy helper:
 * Returns an onClick handler that displays a polite sonner toast and logs to console.
 * Every placeholder action must be registered in docs/WIRING.md.
 */
export function notWired(label: string, day = 3) {
  return (e?: React.MouseEvent) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      e.stopPropagation();
    }
    const msg = `"${label}" is being wired up (due Day ${day})`;
    console.info(`[Vrooma Dead-Button Policy] ${msg}`);
    toast.info(msg, {
      description: "Backend / third-party integration scheduled per project roadmap.",
    });
  };
}

interface NotWiredProps {
  label: string;
  day?: number;
  children: React.ReactNode;
  className?: string;
}

export function NotWired({ label, day = 3, children, className }: NotWiredProps) {
  return (
    <span
      onClick={notWired(label, day)}
      className={className}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          notWired(label, day)();
        }
      }}
    >
      {children}
    </span>
  );
}

