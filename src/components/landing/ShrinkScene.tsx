"use client";

import React from "react";
import { PinnedScene } from "@/components/motion/PinnedScene";
import { Reveal } from "@/components/motion/Reveal";
import { gsap } from "@/lib/motion/register";

export interface ShrinkSceneProps {
  id: string;
  length: number; // in vh of scroll
  buildDesktopTimeline: (tl: gsap.core.Timeline) => void;
  desktopContent: React.ReactNode;
  mobileContent: React.ReactNode;
  className?: string;
}

/**
 * Reusable ShrinkScene template for ShowroomsOrbit, TransparentPricing, and InspectedUsed.
 * Desktop: pinned timeline with focal asset shrink & card orchestration.
 * Mobile: stacked, responsive flow wrapped in accessible Reveal containers.
 */
export function ShrinkScene({
  id,
  length,
  buildDesktopTimeline,
  desktopContent,
  mobileContent,
  className = "",
}: ShrinkSceneProps) {
  return (
    <PinnedScene
      id={id}
      length={length}
      build={buildDesktopTimeline}
      className={`relative w-full ${className}`.trim()}
      stageClassName="stage flex items-center justify-center overflow-hidden"
    >
      {/* Desktop Pinned Layer */}
      <div data-layer className="hidden lg:block w-full h-full pointer-events-none">
        <div className="relative w-full h-full max-w-7xl mx-auto px-8 pointer-events-auto">
          {desktopContent}
        </div>
      </div>

      {/* Mobile Stacked Fallback */}
      <div className="lg:hidden w-full px-4 sm:px-6 py-8 space-y-8 text-left">
        {mobileContent}
      </div>
    </PinnedScene>
  );
}
