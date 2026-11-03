import React from "react";

export function ListingCardSkeleton() {
  return (
    <div
      className="notch-card animate-pulse select-none"
      aria-hidden="true"
    >
      {/* 1. Header row placeholder */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-16 bg-stone-200 rounded-[6px]" />
        <div className="h-4 w-24 bg-stone-200 rounded-md" />
      </div>

      {/* 2. Media geometry matching 16/10 (4/3 on phones) */}
      <div className="notch-media bg-stone-200">
        {/* Simplified flat notch tab placeholder bottom-left */}
        <div
          className="absolute left-0 bottom-0 bg-white flex items-center"
          style={{
            height: "var(--lc-tab-h)",
            width: "35%",
            borderTopRightRadius: "var(--lc-notch-r)",
            paddingLeft: "var(--lc-pad)",
          }}
        >
          <div className="h-3 w-16 bg-stone-200 rounded" />
        </div>
      </div>

      {/* 3. Title & Subtitle */}
      <div className="space-y-2 mb-3">
        <div className="h-6 w-3/4 bg-stone-200 rounded-md" />
        <div className="h-3.5 w-1/2 bg-stone-200 rounded-md" />
      </div>

      {/* 4. Chips row */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-6 w-16 bg-stone-200 rounded-md" />
        <div className="h-6 w-20 bg-stone-200 rounded-md" />
        <div className="h-6 w-16 bg-stone-200 rounded-md" />
      </div>

      {/* 5. Pricing & CTA bottom alignment */}
      <div className="pt-3 border-t border-border mt-auto">
        <div className="mb-3 space-y-1.5">
          <div className="h-7 w-36 bg-stone-200 rounded-md" />
          <div className="h-3.5 w-44 bg-stone-200 rounded-md" />
        </div>

        {/* 6. Buttons matching container queries */}
        <div className="notch-card-actions">
          <div className="h-11 w-full bg-stone-200 rounded-[12px]" />
          <div className="h-11 w-full bg-stone-200 rounded-[12px]" />
        </div>
      </div>
    </div>
  );
}
