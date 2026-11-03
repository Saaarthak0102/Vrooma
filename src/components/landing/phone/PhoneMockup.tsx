import React from "react";
import { cn } from "@/lib/utils";

export interface PhoneMockupProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * CSS-only PhoneMockup component:
 * - Rounded 44px frame
 * - Dynamic island
 * - 9:19.5 aspect ratio
 * - 1px inner highlight
 * - Soft drop shadow
 */
export function PhoneMockup({ children, className = "", style }: PhoneMockupProps) {
  return (
    <div
      style={style}
      className={cn(
        "phone-mockup relative aspect-[9/19.5] w-[var(--phone-w,280px)] rounded-[44px] bg-[#0A0D12] p-3 shadow-[0_24px_60px_-12px_rgba(15,23,32,0.35)] ring-1 ring-white/20 select-none",
        className
      )}
    >
      {/* Outer frame bezel & subtle inner edge highlight */}
      <div
        className="phone-mockup-inner relative h-full w-full overflow-hidden rounded-[36px] bg-bg ring-1 ring-inset ring-black/10 flex flex-col"
        style={{ containerType: "inline-size" }}
      >
        {/* Dynamic Island */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 h-5 w-24 bg-black rounded-pill z-30 flex items-center justify-between px-2 pointer-events-none">
          <div className="h-2 w-2 rounded-full bg-slate-900" />
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/70" />
        </div>

        {/* Screen Content Container */}
        <div className="phone-screen-container relative h-full w-full pt-8 pb-3 px-3 overflow-hidden flex flex-col">
          {children}
        </div>

        {/* Home indicator bar at bottom */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-28 bg-ink/20 rounded-pill z-30 pointer-events-none" />
      </div>
    </div>
  );
}
