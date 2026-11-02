import React from "react";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
}

export function GlassCard({
  children,
  interactive = false,
  className,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-card p-6",
        interactive && "glass-card-interactive cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
