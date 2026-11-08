"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion/register";
import { PIN_QUERY } from "@/lib/motion/media";

export interface PinnedSceneProps {
  id: string;
  length: number; // in vh of scroll
  children: React.ReactNode;
  build: (tl: gsap.core.Timeline, ctx: gsap.Context) => void;
  className?: string;
  stageClassName?: string;
}

export function PinnedScene({
  id,
  length,
  children,
  build,
  className = "",
  stageClassName = "",
}: PinnedSceneProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const stage = stageRef.current;
      if (!section || !stage) return;

      const mm = gsap.matchMedia();

      mm.add(PIN_QUERY, (ctx) => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${window.innerHeight * (length / 100)}`,
            pin: stage,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        build(tl, ctx);
      });

      return () => {
        mm.revert();
      };
    },
    { scope: sectionRef }
  );

  return (
    <section id={id} data-scene ref={sectionRef} className={className}>
      <div className={`stage ${stageClassName}`.trim()} data-stage ref={stageRef}>
        {children}
      </div>
    </section>
  );
}
