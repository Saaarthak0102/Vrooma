"use client";

import React from "react";
import { FlipCard, FlipCardProps } from "@/components/ui/flip-card";

export interface ListingFlipCardProps
  extends Omit<
    FlipCardProps,
    | "tilt"
    | "glare"
    | "hoverScale"
    | "draggable"
    | "flipOnClick"
    | "axis"
    | "stiffness"
    | "damping"
    | "perspective"
    | "shadow"
    | "shadowColor"
    | "shadowOpacity"
    | "radius"
  > {
  // Allow optional overrides if explicitly provided
  tilt?: boolean;
  glare?: boolean;
  hoverScale?: number;
  draggable?: boolean;
  flipOnClick?: boolean;
  axis?: "x" | "y";
  stiffness?: number;
  damping?: number;
  perspective?: number;
  shadow?: boolean;
  shadowColor?: string;
  shadowOpacity?: number;
  radius?: number;
}

export function ListingFlipCard({
  tilt = false,
  glare = false,
  hoverScale = 1,
  draggable = false,
  flipOnClick = true,
  axis = "y",
  stiffness = 200,
  damping = 26,
  perspective = 1200,
  shadow = true,
  shadowColor = "#0F1720",
  shadowOpacity = 0.1,
  radius = 24,
  ...props
}: ListingFlipCardProps) {
  return (
    <FlipCard
      tilt={tilt}
      glare={glare}
      hoverScale={hoverScale}
      draggable={draggable}
      flipOnClick={flipOnClick}
      axis={axis}
      stiffness={stiffness}
      damping={damping}
      perspective={perspective}
      shadow={shadow}
      shadowColor={shadowColor}
      shadowOpacity={shadowOpacity}
      radius={radius}
      {...props}
    />
  );
}
