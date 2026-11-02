import React from "react";
import { cn } from "@/lib/utils";
import { Car } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon = <Car className="h-10 w-10 text-ink-mute stroke-[1.5]" />,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-lg border border-dashed border-border bg-white/40",
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ink/5">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

