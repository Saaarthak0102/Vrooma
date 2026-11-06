"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardActionTileProps {
  variant: "dark" | "light";
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  className?: string;
  style?: React.CSSProperties;
}

export function DashboardActionTile({
  variant,
  href,
  icon: Icon,
  title,
  subtitle,
  className,
  style,
}: DashboardActionTileProps) {
  const isDark = variant === "dark";

  return (
    <Link
      href={href as any}
      style={style}
      className={cn(
        "group bento-block bento-tile block relative rounded-[16px] overflow-hidden transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent",
        isDark
          ? "bg-dark text-white border border-dark hover:border-black/40"
          : "bg-white text-ink border border-border hover:border-black/20 shadow-sm",
        className
      )}
    >
      <div className="tile-surface h-full w-full p-4 sm:p-4.5 flex flex-col justify-between transition-transform duration-200 active:scale-[0.98]">
        {/* Top row: Icon on left, Arrow on right with hover nudge */}
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
              isDark ? "bg-white/10 text-white" : "bg-stone-100 text-ink"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <ArrowUpRight
            className={cn(
              "h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1",
              isDark ? "text-white/70 group-hover:text-white" : "text-ink-mute group-hover:text-ink"
            )}
          />
        </div>

        {/* Bottom content: Title + one-line sub */}
        <div className="mt-2 min-w-0">
          <h3 className="font-bold text-sm sm:text-base leading-tight truncate">
            {title}
          </h3>
          <p
            className={cn(
              "tile-subtitle text-[12px] truncate mt-0.5",
              isDark ? "text-white/60" : "text-ink-soft"
            )}
          >
            {subtitle}
          </p>
        </div>
      </div>
    </Link>
  );
}
