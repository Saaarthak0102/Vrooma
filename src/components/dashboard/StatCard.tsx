import React from "react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, subtitle, icon, className }: StatCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-white p-5 shadow-card", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
          {label}
        </span>
        {icon && <div className="text-ink-mute">{icon}</div>}
      </div>
      <div className="mt-2 text-2xl font-black text-ink">{value}</div>
      {subtitle && <p className="mt-1 text-xs text-ink-mute">{subtitle}</p>}
    </div>
  );
}
