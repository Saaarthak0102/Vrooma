"use client";

import React, { useRef } from "react";
import { Link } from "@/i18n/navigation";
import { PinnedScene } from "@/components/motion/PinnedScene";
import { GlassCard } from "@/components/ui/GlassCard";
import { Accent } from "@/components/ui/accent";
import { PillButton } from "@/components/ui/PillButton";
import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import { LandingData } from "@/server/landing-data";
import { formatINR } from "@/lib/money";
import { gsap, DrawSVGPlugin } from "@/lib/motion/register";
import { Check, Calendar, ShieldCheck, ArrowRight, Wrench } from "lucide-react";

export interface WhyVroomaProps {
  data: LandingData;
}

export function WhyVrooma({ data }: WhyVroomaProps) {
  const score = data.usedSample?.inspection?.score ?? 94;

  const buildScene = (tl: gsap.core.Timeline) => {
    const heading = "#why-heading";
    const cards = ".why-card";
    const scoreCircle = "#why-score-circle";
    const darkBar = "#why-dark-bar";
    const slotChips = ".why-slot-chip";
    const breakupRows = ".why-breakup-row";

    // Initial state
    gsap.set(heading, { scale: 1.1, y: "4vh" });
    gsap.set(cards, { y: 120, filter: "blur(12px)", opacity: 0 });
    gsap.set(darkBar, { y: 60, opacity: 0 });
    gsap.set(scoreCircle, { drawSVG: "0%" });
    gsap.set(slotChips, { scale: 0.8, opacity: 0 });
    gsap.set(breakupRows, { opacity: 0, x: -10 });

    // 0 - 0.5: Heading scale 1.5 -> 1 and y -> 0; cards rise to y 0, blur 0, opacity 1
    tl.to(
      heading,
      { scale: 1, y: 0, ease: "power2.inOut", duration: 0.5 },
      0
    ).to(
      cards,
      {
        y: 0,
        filter: "blur(0px)",
        opacity: 1,
        stagger: 0.12,
        duration: 0.45,
        ease: "expo.out",
        clearProps: "filter",
      },
      0.08
    );

    // 0.5 - 0.8: Mini-UIs animate: breakup rows tick in, slot chips pop, score circle draws
    tl.to(
      breakupRows,
      { opacity: 1, x: 0, stagger: 0.04, duration: 0.25, ease: "power2.out" },
      0.5
    )
      .to(
        slotChips,
        {
          scale: 1,
          opacity: 1,
          stagger: 0.05,
          duration: 0.25,
          ease: "back.out(1.6)",
        },
        0.52
      )
      .to(
        scoreCircle,
        {
          drawSVG: `${score}%`,
          duration: 0.3,
          ease: "power2.out",
        },
        0.54
      );

    // 0.8 - 1.0: Dark bar slides up
    tl.to(
      darkBar,
      { y: 0, opacity: 1, duration: 0.2, ease: "expo.out" },
      0.8
    );
  };

  return (
    <PinnedScene
      id="why-vrooma"
      length={160}
      build={buildScene}
      className="relative w-full"
      stageClassName="stage flex flex-col justify-center items-center px-4 sm:px-8"
    >
      {/* Desktop & Pinned Layout */}
      <div data-layer className="hidden lg:block w-full h-full pointer-events-none">
        <div className="stage-inner pointer-events-auto flex flex-col justify-between h-full w-full pt-2 pb-16">
          {/* Centred Large Heading */}
          <div
            id="why-heading"
            data-layout="why:heading"
            data-layout-kind="text"
            className="text-center space-y-1 max-w-3xl mx-auto origin-top"
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-ink leading-tight text-balance">
              Why choose Vrooma? Your <Accent tone="accent">honest</Accent> showroom
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft max-w-xl mx-auto">
              Traditional car buying is full of hidden quotes and endless phone calls. We built the opposite.
            </p>
          </div>

          {/* Three GlassCards */}
          <div className="grid grid-cols-3 gap-6 my-auto pt-4">
            {/* Card 1: Know the real price */}
            <GlassCard data-layout="why:card-1" data-layout-kind="card" className="why-card p-5 sm:p-6 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent-ink">
                  Pillar 01
                </span>
                <h3 className="text-base sm:text-lg font-bold text-ink">Know the real price</h3>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Every line of the on-road price, from the city you pick.
                </p>
              </div>

              {/* Mini Breakup */}
              <div className="rounded-xl bg-ink/[0.02] border border-border/70 p-2.5 sm:p-3 space-y-1.5 text-xs">
                <div className="space-y-1 text-[11px] text-ink-soft">
                  <div className="why-breakup-row flex justify-between">
                    <span>Ex-Showroom</span>
                    <span className="font-semibold text-ink">₹12,45,000</span>
                  </div>
                  <div className="why-breakup-row flex justify-between">
                    <span>RTO Road Tax (10%)</span>
                    <span className="font-semibold text-ink">₹1,24,500</span>
                  </div>
                  <div className="why-breakup-row flex justify-between">
                    <span>Comprehensive Insurance</span>
                    <span className="font-semibold text-ink">₹42,000</span>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-1.5 flex items-baseline justify-between">
                  <span className="text-[11px] font-bold text-ink">Total On-road</span>
                  <span className="text-sm font-black text-ink">
                    {data.heroModel.teaserOnRoad ? (
                      <CountUp value={data.heroModel.teaserOnRoad} isCurrency />
                    ) : (
                      "₹14,32,450"
                    )}
                  </span>
                </div>
                <p className="text-[9px] text-ink-mute leading-tight pt-0.5">
                  Valid until {data.heroModel.validUntil ?? "31 Dec 2026"} · Prices may change per government regulations.
                </p>
              </div>
            </GlassCard>

            {/* Card 2: Book a real slot */}
            <GlassCard data-layout="why:card-2" data-layout-kind="card" className="why-card p-5 sm:p-6 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent-ink">
                  Pillar 02
                </span>
                <h3 className="text-base sm:text-lg font-bold text-ink">Book a real slot</h3>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Pick a showroom, a demo car and a free time. No phone tag.
                </p>
              </div>

              {/* Slot chips */}
              <div className="rounded-xl bg-ink/[0.02] border border-border/70 p-2.5 sm:p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-ink">Hazratganj Flagship</span>
                  <span className="text-accent-ink font-bold text-[10px]">Demo Ready</span>
                </div>

                <div className="space-y-1.5 pt-0.5">
                  <div className="why-slot-chip rounded-lg bg-dark text-white p-2 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-accent" />
                      {data.nextSlot ? data.nextSlot.timeFormatted : "Today, 4:00 PM"}
                    </span>
                    <Check className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <div className="why-slot-chip rounded-lg bg-white border border-border p-2 flex items-center justify-between text-xs text-ink-soft">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-ink-mute" />
                      Tomorrow, 11:30 AM
                    </span>
                    <span className="text-[10px] font-bold text-accent-ink">Available</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Card 3: Buy used with proof */}
            <GlassCard data-layout="why:card-3" data-layout-kind="card" className="why-card p-5 sm:p-6 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent-ink">
                  Pillar 03
                </span>
                <h3 className="text-base sm:text-lg font-bold text-ink">Buy used with proof</h3>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Inspection report, owners and kilometres on every certified car.
                </p>
              </div>

              {/* Score Ring UI */}
              <div className="rounded-xl bg-ink/[0.02] border border-border/70 p-2.5 sm:p-3 flex items-center gap-4">
                {/* Circular SVG Ring */}
                <div className="relative h-14 w-14 shrink-0 flex items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72">
                    <circle
                      cx="36"
                      cy="36"
                      r="28"
                      stroke="#E2E8F0"
                      strokeWidth="6"
                      fill="none"
                    />
                    <circle
                      id="why-score-circle"
                      cx="36"
                      cy="36"
                      r="28"
                      stroke="var(--accent)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-black text-ink">
                      <CountUp value={score} />
                    </span>
                    <span className="text-[7px] uppercase font-bold text-ink-mute">/ 100</span>
                  </div>
                </div>

                <div className="text-left space-y-0.5">
                  <span className="text-xs font-bold text-ink flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-accent-ink" />
                    140-Point Certified
                  </span>
                  <p className="text-[10px] text-ink-mute leading-tight">
                    {data.usedSample?.model_name ?? "Model C"} · {data.usedSample?.year ?? 2022} · {data.usedSample?.owners ?? 1} owner
                  </p>
                  <span className="text-[9px] font-mono text-ink-soft block">
                    {data.usedSample?.reg_no_masked ?? "UP32 ** **** 4120"}
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Dark Bar at bottom */}
          <div
            id="why-dark-bar"
            data-layout="why:dark-bar"
            data-layout-kind="card"
            className="rounded-2xl bg-dark text-white p-4 sm:p-5 px-6 sm:px-8 flex items-center justify-between shadow-xl border border-white/10 max-w-[calc(100%-240px)]"
          >
            <div className="space-y-0.5">
              <h4 className="text-sm sm:text-base font-bold text-white">
                Own a Brand X? Book your service in a minute.
              </h4>
              <p className="text-xs text-slate-400">
                Choose a workshop and a free bay. Pick-up and drop available across Lucknow.
              </p>
            </div>
            <PillButton asChild variant="secondary" showArrow className="h-10 text-xs px-5 bg-white text-dark hover:bg-slate-100 shrink-0">
              <Link href="/book/service">Book service</Link>
            </PillButton>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MOBILE STACKED VIEW */}
      {/* ============================================================ */}
      <div className="lg:hidden w-full px-4 sm:px-6 space-y-6 text-left">
        <Reveal>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink">
              Why choose Vrooma? Your <Accent tone="accent">honest</Accent> showroom
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft">
              Transparent on-road pricing, guaranteed test drive slots, and DPDP-compliant used car dossiers.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="space-y-4">
          <GlassCard className="p-5 space-y-3">
            <h3 className="text-sm font-bold text-ink">Know the real price</h3>
            <p className="text-xs text-ink-soft">
              Every line of the on-road price, from the city you pick.
            </p>
            <div className="rounded-xl bg-ink/[0.02] border border-border p-3 space-y-1 text-xs">
              <div className="flex justify-between text-ink-soft">
                <span>Ex-showroom</span>
                <span className="font-semibold text-ink">₹12,45,000</span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Lucknow RTO (10%)</span>
                <span className="font-semibold text-ink">₹1,24,500</span>
              </div>
              <div className="border-t border-border pt-1 flex justify-between font-bold text-ink">
                <span>On-road Total</span>
                <span className="text-sm font-black">
                  {data.heroModel.teaserOnRoad ? formatINR(data.heroModel.teaserOnRoad) : "₹14,32,450"}
                </span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5 space-y-3">
            <h3 className="text-sm font-bold text-ink">Book a real slot</h3>
            <p className="text-xs text-ink-soft">
              Pick a showroom, a demo car and a free time. No phone tag.
            </p>
            <div className="rounded-xl bg-dark text-white p-3 flex items-center justify-between text-xs">
              <span>{data.nextSlot ? data.nextSlot.timeFormatted : "Today, 4:00 PM"}</span>
              <span className="text-[10px] font-bold text-accent">Confirmed Slot</span>
            </div>
          </GlassCard>

          <GlassCard className="p-5 space-y-3">
            <h3 className="text-sm font-bold text-ink">Buy used with proof</h3>
            <p className="text-xs text-ink-soft">
              Inspection report, owners and kilometres on every certified car.
            </p>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full border-4 border-accent flex items-center justify-center font-black text-xs">
                {score}
              </div>
              <div className="text-xs">
                <span className="font-bold text-ink block">140-Point Rigorous Check</span>
                <span className="font-mono text-ink-mute text-[10px]">
                  {data.usedSample?.reg_no_masked ?? "UP32 ** **** 4120"}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Mobile Dark Bar */}
          <div className="rounded-2xl bg-dark text-white p-5 space-y-3">
            <div>
              <h4 className="text-sm font-bold text-white">
                Own a Brand X? Book your service in a minute.
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Choose a workshop and a free bay.
              </p>
            </div>
            <PillButton asChild variant="secondary" showArrow className="w-full text-xs bg-white text-dark h-10">
              <Link href="/book/service">Book service</Link>
            </PillButton>
          </div>
        </Reveal>
      </div>
    </PinnedScene>
  );
}
