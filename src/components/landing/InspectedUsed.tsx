"use client";

import React from "react";
import { Link } from "@/i18n/navigation";
import { ShrinkScene } from "./ShrinkScene";
import { Accent } from "@/components/ui/accent";
import { GlassCard } from "@/components/ui/GlassCard";
import { Reveal } from "@/components/motion/Reveal";
import { LandingData } from "@/server/landing-data";
import { formatINR } from "@/lib/money";
import { gsap } from "@/lib/motion/register";
import { ShieldCheck, CheckCircle2, Lock, ArrowRight, FileText } from "lucide-react";

export interface InspectedUsedProps {
  data: LandingData;
}

export function InspectedUsed({ data }: InspectedUsedProps) {
  const { usedSample } = data;

  const buildDesktopTimeline = (tl: gsap.core.Timeline) => {
    const badge = "#inspected-badge";
    const heading = "#inspected-heading";
    const leftCard = "#inspected-left-card";
    const rightCard = "#inspected-right-card";

    // Initial state
    gsap.set(badge, { scale: 1, y: 0 });
    gsap.set(heading, { scale: 1, y: 0 });
    gsap.set(leftCard, { x: "-60vw", opacity: 0 });
    gsap.set(rightCard, { x: "60vw", opacity: 0 });

    // 0 - 0.5: Badge scale 1 -> 0.6, y -6vh; heading scale -> 0.75
    tl.to(
      badge,
      {
        scale: 0.65,
        y: "-6vh",
        ease: "power2.inOut",
        duration: 0.5,
      },
      0
    ).to(
      heading,
      {
        scale: 0.75,
        y: "-4vh",
        ease: "power2.inOut",
        duration: 0.5,
      },
      0
    );

    // 0.5 - 1.0: Two GlassCards slide in from the sides
    tl.to(
      leftCard,
      {
        x: "0vw",
        opacity: 1,
        ease: "expo.out",
        duration: 0.45,
      },
      0.5
    ).to(
      rightCard,
      {
        x: "0vw",
        opacity: 1,
        ease: "expo.out",
        duration: 0.45,
      },
      0.55
    );

    // D5 Requested Fade-out: Fade out badge & heading during first 60% of card entrance
    tl.to(
      [badge, heading],
      {
        opacity: 0,
        ease: "none",
        duration: 0.27,
      },
      0.5
    );
  };

  const checks = usedSample?.inspection?.checks?.slice(0, 4) ?? [
    { category: "Engine", item: "Compression & oil leak check", status: "pass" },
    { category: "Transmission", item: "Gear shifts & clutch response", status: "pass" },
    { category: "Suspension", item: "Front struts & tie rod ends", status: "pass" },
    { category: "Electricals", item: "Climate control & cooling coil", status: "pass" },
  ];

  return (
    <ShrinkScene
      id="inspected-used"
      length={260}
      buildDesktopTimeline={buildDesktopTimeline}
      desktopContent={
        <div className="relative h-full w-full flex flex-col items-center justify-center">
          {/* Badge & Heading Group (Centred at top) */}
          <div className="flex flex-col items-center justify-center text-center z-10 pointer-events-auto">
            {/* Layered SVG InspectedBadge */}
            <div
              id="inspected-badge"
              data-layout="inspected:badge"
              data-layout-kind="orb"
              className="relative h-28 w-28 flex items-center justify-center mb-12"
            >
              <svg className="w-full h-full drop-shadow-lg" viewBox="0 0 100 110" fill="none">
                <defs>
                  <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#E3F7EE" />
                    <stop offset="50%" stopColor="#1FBF75" />
                    <stop offset="100%" stopColor="#0B8F56" />
                  </linearGradient>
                  <linearGradient id="shieldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#0B8F56" />
                  </linearGradient>
                </defs>
                {/* Shield Body */}
                <path
                  d="M 50 5 L 88 20 C 88 65 50 100 50 100 C 50 100 12 65 12 20 Z"
                  fill="url(#shieldGrad)"
                  stroke="url(#shieldBorder)"
                  strokeWidth="3"
                />
                {/* Checkmark in shield */}
                <path
                  d="M 34 50 L 46 62 L 68 38"
                  stroke="#FFFFFF"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div id="inspected-heading" data-layout="inspected:heading" data-layout-kind="text">
              <span className="fs-micro font-bold uppercase tracking-wider text-accent-ink">
                Certified Quality Assurance
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-[calc(3rem+2px)] font-medium tracking-tight text-ink leading-tight mt-1 text-balance">
                Every used car, <Accent tone="accent">inspected</Accent>
              </h2>
            </div>
          </div>

          {/* Two Sliding Side Cards */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 max-w-5xl mx-auto grid grid-cols-2 gap-12 z-30 pointer-events-auto items-stretch">
            {/* Left Card: Inspection Report */}
            <div id="inspected-left-card" data-layout="inspected:card-left" data-layout-kind="card" className="h-full">
              <GlassCard className="h-full flex flex-col justify-between p-5 sm:p-6 rounded-3xl border border-white/90 shadow-elevated space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-accent/15 text-accent-ink flex items-center justify-center">
                        <FileText className="h-4 w-4" />
                      </div>
                      <h3 className="fs-title font-bold text-ink">Inspection report</h3>
                    </div>
                    <span className="fs-micro font-mono font-bold bg-ink/5 px-2 py-0.5 rounded text-ink-mute">
                      {usedSample?.stock_id ?? "UC-1182"}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <h4 className="fs-small sm:fs-body font-bold text-ink">
                      {usedSample?.model_name ?? "Model C"} {usedSample?.variant_name ?? "VX Turbo"}
                    </h4>
                    <p className="fs-small text-ink-soft">
                      {usedSample?.year ?? 2022} · {usedSample?.owners ?? 1} owner(s) · {usedSample?.km?.toLocaleString("en-IN") ?? "41,200"} km
                    </p>
                    <span className="text-base sm:text-lg font-black text-ink block pt-0.5">
                      {usedSample?.price ? formatINR(usedSample.price) : "₹8,45,000"}
                    </span>
                  </div>

                  {/* Checklist Rows with Ticks */}
                  <div className="rounded-xl bg-ink/[0.02] border border-border p-2.5 space-y-1.5 fs-small">
                    {checks.map((chk, i) => (
                      <div key={i} className="flex items-center justify-between fs-small">
                        <span className="text-ink-soft truncate max-w-[220px]">{chk.item}</span>
                        <span className="flex items-center gap-1 fs-micro font-bold text-emerald-700 shrink-0">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Pass
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href={`/used-cars/${usedSample?.stock_id ?? "UC-1182"}`}
                  className="inline-flex items-center gap-1.5 fs-small font-bold text-accent-ink hover:underline pt-2"
                >
                  <span>View the car dossier</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </GlassCard>
            </div>

            {/* Right Card: Your details stay yours (DPDP Compliance) */}
            <div id="inspected-right-card" data-layout="inspected:card-right" data-layout-kind="card" className="h-full">
              <GlassCard className="h-full flex flex-col justify-between p-5 sm:p-6 rounded-3xl border border-white/90 shadow-elevated space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-dark text-white flex items-center justify-center">
                      <Lock className="h-4 w-4" />
                    </div>
                    <h3 className="fs-title font-bold text-ink">Your details stay yours</h3>
                  </div>

                  <p className="fs-small sm:fs-body text-ink-soft leading-relaxed">
                    We mask vehicle registration plates across public listings to safeguard past owner identities under the Digital Personal Data Protection (DPDP) Act 2023.
                  </p>

                  {/* Masked Registration Plate Chip */}
                  <div className="rounded-xl bg-white border border-border/80 p-3 shadow-sm text-center space-y-1">
                    <span className="fs-micro uppercase font-bold text-ink-mute tracking-wider block">
                      Public Masked Registration Plate
                    </span>
                    <span className="font-mono text-base font-bold tracking-widest text-ink block bg-ink/[0.04] py-1 px-3 rounded-lg border border-dashed border-ink/20">
                      {usedSample?.reg_no_masked ?? "UP32 ** **** 4120"}
                    </span>
                    <span className="fs-micro text-ink-mute block pt-0.5">
                      Full RTO dossier verified by Vrooma Legal Desk
                    </span>
                  </div>
                </div>

                <div className="space-y-1 fs-small text-ink-soft pt-2">
                  <p className="fs-micro leading-relaxed">
                    We ask for consent first and you can opt out any time.
                  </p>
                  <Link
                    href="/legal/data-rights"
                    className="inline-flex items-center gap-1.5 fs-small font-bold text-accent-ink hover:underline pt-0.5"
                  >
                    <span>Read your DPDP Data Rights</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      }
      mobileContent={
        <div className="space-y-6">
          <Reveal>
            <div className="space-y-2 text-center">
              <div className="h-16 w-16 mx-auto mb-2 flex items-center justify-center">
                <ShieldCheck className="h-12 w-12 text-accent-ink" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink leading-tight text-balance">
                Every used car, <Accent tone="accent">inspected</Accent>
              </h2>
            </div>
          </Reveal>

          <div className="space-y-4">
            <GlassCard className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="fs-title font-bold text-ink">Inspection report</h3>
                <span className="fs-micro font-mono font-bold bg-ink/5 px-2 py-0.5 rounded text-ink-mute">
                  {usedSample?.stock_id ?? "UC-1182"}
                </span>
              </div>
              <div className="fs-small text-ink-soft">
                <span className="font-bold text-ink block">
                  {usedSample?.model_name ?? "Model C"} {usedSample?.variant_name ?? "VX Turbo"}
                </span>
                <span>
                  {usedSample?.year ?? 2022} · {usedSample?.owners ?? 1} owner(s) · {usedSample?.km?.toLocaleString("en-IN") ?? "41,200"} km
                </span>
                <span className="text-sm sm:text-base font-black text-ink block mt-1">
                  {usedSample?.price ? formatINR(usedSample.price) : "₹8,45,000"}
                </span>
              </div>
              <Link
                href={`/used-cars/${usedSample?.stock_id ?? "UC-1182"}`}
                className="fs-small font-bold text-accent-ink inline-flex items-center gap-1 min-h-[44px]"
              >
                <span>View certified car</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </GlassCard>

            <GlassCard className="p-5 space-y-3">
              <h3 className="fs-title font-bold text-ink">Your details stay yours</h3>
              <p className="fs-small text-ink-soft">
                Vehicle registration numbers are masked for DPDP Act 2023 privacy.
              </p>
              <div className="p-2.5 rounded-lg bg-ink/5 border border-dashed border-ink/20 text-center font-mono font-bold text-sm sm:text-base tracking-wider">
                {usedSample?.reg_no_masked ?? "UP32 ** **** 4120"}
              </div>
              <p className="fs-micro text-ink-mute">
                We ask for consent first and you can opt out any time.
              </p>
              <Link
                href="/legal/data-rights"
                className="fs-small font-bold text-accent-ink inline-flex items-center gap-1 min-h-[44px]"
              >
                <span>Data rights & opt-out</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </GlassCard>
          </div>
        </div>
      }
    />
  );
}

