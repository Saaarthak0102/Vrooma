"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ShrinkScene } from "./ShrinkScene";
import { Accent } from "@/components/ui/accent";
import { GlassCard } from "@/components/ui/GlassCard";
import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import { LandingData } from "@/server/landing-data";
import { formatINR } from "@/lib/money";
import { gsap } from "@/lib/motion/register";
import { ArrowRight, Calendar, ShieldCheck, Calculator } from "lucide-react";
import { APPROVED_VEHICLE_ASSETS } from "@/constants/vehicle-assets";

export interface TransparentPricingProps {
  data: LandingData;
}

export function TransparentPricing({ data }: TransparentPricingProps) {
  const { heroModel } = data;

  const buildDesktopTimeline = (tl: gsap.core.Timeline) => {
    const carA = "#pricing-car-a";
    const carB = "#pricing-car-b";
    const heading = "#pricing-heading";
    const cards = ".pricing-card";

    // Initial state
    gsap.set(carA, { x: "-30vw", rotate: -14, opacity: 0 });
    gsap.set(carB, { x: "30vw", rotate: 14, opacity: 0 });
    gsap.set(heading, { scale: 1, x: 0, y: 0 });
    gsap.set(cards, { y: 80, filter: "blur(10px)", opacity: 0 });

    // 0 - 0.35: Cars fly in from outside and settle
    tl.to(
      carA,
      {
        x: "0vw",
        rotate: -9,
        opacity: 1,
        ease: "power2.inOut",
        duration: 0.35,
      },
      0
    ).to(
      carB,
      {
        x: "0vw",
        rotate: 7,
        opacity: 1,
        ease: "power2.inOut",
        duration: 0.35,
      },
      0
    );

    // 0.35 - 0.70: Heading moves top-centre and scales to 0.55; cars shrink to 0.45 and move to upper edges
    tl.to(
      heading,
      {
        scale: 0.65,
        y: "-26vh",
        ease: "power2.inOut",
        duration: 0.35,
      },
      0.35
    )
      .to(
        carA,
        {
          scale: 0.45,
          x: "-24vw",
          y: "-22vh",
          ease: "power2.inOut",
          duration: 0.35,
        },
        0.35
      )
      .to(
        carB,
        {
          scale: 0.45,
          x: "24vw",
          y: "-22vh",
          ease: "power2.inOut",
          duration: 0.35,
        },
        0.35
      );

    // 0.70 - 1.0: Three GlassCards rise from bottom
    tl.to(
      cards,
      {
        y: 0,
        filter: "blur(0px)",
        opacity: 1,
        stagger: 0.1,
        duration: 0.3,
        ease: "expo.out",
        clearProps: "filter",
      },
      0.7
    );
  };

  return (
    <ShrinkScene
      id="transparent-pricing"
      length={280}
      buildDesktopTimeline={buildDesktopTimeline}
      desktopContent={
        <div className="relative h-full w-full flex items-center justify-center">
          {/* Heading: Left-aligned 3 lines */}
          <div
            id="pricing-heading"
            data-layout="pricing:heading"
            data-layout-kind="text"
            className="absolute top-[28vh] left-0 max-w-xl text-left origin-top-left z-20 pointer-events-auto"
          >
            <span className="fs-micro font-bold uppercase tracking-wider text-accent-ink">
              Official Price Engine
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-[calc(3rem+2px)] font-medium tracking-tight text-ink leading-[1.08] mt-2 text-balance">
              On-road prices <br />
              <Accent tone="mute">without</Accent> <br />
              hidden charges
            </h2>
          </div>

          {/* Car Cutout A (Lower-left tilted -9deg with perspective) */}
          <div
            id="pricing-car-a"
            data-layout="pricing:car-a"
            data-layout-kind="car"
            className="absolute bottom-[6vh] left-0 w-[38vw] max-w-[560px] pointer-events-none select-none z-10"
            style={{ perspective: "1200px" }}
          >
            <div
              aria-hidden="true"
              className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[85%] h-6 rounded-[100%] bg-black/30 blur-md"
            />
            <div className="relative aspect-[2/1] w-full">
              <Image
                src={APPROVED_VEHICLE_ASSETS.c}
                alt="Model C SUV profile in white"
                fill
                sizes="(min-width: 1024px) 38vw, 100vw"
                className="object-contain"
              />
            </div>
          </div>

          {/* Car Cutout B (Top-right tilted +7deg with perspective) */}
          <div
            id="pricing-car-b"
            data-layout="pricing:car-b"
            data-layout-kind="car"
            className="absolute top-[12vh] right-[4vw] w-[36vw] max-w-[520px] pointer-events-none select-none z-10"
            style={{ perspective: "1200px" }}
          >
            <div
              aria-hidden="true"
              className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[85%] h-6 rounded-[100%] bg-black/30 blur-md"
            />
            <div className="relative aspect-[2/1] w-full">
              <Image
                src={APPROVED_VEHICLE_ASSETS.x}
                alt="Model X EV Fastback profile"
                fill
                sizes="(min-width: 1024px) 36vw, 100vw"
                className="object-contain"
              />
            </div>
          </div>

          {/* Three GlassCards Rising */}
          <div className="absolute bottom-[4vh] w-full grid grid-cols-3 gap-6 z-30 pointer-events-auto">
            {/* Card 1: Every line shown */}
            <GlassCard data-layout="pricing:card-1" data-layout-kind="card" className="pricing-card p-5 lg:p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-full bg-accent/15 text-accent-ink flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h3 className="fs-title font-bold text-ink">Every line shown</h3>
                <p className="fs-small sm:fs-body text-ink-soft leading-relaxed">
                  Road tax, registration, insurance and handling, itemised.
                </p>
              </div>

              <div className="rounded-xl bg-ink/[0.02] border border-border p-3 space-y-1.5 fs-small">
                <span className="fs-micro text-ink-mute uppercase font-semibold block">
                  Lucknow On-Road Teaser
                </span>
                <span className="text-sm sm:text-base font-black text-ink block">
                  {heroModel.teaserOnRoad ? (
                    <>From <CountUp value={heroModel.teaserOnRoad} isCurrency /></>
                  ) : (
                    "Contact showroom"
                  )}
                </span>
                <span className="fs-micro text-ink-mute block leading-tight">
                  {heroModel.validUntil
                    ? `Valid until ${heroModel.validUntil} · Prices may change`
                    : "Official verified rule"}
                </span>
              </div>

              <Link
                href={`/cars/${heroModel.slug}`}
                className="inline-flex items-center gap-1.5 fs-small font-bold text-accent-ink hover:underline pt-1"
              >
                <span>See a full breakup</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </GlassCard>

            {/* Card 2: Valid-until date */}
            <GlassCard data-layout="pricing:card-2" data-layout-kind="card" className="pricing-card p-5 lg:p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-full bg-accent/15 text-accent-ink flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
                <h3 className="fs-title font-bold text-ink">Valid-until date</h3>
                <p className="fs-small sm:fs-body text-ink-soft leading-relaxed">
                  Each price tells you when it was last updated and until when it holds.
                </p>
              </div>

              <div className="rounded-xl bg-ink/[0.02] border border-border p-3 fs-small text-ink-soft space-y-1">
                <span className="fs-micro uppercase font-bold text-ink-mute block">
                  Government Rate Guarantee
                </span>
                <p className="fs-small leading-relaxed text-ink font-medium">
                  RTO tax brackets & insurance premiums locked until date of order invoice.
                </p>
              </div>

              <span className="fs-micro text-ink-mute font-medium">
                Updated weekly from admin tables
              </span>
            </GlassCard>

            {/* Card 3: EMI up front */}
            <GlassCard data-layout="pricing:card-3" data-layout-kind="card" className="pricing-card p-5 lg:p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-full bg-accent/15 text-accent-ink flex items-center justify-center">
                  <Calculator className="h-4 w-4" />
                </div>
                <h3 className="fs-title font-bold text-ink">EMI up front</h3>
                <p className="fs-small sm:fs-body text-ink-soft leading-relaxed">
                  See your monthly instalment before you talk to anyone.
                </p>
              </div>

              <div className="rounded-xl bg-ink/[0.02] border border-border p-3 fs-small space-y-1">
                <span className="fs-micro text-ink-mute uppercase font-bold block">
                  Indicative Monthly Loan
                </span>
                <span className="text-sm sm:text-base font-black text-ink block">
                  ₹{data.emiDefaults.monthlyEmi.toLocaleString("en-IN")} / month
                </span>
                <span className="fs-micro text-ink-mute block">
                  80% financing @ 8.5% over 5 years
                </span>
              </div>

              <Link
                href="/emi-calculator"
                className="inline-flex items-center gap-1.5 fs-small font-bold text-accent-ink hover:underline pt-1"
              >
                <span>Open EMI Calculator</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </GlassCard>
          </div>
        </div>
      }
      mobileContent={
        <div className="space-y-6">
          <Reveal>
            <div className="space-y-2">
              <span className="fs-micro font-bold uppercase tracking-wider text-accent-ink">
                Official Price Engine
              </span>
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink leading-tight text-balance">
                On-road prices <Accent tone="mute">without</Accent> hidden charges
              </h2>
            </div>
          </Reveal>

          {/* Mobile Car Image */}
          <div className="relative aspect-[2/1] w-full max-w-sm mx-auto">
            <div
              aria-hidden="true"
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[85%] h-5 rounded-[100%] bg-black/25 blur-sm"
            />
            <Image
              src={APPROVED_VEHICLE_ASSETS.c}
              alt="Model C SUV profile"
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          <div className="space-y-4">
            <GlassCard className="p-5 space-y-3">
              <h3 className="fs-title font-bold text-ink">Every line shown</h3>
              <p className="fs-small text-ink-soft">
                Road tax, registration, insurance and handling, itemised.
              </p>
              <div className="rounded-xl bg-ink/[0.02] border border-border p-3 fs-small">
                <span className="fs-small font-bold text-ink block">
                  {heroModel.teaserOnRoad ? `On-road from ${formatINR(heroModel.teaserOnRoad)} in Lucknow` : "Contact showroom"}
                </span>
                <span className="fs-micro text-ink-mute block mt-0.5">
                  Valid until {heroModel.validUntil ?? "31 Dec 2026"} · Prices may change
                </span>
              </div>
              <Link
                href={`/cars/${heroModel.slug}`}
                className="fs-small font-bold text-accent-ink inline-flex items-center gap-1 min-h-[44px]"
              >
                <span>See a full breakup</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </GlassCard>

            <GlassCard className="p-5 space-y-3">
              <h3 className="fs-title font-bold text-ink">Valid-until date</h3>
              <p className="fs-small text-ink-soft">
                Each price tells you when it was last updated and until when it holds.
              </p>
            </GlassCard>

            <GlassCard className="p-5 space-y-3">
              <h3 className="fs-title font-bold text-ink">EMI up front</h3>
              <p className="fs-small text-ink-soft">
                See your monthly instalment before you talk to anyone.
              </p>
              <Link
                href="/emi-calculator"
                className="fs-small font-bold text-accent-ink inline-flex items-center gap-1 min-h-[44px]"
              >
                <span>Calculate your EMI</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </GlassCard>
          </div>
        </div>
      }
    />
  );
}
