"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion/register";
import { formatINR } from "@/lib/money";
import { REDUCED_QUERY } from "@/lib/motion/media";

export interface CountUpProps {
  value: number;
  duration?: number;
  isCurrency?: boolean;
  prefix?: string;
  suffix?: string;
  className?: string;
}

function formatNumberIndian(val: number): string {
  const rounded = Math.round(val);
  const str = rounded.toString();
  if (str.length <= 3) return str;
  const lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);
  const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${formattedOther},${lastThree}`;
}

export function CountUp({
  value,
  duration = 1.4,
  isCurrency = false,
  prefix = "",
  suffix = "",
  className = "",
}: CountUpProps) {
  const spanRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = spanRef.current;
      if (!el) return;

      const format = (v: number) => {
        if (isCurrency) {
          return `${prefix}${formatINR(v)}${suffix}`;
        }
        return `${prefix}${formatNumberIndian(v)}${suffix}`;
      };

      const mm = gsap.matchMedia();

      mm.add(REDUCED_QUERY, () => {
        el.textContent = format(value);
      });

      mm.add(`not all and ${REDUCED_QUERY}`, () => {
        const state = { current: 0 };
        gsap.to(state, {
          current: value,
          duration,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            once: true,
          },
          onUpdate: () => {
            el.textContent = format(state.current);
          },
        });
      });

      return () => mm.revert();
    },
    { scope: spanRef, dependencies: [value] }
  );

  const initialDisplay = isCurrency
    ? `${prefix}${formatINR(value)}${suffix}`
    : `${prefix}${formatNumberIndian(value)}${suffix}`;

  return (
    <span ref={spanRef} className={className}>
      {initialDisplay}
    </span>
  );
}
