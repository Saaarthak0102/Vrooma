"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion/register";
import { REDUCED_QUERY } from "@/lib/motion/media";

export interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  stagger?: number;
  y?: number;
  blur?: number;
  delay?: number;
}

export function Reveal({
  children,
  stagger = 0.1,
  y = 28,
  blur = 8,
  delay = 0,
  className = "",
  ...props
}: RevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = containerRef.current;
      if (!el) return;

      const mm = gsap.matchMedia();

      mm.add(REDUCED_QUERY, () => {
        gsap.set(el, { opacity: 1, y: 0, filter: "none" });
      });

      mm.add(`not all and ${REDUCED_QUERY}`, () => {
        gsap.fromTo(
          el,
          {
            opacity: 0,
            y,
            filter: `blur(${blur}px)`,
          },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.8,
            ease: "expo.out",
            delay,
            clearProps: "filter",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              once: true,
            },
          }
        );
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className={className} {...props}>
      {children}
    </div>
  );
}
