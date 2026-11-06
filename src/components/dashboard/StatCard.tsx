import React from "react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  /** Console use: turns the card into a toggle button that filters the table below it. */
  onClick?: () => void;
  active?: boolean;
}

export function StatCard({ label, value, subtitle, icon, className, onClick, active }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
          {label}
        </span>
        {icon && <div className="text-ink-mute">{icon}</div>}
      </div>
      <div className="mt-2 text-2xl font-black text-ink">{value}</div>
      {subtitle && <p className="mt-1 text-xs text-ink-mute">{subtitle}</p>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={Boolean(active)}
        className={cn(
          "w-full rounded-xl border bg-white p-5 text-left shadow-card transition-colors hover:border-accent",
          active ? "border-accent ring-2 ring-accent/30" : "border-border",
          className
        )}
      >
        {body}
      </button>
    );
  }

  return <div className={cn("rounded-xl border border-border bg-white p-5 shadow-card", className)}>{body}</div>;
}
