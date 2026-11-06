"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PinnedScene } from "@/components/motion/PinnedScene";
import { Accent } from "@/components/ui/accent";
import { GlassCard } from "@/components/ui/GlassCard";
import { PillButton } from "@/components/ui/PillButton";
import { PhoneMockup, PhoneScreenHome } from "./phone";
import { Reveal } from "@/components/motion/Reveal";
import { LandingData } from "@/server/landing-data";
import { calculateEmi } from "@/lib/emi";
import { formatINR } from "@/lib/money";
import { gsap } from "@/lib/motion/register";
import { Check, ArrowRight, Car, Calendar, KeyRound } from "lucide-react";

export interface BookingStepsProps {
  data: LandingData;
}

export function BookingSteps({ data }: BookingStepsProps) {
  const { emiDefaults, heroModel } = data;

  // Real interactive EMI calculator state
  const [loanAmount, setLoanAmount] = useState(emiDefaults.principal || 996000);
  const [tenureMonths, setTenureMonths] = useState(emiDefaults.tenureMonths || 60);
  const [ratePct, setRatePct] = useState(emiDefaults.ratePct || 8.5);

  const monthlyEmi = calculateEmi(loanAmount, ratePct, tenureMonths);

  const buildScene = (tl: gsap.core.Timeline) => {
    const phone = "#booking-phone";
    const leftCard = "#booking-left-card";
    const rightCard = "#booking-right-card";

    // Initial state
    gsap.set(phone, { y: "30vh", rotate: 3, opacity: 0 });
    gsap.set(leftCard, { x: "-8vw", opacity: 0 });
    gsap.set(rightCard, { x: "8vw", opacity: 0 });

    // 0 - 0.7: Elements enter
    tl.to(
      phone,
      {
        y: "0vh",
        rotate: 0,
        opacity: 1,
        ease: "expo.out",
        duration: 0.6,
      },
      0
    )
      .to(
        leftCard,
        {
          x: "0vw",
          opacity: 1,
          ease: "expo.out",
          duration: 0.55,
        },
        0.08
      )
      .to(
        rightCard,
        {
          x: "0vw",
          opacity: 1,
          ease: "expo.out",
          duration: 0.55,
        },
        0.12
      );

    // 0.7 - 1.0: Subtle phone parallax over scene
    tl.to(
      phone,
      {
        yPercent: -3,
        ease: "none",
        duration: 0.3,
      },
      0.7
    );
  };

  return (
    <PinnedScene
      id="booking-steps"
      length={220}
      build={buildScene}
      className="relative w-full"
      stageClassName="stage flex flex-col justify-center items-center px-4 sm:px-8 overflow-hidden"
    >
      {/* Desktop Layout */}
      <div data-layer className="hidden lg:block w-full h-full pointer-events-none">
        <div className="stage-inner pointer-events-auto flex flex-col justify-between h-full w-full pt-1 pb-4">
          {/* Top-Left Headline */}
          <div
            id="booking-heading"
            data-layout="booking:heading"
            data-layout-kind="text"
            className="text-left max-w-sm sm:max-w-md lg:max-w-[420px] pointer-events-auto"
          >
            <span className="fs-micro font-bold uppercase tracking-wider text-accent-ink">
              Transparent Workflow
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-[calc(1.875rem+2px)] font-medium tracking-tight text-ink leading-tight mt-1 text-balance">
              Join Vrooma and simplify{" "}
              <Accent tone="accent">your car buying</Accent>
            </h2>
          </div>

          {/* 3-Column Center Stage (Left Steps, Center Phone, Right Dark EMI) */}
          <div className="grid grid-cols-12 gap-8 lg:gap-12 items-start mt-1 sm:mt-2 mb-auto pointer-events-auto">
            {/* Left GlassCard: Easy Booking 3 Steps */}
            <div id="booking-left-card" data-layout="booking:card-steps" data-layout-kind="card" className="col-span-4">
              <GlassCard className="p-4 sm:p-5 rounded-3xl border border-white/90 shadow-elevated space-y-3">
                <div>
                  <span className="fs-micro font-bold uppercase tracking-wider text-accent-ink">
                    3-Step Journey
                  </span>
                  <h3 className="fs-title font-bold text-ink">Easy booking</h3>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-dark text-white font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="fs-small font-bold text-ink">Pick a car</h4>
                      <p className="fs-small text-ink-soft mt-0.5">
                        New or certified used with official on-road price breakups.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-dark text-white font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="fs-small font-bold text-ink">Choose a slot</h4>
                      <p className="fs-small text-ink-soft mt-0.5">
                        Real showroom and workshop times. Zero phone tag.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-dark text-white font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="fs-small font-bold text-ink">Drive</h4>
                      <p className="fs-small text-ink-soft mt-0.5">
                        Your certified relationship manager meets you with keys ready.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-border/80">
                  <Link
                    href="/book/test-drive"
                    className="fs-small font-bold text-accent-ink hover:underline inline-flex items-center gap-1.5"
                  >
                    <span>Book demo drive online</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </GlassCard>
            </div>

            {/* Center Phone Mockup (Standard size --phone-w, aligned to cards top, bleeds off bottom cleanly) */}
            <div id="booking-phone" data-layout="booking:phone" data-layout-kind="phone" className="col-span-4 flex justify-center items-start">
              <PhoneMockup className="w-[var(--phone-w)] !h-auto">
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

            {/* Right Dark Card: Real EMI Calculator */}
            <div id="booking-right-card" data-layout="booking:card-emi" data-layout-kind="card" className="col-span-4">
              <div className="rounded-2xl sm:rounded-3xl bg-dark text-white p-3.5 sm:p-4 shadow-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="fs-micro uppercase font-bold text-accent tracking-wider">
                      Instant Financing
                    </span>
                    <h3 className="fs-title font-bold text-white">Plan your EMI</h3>
                  </div>
                  <span className="fs-micro bg-white/10 text-slate-300 px-2 py-0.5 rounded font-medium">
                    {emiDefaults.label}
                  </span>
                </div>

                {/* Sliders */}
                <div className="space-y-1.5 fs-small">
                  {/* Loan Amount Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between fs-small">
                      <span className="text-slate-400">Loan Amount</span>
                      <span className="font-bold text-white">{formatINR(loanAmount)}</span>
                    </div>
                    <input
                      type="range"
                      min={200000}
                      max={3000000}
                      step={25000}
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                      className="w-full accent-accent cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Tenure Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between fs-small">
                      <span className="text-slate-400">Tenure</span>
                      <span className="font-bold text-white">
                        {tenureMonths} Months ({Math.round(tenureMonths / 12)} yrs)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={84}
                      step={12}
                      value={tenureMonths}
                      onChange={(e) => setTenureMonths(Number(e.target.value))}
                      className="w-full accent-accent cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Interest Rate */}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-slate-400 fs-small">Interest Rate (p.a.)</span>
                    <div className="flex items-center gap-1 text-white font-bold">
                      <span>{ratePct}%</span>
                      <span className="fs-micro text-slate-400 font-normal">(indicative)</span>
                    </div>
                  </div>
                </div>

                {/* Monthly EMI Result */}
                <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-2 text-center">
                  <span className="fs-micro text-slate-400 uppercase tracking-wider block">
                    Estimated Monthly Instalment
                  </span>
                  <span
                    aria-live="polite"
                    className="text-lg sm:text-xl font-black text-accent block mt-0.5"
                  >
                    {formatINR(monthlyEmi)} <span className="fs-micro font-normal text-slate-300">/ month</span>
                  </span>
                </div>

                {/* CTAs */}
                <div className="space-y-1 pt-0.5">
                  <PillButton asChild variant="secondary" showArrow className="w-full justify-center fs-small h-9 bg-white text-dark hover:bg-slate-100">
                    <Link href="/cars">Explore cars</Link>
                  </PillButton>
                  <div className="text-center">
                    <Link
                      href="/emi-calculator"
                      className="fs-micro text-slate-400 hover:text-white transition-colors underline"
                    >
                      View full amortisation schedule
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MOBILE STACKED VIEW */}
      {/* ============================================================ */}
      <div className="lg:hidden w-full px-4 sm:px-6 space-y-6 text-left">
        <Reveal>
          <div className="space-y-2">
            <span className="fs-micro font-bold uppercase tracking-wider text-accent-ink">
              Transparent Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink">
              Join Vrooma and simplify <Accent tone="accent">your car buying</Accent>
            </h2>
          </div>
        </Reveal>

        {/* Mobile Steps */}
        <GlassCard className="p-5 space-y-3">
          <h3 className="fs-title font-bold text-ink">3 Simple Steps</h3>
          <div className="space-y-2.5 fs-small">
            <div className="flex gap-2.5">
              <span className="font-bold text-dark">1.</span>
              <span className="text-ink-soft">Pick a car - new or certified used</span>
            </div>
            <div className="flex gap-2.5">
              <span className="font-bold text-dark">2.</span>
              <span className="text-ink-soft">Choose a slot - real times, no calls</span>
            </div>
            <div className="flex gap-2.5">
              <span className="font-bold text-dark">3.</span>
              <span className="text-ink-soft">Drive - your consultant meets you</span>
            </div>
          </div>
        </GlassCard>

        {/* Mobile Centered Phone Mockup */}
        <div className="flex justify-center my-2">
          <PhoneMockup className="w-[min(78vw,320px)] mx-auto !h-auto">
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

        {/* Mobile EMI Calculator */}
        <div className="rounded-2xl bg-dark text-white p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="fs-title font-bold text-white">Plan your EMI</h3>
            <span className="fs-micro text-slate-400 bg-white/10 px-2 py-0.5 rounded">
              indicative
            </span>
          </div>

          <div className="space-y-3 fs-small">
            <div className="space-y-1">
              <div className="flex justify-between fs-small">
                <span className="text-slate-400">Loan: {formatINR(loanAmount)}</span>
              </div>
              <input
                type="range"
                min={200000}
                max={3000000}
                step={25000}
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full accent-accent h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between fs-small">
                <span className="text-slate-400">Tenure: {tenureMonths} Months</span>
              </div>
              <input
                type="range"
                min={12}
                max={84}
                step={12}
                value={tenureMonths}
                onChange={(e) => setTenureMonths(Number(e.target.value))}
                className="w-full accent-accent h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="rounded-xl bg-white/10 p-3 text-center">
              <span className="fs-micro text-slate-300 block uppercase">Estimated EMI</span>
              <span aria-live="polite" className="text-xl font-black text-accent block mt-0.5">
                {formatINR(monthlyEmi)} / month
              </span>
            </div>

            <PillButton asChild variant="secondary" showArrow className="w-full bg-white text-dark min-h-[44px] h-11 fs-small">
              <Link href="/cars">Explore cars</Link>
            </PillButton>
          </div>
        </div>
      </div>
    </PinnedScene>
  );
}
