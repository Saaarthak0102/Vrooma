"use client";

import React from "react";
import { Link } from "@/i18n/navigation";
import { ShrinkScene } from "./ShrinkScene";
import { Accent } from "@/components/ui/accent";
import { GlassCard } from "@/components/ui/GlassCard";
import { Floater } from "@/components/motion/Floater";
import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import { LandingData, LocationChipData } from "@/server/landing-data";
import { gsap } from "@/lib/motion/register";
import { MapPin, Wrench, Car, Tag, ArrowRight } from "lucide-react";

export interface ShowroomsOrbitProps {
  data: LandingData;
}

// 6 Target percentage positions on the stage
const CHIP_TARGETS = [
  { top: "14%", left: "8%" },
  { top: "46%", left: "6%" },
  { top: "76%", left: "10%" },
  { top: "16%", left: "68%" },
  { top: "46%", left: "72%" },
  { top: "78%", left: "64%" },
];

export function ShowroomsOrbit({ data }: ShowroomsOrbitProps) {
  const { locations, stats } = data;

  const getLocationIcon = (type: LocationChipData["type"]) => {
    switch (type) {
      case "workshop":
        return Wrench;
      case "yard":
        return Tag;
      default:
        return Car;
    }
  };

  const buildDesktopTimeline = (tl: gsap.core.Timeline) => {
    const orb = "#orbit-orb";
    const heading = "#orbit-heading";
    const chips = ".orbit-location-chip";
    const noteCard = "#orbit-note-card";
    const statsItems = ".orbit-stat-item";

    // Initial setup
    gsap.set(orb, { scale: 1, x: "-18vw", y: 0 });
    gsap.set(heading, { scale: 1, x: 0 });
    gsap.set(chips, { scale: 0.3, opacity: 0 });
    gsap.set(noteCard, { y: 80, opacity: 0 });
    gsap.set(statsItems, { opacity: 0, y: 15 });

    // 0 - 0.45: Orb shrinks and moves to centre; heading scales; chips fly out
    tl.to(
      orb,
      {
        scale: 0.62,
        x: "0vw",
        ease: "power2.inOut",
        duration: 0.45,
      },
      0
    )
      .to(
        heading,
        {
          scale: 0.8,
          y: "-12vh",
          ease: "power2.inOut",
          duration: 0.45,
        },
        0
      )
      .to(
        chips,
        {
          scale: 1,
          opacity: 1,
          stagger: 0.06,
          ease: "expo.out",
          duration: 0.4,
        },
        0.12
      );

    // 0.45 - 0.75: Note card rises from bottom
    tl.to(
      noteCard,
      {
        y: 0,
        opacity: 1,
        ease: "expo.out",
        duration: 0.3,
      },
      0.45
    );

    // 0.75 - 1.0: Stats items reveal & count up
    tl.to(
      statsItems,
      {
        opacity: 1,
        y: 0,
        stagger: 0.05,
        ease: "power2.out",
        duration: 0.25,
      },
      0.75
    );
  };

  return (
    <ShrinkScene
      id="showrooms-orbit"
      length={260}
      buildDesktopTimeline={buildDesktopTimeline}
      desktopContent={
        <div className="relative h-full w-full flex items-center justify-center">
          {/* Heading Right */}
          <div
            id="orbit-heading"
            className="absolute top-[16vh] right-[6vw] max-w-md text-right origin-right z-20 pointer-events-auto"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent-ink">
              Our Territory
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-ink leading-[1.12] mt-1">
              Close to you, <br />
              <Accent tone="mute">wherever</Accent> you are
            </h2>
          </div>

          {/* Orb: Stylized Map Disc SVG */}
          <div
            id="orbit-orb"
            className="relative h-[52vh] aspect-square rounded-full flex items-center justify-center pointer-events-none z-10"
          >
            <div className="absolute inset-0 rounded-full bg-white/70 border border-white/80 shadow-[0_20px_50px_rgba(15,23,32,0.06)] backdrop-blur-md overflow-hidden flex items-center justify-center">
              {/* Geometric map grid and radar circles */}
              <svg className="w-full h-full opacity-60" viewBox="0 0 400 400" fill="none">
                <circle cx="200" cy="200" r="180" stroke="var(--border)" strokeWidth="1" />
                <circle cx="200" cy="200" r="130" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                <circle cx="200" cy="200" r="80" stroke="var(--border)" strokeWidth="1" />
                <line x1="20" y1="200" x2="380" y2="200" stroke="var(--border)" strokeWidth="1" />
                <line x1="200" y1="20" x2="200" y2="380" stroke="var(--border)" strokeWidth="1" />
                {/* Lucknow & Gomti river stylized contour */}
                <path
                  d="M 60 260 C 140 220 220 270 340 160"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  opacity="0.35"
                />
                {/* Pulsing center radar beacon */}
                <circle cx="200" cy="200" r="12" fill="var(--accent)" opacity="0.2" />
                <circle cx="200" cy="200" r="5" fill="var(--accent-ink)" />
              </svg>
            </div>
          </div>

          {/* Floating Location Chips (Fly out from center) */}
          {locations.slice(0, 6).map((loc, idx) => {
            const target = CHIP_TARGETS[idx] || CHIP_TARGETS[0];
            const Icon = getLocationIcon(loc.type);
            return (
              <div
                key={loc.id}
                className="orbit-location-chip absolute z-30 pointer-events-auto"
                style={{ top: target.top, left: target.left }}
              >
                <Floater duration={3.4 + idx * 0.3} deltaY={idx % 2 === 0 ? 8 : -8}>
                  <Link
                    href={`/showrooms#${loc.slug}`}
                    className="glass-card px-3.5 py-2 rounded-pill flex items-center gap-2 border border-white/90 shadow-card hover:border-accent hover:shadow-md transition-all text-xs text-ink block"
                  >
                    <div className="h-6 w-6 rounded-full bg-accent/15 text-accent-ink flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-ink block leading-tight">{loc.name}</span>
                      <span className="text-[9px] text-ink-mute uppercase font-semibold">{loc.city}</span>
                    </div>
                  </Link>
                </Floater>
              </div>
            );
          })}

          {/* Bottom Note Card & Stats Row */}
          <div
            id="orbit-note-card"
            className="absolute bottom-[4vh] w-full max-w-3xl z-30 pointer-events-auto"
          >
            <GlassCard className="p-6 rounded-3xl border border-white/90 shadow-elevated space-y-4">
              <p className="text-xs sm:text-sm text-ink-soft leading-relaxed text-center">
                Vrooma is an authorised Brand X dealer in Lucknow & Kanpur, operating{" "}
                <strong className="text-ink font-semibold">{stats.showrooms} showrooms</strong>,{" "}
                <strong className="text-ink font-semibold">{stats.workshops} workshops</strong>, and a dedicated certified used-car yard with a specialized team of{" "}
                <strong className="text-ink font-semibold">{stats.staff} staff</strong>.
              </p>

              {/* Stats Row Counting Up */}
              <div className="grid grid-cols-4 gap-4 pt-3 border-t border-border/80 text-center">
                <div className="orbit-stat-item">
                  <span className="text-2xl font-black text-ink block">
                    <CountUp value={stats.showrooms} />
                  </span>
                  <span className="text-[10px] text-ink-mute uppercase font-bold tracking-wider">
                    Showrooms
                  </span>
                </div>
                <div className="orbit-stat-item">
                  <span className="text-2xl font-black text-ink block">
                    <CountUp value={stats.workshops} />
                  </span>
                  <span className="text-[10px] text-ink-mute uppercase font-bold tracking-wider">
                    Workshops
                  </span>
                </div>
                <div className="orbit-stat-item">
                  <span className="text-2xl font-black text-ink block">
                    <CountUp value={stats.usedCars} />
                  </span>
                  <span className="text-[10px] text-ink-mute uppercase font-bold tracking-wider">
                    Used In Stock
                  </span>
                </div>
                <div className="orbit-stat-item">
                  <span className="text-2xl font-black text-ink block">
                    ~<CountUp value={stats.newCarsYear} />
                  </span>
                  <span className="text-[10px] text-ink-mute uppercase font-bold tracking-wider">
                    Cars / Year
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      }
      mobileContent={
        <div className="space-y-6">
          <Reveal>
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent-ink">
                Our Territory
              </span>
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink">
                Close to you, <Accent tone="mute">wherever</Accent> you are
              </h2>
            </div>
          </Reveal>

          {/* Static Mobile Orb disc */}
          <div className="h-44 w-44 mx-auto rounded-full bg-white/80 border border-border flex items-center justify-center p-4 shadow-sm">
            <svg className="w-full h-full opacity-60" viewBox="0 0 200 200" fill="none">
              <circle cx="100" cy="100" r="90" stroke="var(--border)" strokeWidth="1" />
              <circle cx="100" cy="100" r="50" stroke="var(--border)" strokeWidth="1" />
              <circle cx="100" cy="100" r="6" fill="var(--accent-ink)" />
            </svg>
          </div>

          {/* 2-Column Mobile Grid of Locations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {locations.slice(0, 6).map((loc) => {
              const Icon = getLocationIcon(loc.type);
              return (
                <Link
                  key={loc.id}
                  href={`/showrooms#${loc.slug}`}
                  className="glass-card p-3 rounded-xl flex items-center gap-2.5 border border-white text-xs hover:border-accent transition-colors"
                >
                  <div className="h-6 w-6 rounded-full bg-accent/15 text-accent-ink flex items-center justify-center shrink-0">
                    <Icon className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="font-bold text-ink block leading-tight">{loc.name}</span>
                    <span className="text-[9px] text-ink-mute uppercase">{loc.city}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Note Card Below */}
          <GlassCard className="p-5 space-y-4">
            <p className="text-xs text-ink-soft leading-relaxed">
              Vrooma is an authorised Brand X dealer in Lucknow & Kanpur, operating {stats.showrooms} showrooms, {stats.workshops} workshops, and a team of {stats.staff} professionals.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-t border-border pt-3">
              <div>
                <span className="text-lg font-black text-ink block">{stats.showrooms}</span>
                <span className="text-[9px] text-ink-mute uppercase">Showrooms</span>
              </div>
              <div>
                <span className="text-lg font-black text-ink block">{stats.workshops}</span>
                <span className="text-[9px] text-ink-mute uppercase">Workshops</span>
              </div>
              <div>
                <span className="text-lg font-black text-ink block">{stats.usedCars}</span>
                <span className="text-[9px] text-ink-mute uppercase">Used In Stock</span>
              </div>
              <div>
                <span className="text-lg font-black text-ink block">~{stats.newCarsYear.toLocaleString("en-IN")}</span>
                <span className="text-[9px] text-ink-mute uppercase">Cars / Year</span>
              </div>
            </div>
          </GlassCard>
        </div>
      }
    />
  );
}
