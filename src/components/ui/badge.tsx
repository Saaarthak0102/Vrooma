import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "accent" | "outline" | "danger" | "warn" | "ok";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-dark text-white border-transparent",
    secondary: "bg-surface-glass border-border text-ink-soft",
    accent: "bg-accent-soft text-accent-ink border-accent/20 font-medium",
    outline: "border-border text-ink bg-transparent",
    danger: "bg-danger/10 text-danger border-danger/20 font-semibold",
    warn: "bg-warn/10 text-warn border-warn/20 font-semibold",
    ok: "bg-accent/15 text-accent-ink border-accent/30 font-semibold",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-pill border px-2.5 py-0.5 text-xs font-semibold transition-colors select-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

