"use client";

import React, { useRef, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface MediaParallaxProps {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  aspectRatio?: string;
}

export function MediaParallax({
  src,
  alt,
  priority = false,
  className,
}: MediaParallaxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const canAnimate = () => {
    if (typeof window === "undefined") return false;
    const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const hasReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return hasFinePointer && !hasReducedMotion;
  };

  const handlePointerEnter = () => {
    if (!canAnimate() || !containerRef.current) return;
    containerRef.current.style.setProperty("--img-scale", "1.05");
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canAnimate() || !containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const rawMx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const rawMy = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    const mx = Math.max(-1, Math.min(1, rawMx));
    const my = Math.max(-1, Math.min(1, rawMy));

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      container.style.setProperty("--mx", mx.toFixed(3));
      container.style.setProperty("--my", my.toFixed(3));
    });
  };

  const handlePointerLeave = () => {
    if (!containerRef.current) return;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    const container = containerRef.current;
    container.style.setProperty("--mx", "0");
    container.style.setProperty("--my", "0");
    container.style.setProperty("--img-scale", "1");
  };

  return (
    <div
      ref={containerRef}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "relative w-full aspect-[16/9] overflow-hidden rounded-[var(--radius-md)] bg-ink/[0.03]",
        className
      )}
      style={
        {
          "--mx": "0",
          "--my": "0",
          "--img-scale": "1",
        } as React.CSSProperties
      }
    >
      <div
        className="w-full h-full relative will-change-transform"
        style={{
          transform:
            "translate3d(calc(var(--mx, 0) * -6px), calc(var(--my, 0) * -4px), 0) scale(var(--img-scale, 1))",
          transition: "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-contain p-2"
        />
      </div>
    </div>
  );
}
