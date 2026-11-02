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
      <div data-layer className="hidden lg:block w-full h-full pointer-events-none">
        <div className="stage-inner pointer-events-auto">
          {/* Left Column: PhoneMockup */}
          <div
            data-layout="final:phone"
            data-layout-kind="phone"
            className="absolute left-0 top-1/2 -translate-y-1/2 select-none shrink-0 pointer-events-auto"
          >
            <PhoneMockup className="!h-[clamp(340px,68svh,500px)] !w-auto aspect-[9/19.5]">
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
          <div className="absolute inset-0 pointer-events-none">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 1000 600"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                id="final-route-path"
                d="M 240 300 C 380 300, 540 450, 660 440"
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

          {/* Right Column: Stacked text content */}
          <div
            className="absolute left-[clamp(340px,28vw,420px)] right-0 top-2 space-y-3 pointer-events-auto"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent-ink block">
              Instant Test Drive
            </span>
            <h2
              id="final-heading"
              data-layout="final:heading"
              data-layout-kind="text"
              className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-ink leading-tight text-balance"
            >
              Your next car is <Accent tone="mute">a tap away</Accent>
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft max-w-lg leading-relaxed">
              Select your showroom, choose your demo car, and meet your consultant with zero dealership games.
            </p>
            <div className="pt-1">
              <PillButton asChild variant="primary" showArrow className="h-11 px-7 text-sm">
                <Link href="/book/test-drive">Book a test drive</Link>
              </PillButton>
            </div>
            <p
              id="final-footnote"
              data-layout="final:footnote"
              data-layout-kind="text"
              className="text-[11px] text-ink-mute pt-1"
            >
              No spam. Unsubscribe in one click. DPDP Act 2023 Compliant.
            </p>
          </div>

          {/* Car Cutout Bottom-Right */}
          <div
            id="final-car-img"
            data-layout="final:car"
            data-layout-kind="car"
            style={{ bottom: "90px" }}
            className="absolute right-0 w-[clamp(280px,32vw,440px)] select-none shrink-0 pointer-events-auto"
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
                sizes="(min-width: 1024px) 34vw, 100vw"
                className="object-contain"
              />
            </div>
          </div>
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
