"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion/register";
import { PIN_QUERY } from "@/lib/motion/media";

export function SheenBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bar1Ref = useRef<HTMLDivElement>(null);
  const bar2Ref = useRef<HTMLDivElement>(null);
  const bar3Ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const container = containerRef.current;
      const b1 = bar1Ref.current;
      const b2 = bar2Ref.current;
      const b3 = bar3Ref.current;
      if (!container || !b1 || !b2 || !b3) return;

      const mm = gsap.matchMedia();

      mm.add(PIN_QUERY, () => {
        gsap.to(b1, {
          yPercent: 12,
          ease: "none",
          scrollTrigger: {
            trigger: document.body,
            start: "top top",
            end: "bottom bottom",
            scrub: 1.2,
          },
        });

        gsap.to(b2, {
          yPercent: -10,
          ease: "none",
          scrollTrigger: {
            trigger: document.body,
            start: "top top",
            end: "bottom bottom",
            scrub: 1.5,
          },
        });

        gsap.to(b3, {
          yPercent: 8,
          ease: "none",
          scrollTrigger: {
            trigger: document.body,
            start: "top top",
            end: "bottom bottom",
            scrub: 1.1,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]"
    >
      {/* Sheen Bar 1 */}
      <div
        ref={bar1Ref}
        className="absolute -top-[20vh] -left-[10vw] w-[32vw] h-[140vh] origin-center -rotate-[24deg] blur-[40px] opacity-50 bg-gradient-to-b from-white/80 via-slate-200/40 to-transparent"
      />
      {/* Sheen Bar 2 */}
      <div
        ref={bar2Ref}
        className="absolute -top-[15vh] left-[38vw] w-[28vw] h-[140vh] origin-center -rotate-[24deg] blur-[40px] opacity-45 bg-gradient-to-b from-white/70 via-stone-200/35 to-transparent"
      />
      {/* Sheen Bar 3 */}
      <div
        ref={bar3Ref}
        className="absolute -top-[25vh] left-[76vw] w-[34vw] h-[140vh] origin-center -rotate-[24deg] blur-[40px] opacity-55 bg-gradient-to-b from-white/85 via-slate-200/45 to-transparent"
      />
    </div>
  );
}
