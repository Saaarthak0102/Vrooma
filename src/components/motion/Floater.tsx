"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/motion/register";
import { REDUCED_QUERY } from "@/lib/motion/media";

export interface FloaterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  duration?: number;
  deltaY?: number;
  delay?: number;
}

export function Floater({
  children,
  duration = 3.6,
  deltaY = 10,
  delay = 0,
  className = "",
  ...props
}: FloaterProps) {
  const elRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = elRef.current;
      if (!el) return;

      const mm = gsap.matchMedia();

      mm.add(REDUCED_QUERY, () => {
        gsap.set(el, { y: 0 });
      });

      mm.add(`not all and ${REDUCED_QUERY}`, () => {
        const tween = gsap.to(el, {
          y: deltaY,
          duration,
          delay,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });

        ScrollTrigger.create({
          trigger: el,
          onEnter: () => tween.play(),
          onLeave: () => tween.pause(),
          onEnterBack: () => tween.play(),
          onLeaveBack: () => tween.pause(),
        });
      });

      return () => mm.revert();
    },
    { scope: elRef }
  );

  return (
    <div ref={elRef} className={className} {...props}>
      {children}
    </div>
  );
}
