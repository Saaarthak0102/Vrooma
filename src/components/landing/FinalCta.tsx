"use client";

import React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { PinnedScene } from "@/components/motion/PinnedScene";
import { Accent } from "@/components/ui/accent";
import { PillButton } from "@/components/ui/PillButton";
import { PhoneMockup, PhoneScreenHome } from "./phone";
import { Reveal } from "@/components/motion/Reveal";
import { LandingData } from "@/server/landing-data";
import { gsap, DrawSVGPlugin, MotionPathPlugin } from "@/lib/motion/register";
import { MapPin, ArrowRight } from "lucide-react";

export interface FinalCtaProps {
  data: LandingData;
}

export function FinalCta({ data }: FinalCtaProps) {
  const { heroModel } = data;

  const buildScene = (tl: gsap.core.Timeline) => {
    const route = "#final-route-path";
    const pin = "#final-pin-follower";
    const car = "#final-car-img";

    gsap.set(route, { drawSVG: "0%" });

    // 0.0 - 0.7: Path draws with DrawSVG while pin icon travels along the curve
    tl.to(
      route,
      {
        drawSVG: "100%",
        ease: "none",
        duration: 0.7,
      },
      0
    ).to(
      pin,
      {
        motionPath: {
          path: route,
          align: route,
          alignOrigin: [0.5, 0.5],
          autoRotate: false,
        },
        ease: "none",
        duration: 0.7,
      },
      0
    );

    // 0.7 - 1.0: Car subtle emphasis scale
    tl.to(
      car,
      {
        scale: 1.04,
        ease: "power2.out",
        duration: 0.3,
      },
      0.7
    );
  };

  return (
    <PinnedScene
      id="final-cta"
      length={140}
      build={buildScene}
      className="relative w-full overflow-hidden"
      stageClassName="stage flex flex-col justify-center items-center px-4 sm:px-8"
    >
      {/* Desktop Pinned Layout */}
      <div data-layer className="hidden lg:flex flex-col justify-between h-full max-w-7xl mx-auto py-12 w-full pointer-events-none">
        {/* Header & Primary CTA */}
        <div className="text-center space-y-4 max-w-2xl mx-auto pointer-events-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent-ink">
            Instant Test Drive
          </span>
          <h2 className="text-4xl sm:text-5xl font-medium tracking-tight text-ink leading-tight">
            Your next car is <Accent tone="mute">a tap away</Accent>
          </h2>
          <p className="text-sm text-ink-soft">
            Select your showroom, choose your demo car, and meet your consultant with zero dealership games.
          </p>
          <div className="pt-2">
            <PillButton asChild variant="primary" showArrow className="h-12 px-8 text-sm">
              <Link href="/book/test-drive">Book a test drive</Link>
            </PillButton>
          </div>
        </div>

        {/* Center Stage: Phone on Left, Car on Right, Animated Route Between */}
        <div className="relative w-full h-[45vh] flex items-center justify-between px-12 my-auto pointer-events-auto">
          {/* Small PhoneMockup Left */}
          <div className="shrink-0 -rotate-3 select-none">
            <PhoneMockup className="w-[230px]">
              <PhoneScreenHome
                modelName={heroModel.name}
                variantName={heroModel.variantName}
                onRoadPrice={heroModel.teaserOnRoad}
                validUntil={heroModel.validUntil ?? "31 Dec 2026"}
                nextSlotTime={data.nextSlot?.timeFormatted ?? "Today, 4:00 PM"}
                nextShowroom={data.nextSlot?.showroomName ?? "Hazratganj Flagship"}
              />
            </PhoneMockup>
          </div>

          {/* SVG Route Connector */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 1000 400"
              fill="none"
            >
              <path
                id="final-route-path"
                d="M 280 200 C 420 80 620 320 760 210"
                stroke="var(--accent)"
                strokeWidth="4"
                strokeDasharray="8 8"
                strokeLinecap="round"
              />
            </svg>

            {/* Map-pin Icon that travels along the motion path */}
            <div
              id="final-pin-follower"
              className="absolute h-9 w-9 rounded-full bg-dark text-accent flex items-center justify-center shadow-lg border border-accent/40"
              style={{ transform: "translate(-50%, -50%)" }}
            >
              <MapPin className="h-4 w-4 fill-accent stroke-dark" />
            </div>
          </div>

          {/* Car Cutout Right */}
          <div
            id="final-car-img"
            className="w-[42vw] max-w-[620px] select-none shrink-0"
          >
            <div
              aria-hidden="true"
              className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[85%] h-6 rounded-[100%] bg-black/25 blur-md"
            />
            <div className="relative aspect-[2/1] w-full">
              <Image
                src="/images/cars/final-car.svg"
                alt="Model H premium sedan profile"
                fill
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="object-contain"
              />
            </div>
          </div>
        </div>

        {/* Small footer reassurance text */}
        <div className="text-center text-xs text-ink-mute pointer-events-auto">
          No obligation · Home test drives available in Lucknow & Kanpur · DPDP Act 2023 Compliant
        </div>
      </div>

      {/* ============================================================ */}
      {/* MOBILE STACKED VIEW */}
      {/* ============================================================ */}
      <div className="lg:hidden w-full px-4 sm:px-6 space-y-6 text-center">
        <Reveal>
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent-ink">
              Instant Test Drive
            </span>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-ink">
              Your next car is <Accent tone="mute">a tap away</Accent>
            </h2>
            <p className="text-xs text-ink-soft max-w-sm mx-auto">
              Select your showroom, choose your demo car, and meet your consultant with zero dealership games.
            </p>
          </div>
        </Reveal>

        <div className="relative aspect-[2/1] w-full max-w-md mx-auto select-none">
          <Image
            src="/images/cars/final-car.svg"
            alt="Model H premium sedan profile"
            fill
            sizes="100vw"
            className="object-contain"
          />
        </div>

        <Reveal delay={0.1}>
          <div className="space-y-3">
            <PillButton asChild variant="primary" showArrow className="w-full sm:w-auto h-12 text-sm px-8">
              <Link href="/book/test-drive">Book a test drive</Link>
            </PillButton>
            <p className="text-[11px] text-ink-mute">
              No obligation · 5-minute consultant response SLA
            </p>
          </div>
        </Reveal>
      </div>
    </PinnedScene>
  );
}
