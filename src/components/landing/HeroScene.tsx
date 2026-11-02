"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { PinnedScene } from "@/components/motion/PinnedScene";
import { Words } from "@/components/motion/Words";
import { Accent } from "@/components/ui/accent";
import { PillButton } from "@/components/ui/PillButton";
import { Floater } from "@/components/motion/Floater";
import {
  PhoneMockup,
  PhoneScreenHome,
  PhoneScreenPrice,
  PhoneScreenSlots,
  PhoneScreenUsed,
  PhoneScreenService,
} from "./phone";
import { LandingData } from "@/server/landing-data";
import { formatINR } from "@/lib/money";
import { gsap, DrawSVGPlugin, MotionPathPlugin } from "@/lib/motion/register";
import {
  Clock,
  Sparkles,
  CheckCircle2,
  PhoneCall,
  Calendar,
  ShieldCheck,
  Wrench,
  ChevronDown,
  MapPin,
} from "lucide-react";

export interface HeroSceneProps {
  data: LandingData;
}

export function HeroScene({ data }: HeroSceneProps) {
  const tCommon = useTranslations("common");
  const [mobileStep, setMobileStep] = useState(0);

  // Client-side idle refresh for next free slot
  const [liveSlot, setLiveSlot] = useState(data.nextSlot);

  useEffect(() => {
    let cancelled = false;
    const refreshSlot = async () => {
      try {
        const res = await fetch("/api/slots?next=1");
        const json = await res.json();
        if (!cancelled && json.ok && json.data) {
          setLiveSlot(json.data);
        }
      } catch {
        // Keep initial server-rendered slot if fetch fails
      }
    };

    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => refreshSlot());
    } else {
      setTimeout(refreshSlot, 1200);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const accordionSteps = [
    {
      id: "price-row",
      title: "Real on-road price",
      desc: "Pick your city and see every line of the price, with a valid-until date.",
      icon: Sparkles,
    },
    {
      id: "slots-row",
      title: "Test drive in 3 taps",
      desc: "Choose a showroom, a demo car and a real free slot.",
      icon: Calendar,
    },
    {
      id: "used-row",
      title: "Certified used cars",
      desc: "Year, owners and kilometres on every car. Registration is always masked.",
      icon: ShieldCheck,
    },
    {
      id: "service-row",
      title: "Service in a minute",
      desc: "Pick a workshop and a time with a free bay.",
      icon: Wrench,
    },
  ];

  const buildScene = (tl: gsap.core.Timeline) => {
    // Stage layers
    const heroH1 = "#hero-h1-group";
    const heroBody = "#hero-body-group";
    const heroCar = "#hero-car-wrapper";
    const phone = "#hero-phone-wrapper";
    const heroChips = ".hero-floater-chip";

    const h2Group = "#hero-h2-group";
    const rows = ".hero-accordion-row";
    const confChips = ".hero-confirmation-chip";

    const screenPrice = "#screen-price";
    const screenSlots = "#screen-slots";
    const screenUsed = "#screen-used";
    const screenService = "#screen-service";

    // Initial setup for pinned desktop
    gsap.set(h2Group, { opacity: 0, x: -60 });
    gsap.set(rows, { opacity: 0, x: -40, filter: "blur(8px)" });
    gsap.set(confChips, { scale: 0.6, opacity: 0 });

    gsap.set(screenSlots, { opacity: 0, y: 12 });
    gsap.set(screenUsed, { opacity: 0, y: 12 });
    gsap.set(screenService, { opacity: 0, y: 12 });

    // Initial route draw near accent phrase
    const routePath = "#hero-svg-route";
    if (document.querySelector(routePath)) {
      gsap.fromTo(
        routePath,
        { drawSVG: "0%" },
        { drawSVG: "100%", duration: 1.1, delay: 0.3, ease: "power2.out" }
      );
    }

    // Scroll timeline (normalized 0..1)
    // 0.00-0.12: Hero exit
    tl.to(
      heroH1,
      { yPercent: -40, opacity: 0, ease: "power2.inOut", duration: 0.12 },
      0
    )
      .to(
        heroBody,
        { opacity: 0, y: -20, ease: "power2.inOut", duration: 0.1 },
        0.02
      )
      .to(
        heroChips,
        { opacity: 0, scale: 0.8, ease: "power2.inOut", duration: 0.08 },
        0
      )
      .to(
        heroCar,
        {
          x: "35vw",
          y: "8vh",
          rotate: 6,
          opacity: 0,
          ease: "power2.inOut",
          duration: 0.12,
        },
        0
      )
      .to(
        phone,
        {
          x: "24vw",
          scale: 1.06,
          rotate: 0,
          ease: "power2.inOut",
          duration: 0.14,
        },
        0
      );

    // 0.10-0.26: H2 enters + rows stagger in + confirmation chips pop
    tl.to(
      h2Group,
      { opacity: 1, x: 0, ease: "expo.out", duration: 0.12 },
      0.1
    )
      .to(
        rows,
        {
          x: 0,
          opacity: 1,
          filter: "blur(0px)",
          stagger: 0.04,
          duration: 0.12,
          ease: "expo.out",
        },
        0.12
      )
      .to(
        confChips,
        {
          scale: 1,
          opacity: 1,
          stagger: 0.05,
          duration: 0.12,
          ease: "back.out(1.6)",
        },
        0.16
      );

    // 0.26-1.00: 4 equal steps (0.185 each)
    // Step 0: Row 0 open by default, cross-fade to screenPrice (0.26 - 0.445)
    tl.to("#row-desc-0", { height: "auto", opacity: 1, duration: 0.08 }, 0.26)
      .to("#row-icon-0", { color: "var(--accent-ink)", duration: 0.08 }, 0.26)
      .to(screenPrice, { opacity: 1, y: 0, duration: 0.06 }, 0.26);

    // Step 1: Row 1 opens, Row 0 closes, cross-fade to screenSlots (0.445 - 0.63)
    tl.to("#row-desc-0", { height: 0, opacity: 0, duration: 0.06 }, 0.445)
      .to("#row-icon-0", { color: "var(--ink-mute)", duration: 0.06 }, 0.445)
      .to("#row-desc-1", { height: "auto", opacity: 1, duration: 0.08 }, 0.45)
      .to("#row-icon-1", { color: "var(--accent-ink)", duration: 0.08 }, 0.45)
      .to(screenPrice, { opacity: 0, y: -12, duration: 0.05 }, 0.445)
      .to(screenSlots, { opacity: 1, y: 0, duration: 0.06 }, 0.455);

    // Step 2: Row 2 opens, Row 1 closes, cross-fade to screenUsed (0.63 - 0.815)
    tl.to("#row-desc-1", { height: 0, opacity: 0, duration: 0.06 }, 0.63)
      .to("#row-icon-1", { color: "var(--ink-mute)", duration: 0.06 }, 0.63)
      .to("#row-desc-2", { height: "auto", opacity: 1, duration: 0.08 }, 0.635)
      .to("#row-icon-2", { color: "var(--accent-ink)", duration: 0.08 }, 0.635)
      .to(screenSlots, { opacity: 0, y: -12, duration: 0.05 }, 0.63)
      .to(screenUsed, { opacity: 1, y: 0, duration: 0.06 }, 0.64);

    // Step 3: Row 3 opens, Row 2 closes, cross-fade to screenService (0.815 - 0.94)
    tl.to("#row-desc-2", { height: 0, opacity: 0, duration: 0.06 }, 0.815)
      .to("#row-icon-2", { color: "var(--ink-mute)", duration: 0.06 }, 0.815)
      .to("#row-desc-3", { height: "auto", opacity: 1, duration: 0.08 }, 0.82)
      .to("#row-icon-3", { color: "var(--accent-ink)", duration: 0.08 }, 0.82)
      .to(screenUsed, { opacity: 0, y: -12, duration: 0.05 }, 0.815)
      .to(screenService, { opacity: 1, y: 0, duration: 0.06 }, 0.825);

    // 0.94-1.00: Translate up 6vh and hand off to WhyVrooma
    tl.to(
      [phone, h2Group, ".hero-accordion-container", confChips],
      { y: "-6vh", opacity: 0.25, ease: "power2.inOut", duration: 0.06 },
      0.94
    );
  };

  return (
    <PinnedScene
      id="hero-scene"
      length={450}
      build={buildScene}
      className="relative w-full"
      stageClassName="stage flex items-center justify-center"
    >
      {/* ============================================================ */}
      {/* DESKTOP PINNED LAYERS (data-layer) */}
      {/* ============================================================ */}

      {/* Layer 0: Load State (H1, Car cutout, CTA text, Floater chips) */}
      <div data-layer className="hidden lg:block z-20 pointer-events-none">
        <div className="relative h-full w-full max-w-7xl mx-auto px-8 pt-10">
          {/* H1 Headline across top */}
          <div id="hero-h1-group" className="max-w-4xl pointer-events-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-[4.2rem] font-medium tracking-tight text-ink leading-[1.05]">
              <Words text="Vrooma: your next car," />{" "}
              <span className="inline-block relative">
                <Accent tone="mute">booked in minutes</Accent>
                <svg
                  className="absolute -bottom-2 left-0 w-full h-4 overflow-visible pointer-events-none"
                  viewBox="0 0 240 16"
                  fill="none"
                >
                  <path
                    id="hero-svg-route"
                    d="M 4 12 Q 120 2 236 8"
                    stroke="var(--accent)"
                    strokeWidth="3"
                    strokeDasharray="4 4"
                  />
                </svg>
              </span>
            </h1>
          </div>

          {/* Hero Subline + CTAs above car on right */}
          <div
            id="hero-body-group"
            className="absolute top-[28vh] left-[42vw] max-w-md pointer-events-auto space-y-5"
          >
            <p className="text-base sm:text-lg text-ink-soft leading-relaxed font-normal">
              Real on-road prices, EMI and test-drive slots for Brand X in Lucknow. A named consultant replies within 5 minutes.
            </p>
            <div className="flex items-center gap-3">
              <PillButton asChild variant="primary" showArrow className="h-11 px-7 text-xs">
                <Link href="/book/test-drive">Book a test drive</Link>
              </PillButton>
              <PillButton asChild variant="secondary" className="h-11 px-6 text-xs">
                <Link href="/cars">Browse cars</Link>
              </PillButton>
            </div>
          </div>

          {/* Floater Chip (a): Next Free Slot */}
          <div className="hero-floater-chip absolute top-[44vh] left-[34vw] z-30 pointer-events-auto">
            <Floater duration={3.8} deltaY={-8}>
              <div className="glass-card px-4 py-2.5 rounded-pill flex items-center gap-2.5 shadow-card border border-white/80">
                <div className="h-7 w-7 rounded-full bg-accent/15 text-accent-ink flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold text-ink-mute tracking-wider block">
                    Next Free Slot
                  </span>
                  <span className="text-xs font-bold text-ink">
                    {liveSlot
                      ? `${liveSlot.timeFormatted} · ${liveSlot.showroomName}`
                      : "Today, 4:00 PM · Hazratganj"}
                  </span>
                </div>
              </div>
            </Floater>
          </div>

          {/* Floater Chip (b): Teaser On-road Lucknow */}
          <div className="hero-floater-chip absolute top-[58vh] right-[6vw] z-30 pointer-events-auto">
            <Floater duration={4.2} deltaY={10} delay={0.6}>
              <div className="glass-card px-4 py-3 rounded-2xl shadow-card border border-white/80 max-w-[220px]">
                <span className="text-[10px] font-bold uppercase text-accent-ink tracking-wider block">
                  Lucknow On-Road
                </span>
                <span className="text-sm font-black text-ink block mt-0.5">
                  {data.heroModel.teaserOnRoad
                    ? `From ${formatINR(data.heroModel.teaserOnRoad)}`
                    : "Contact showroom"}
                </span>
                <span className="text-[9px] text-ink-mute block mt-1 leading-tight">
                  {data.heroModel.validUntil
                    ? `Valid until ${data.heroModel.validUntil} · Prices may change`
                    : "Subject to government RTO"}
                </span>
              </div>
            </Floater>
          </div>

          {/* Hero Car Cutout bottom-right with CSS Contact Shadow */}
          <div
            id="hero-car-wrapper"
            className="absolute bottom-[-2vh] right-[-4vw] w-[46vw] max-w-[780px] pointer-events-auto select-none"
          >
            {/* CSS Contact Shadow (radial gradient ellipse, NOT baked into image) */}
            <div
              aria-hidden="true"
              className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[85%] h-8 rounded-[100%] bg-black/35 blur-md"
            />
            <div className="relative aspect-[2/1] w-full">
              <Image
                src="/images/cars/hero-model-h.svg"
                alt="Model H ZX automatic in white"
                fill
                priority
                sizes="(min-width: 1024px) 46vw, 100vw"
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Layer 1: Phone Mockup (bottom-left, cut off by bottom, rotated -2deg) */}
      <div
        id="hero-phone-wrapper"
        data-layer
        className="hidden lg:flex items-end justify-start pl-[6vw] pb-[-8vh] z-10 pointer-events-none origin-bottom-left"
        style={{ transform: "rotate(-2deg)" }}
      >
        <div className="pointer-events-auto relative">
          <PhoneMockup>
            {/* Screen 0: Price Screen */}
            <div id="screen-price" className="absolute inset-0 p-3 pt-8">
              <PhoneScreenPrice
                variantName={`${data.heroModel.name} ${data.heroModel.variantName}`}
                exShowroom={data.heroModel.exShowroom}
                total={data.heroModel.teaserOnRoad ?? 1459450}
                validUntil={data.heroModel.validUntil ?? "31 Dec 2026"}
              />
            </div>
            {/* Screen 1: Slots Screen */}
            <div id="screen-slots" className="absolute inset-0 p-3 pt-8">
              <PhoneScreenSlots
                carName={`${data.heroModel.name} ${data.heroModel.variantName}`}
                showroomName={data.locations[0]?.name ?? "Hazratganj Flagship"}
              />
            </div>
            {/* Screen 2: Used Car Screen */}
            <div id="screen-used" className="absolute inset-0 p-3 pt-8">
              <PhoneScreenUsed
                stockId={data.usedSample?.stock_id ?? "UC-1182"}
                modelName={data.usedSample?.model_name ?? "Model C"}
                variantName={data.usedSample?.variant_name ?? "VX Turbo Diesel"}
                year={data.usedSample?.year ?? 2022}
                km={data.usedSample?.km ?? 41200}
                owners={data.usedSample?.owners ?? 1}
                price={data.usedSample?.price ?? 845000}
                regMasked={data.usedSample?.reg_no_masked ?? "UP32 ** **** 4120"}
                score={data.usedSample?.inspection?.score ?? 94}
              />
            </div>
            {/* Screen 3: Service Screen */}
            <div id="screen-service" className="absolute inset-0 p-3 pt-8">
              <PhoneScreenService
                workshopName={data.locations.find((l) => l.type === "workshop")?.name ?? "Central Workshop Transport Nagar"}
                baysAvailable={16}
              />
            </div>
          </PhoneMockup>
        </div>
      </div>

      {/* Layer 2: Accordion rows + H2 + confirmation floaters (enters during scroll) */}
      <div data-layer className="hidden lg:block z-30 pointer-events-none">
        <div className="relative h-full w-full max-w-7xl mx-auto px-8 pt-16 flex justify-end">
          <div className="w-[50vw] max-w-xl pointer-events-auto space-y-6">
            {/* H2 Title */}
            <div id="hero-h2-group">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-ink leading-[1.1]">
                Everything you&apos;d call us for,{" "}
                <Accent tone="accent">in a few taps</Accent>
              </h2>
            </div>

            {/* Accordion Rows Container */}
            <div className="hero-accordion-container space-y-3 pt-2">
              {accordionSteps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.id}
                    className="hero-accordion-row glass-card p-4 rounded-2xl border border-white/80 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        id={`row-icon-${idx}`}
                        className="h-9 w-9 rounded-full bg-ink/5 flex items-center justify-center text-ink-mute transition-colors"
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-bold text-ink">{step.title}</h4>
                    </div>
                    {/* Scrubbed height tween target on desktop */}
                    <div
                      id={`row-desc-${idx}`}
                      className="overflow-hidden h-0 opacity-0 pl-12 text-xs text-ink-soft leading-relaxed"
                    >
                      <p className="pt-2">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Two Floater Confirmation Chips */}
            <div className="flex items-center gap-3 pt-2">
              <div className="hero-confirmation-chip glass-card px-3.5 py-2 rounded-pill flex items-center gap-2 border border-accent/30 shadow-sm bg-accent/10">
                <CheckCircle2 className="h-4 w-4 text-accent-ink" />
                <span className="text-xs font-bold text-accent-ink">Booked</span>
              </div>
              <div className="hero-confirmation-chip glass-card px-3.5 py-2 rounded-pill flex items-center gap-2 border border-white shadow-sm">
                <PhoneCall className="h-3.5 w-3.5 text-ink-mute" />
                <span className="text-xs text-ink-soft font-semibold">
                  Consultant will contact you within 5 minutes
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MOBILE / REDUCED-MOTION STACKED LAYOUT (Screen < 1024px) */}
      {/* ============================================================ */}
      <div className="lg:hidden w-full px-4 sm:px-6 space-y-8 text-left">
        {/* Mobile Hero Headline */}
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-ink leading-[1.12]">
            Vrooma: your next car,{" "}
            <Accent tone="mute">booked in minutes</Accent>
          </h1>
          <p className="text-sm sm:text-base text-ink-soft leading-relaxed">
            Real on-road prices, EMI and test-drive slots for Brand X in Lucknow. A named consultant replies within 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <PillButton asChild variant="primary" showArrow className="w-full sm:w-auto h-11 text-xs">
              <Link href="/book/test-drive">Book a test drive</Link>
            </PillButton>
            <PillButton asChild variant="secondary" className="w-full sm:w-auto h-11 text-xs">
              <Link href="/cars">Browse cars</Link>
            </PillButton>
          </div>
        </div>

        {/* Mobile Chips */}
        <div className="flex flex-wrap gap-2.5">
          <div className="glass-card px-3.5 py-2 rounded-pill flex items-center gap-2 text-xs">
            <Clock className="h-3.5 w-3.5 text-accent-ink" />
            <span className="font-semibold text-ink">
              {liveSlot ? liveSlot.timeFormatted : "Today, 4:00 PM"}
            </span>
          </div>
          <div className="glass-card px-3.5 py-2 rounded-pill flex items-center gap-2 text-xs">
            <span className="text-accent-ink font-bold">On-road from:</span>
            <span className="font-bold text-ink">
              {data.heroModel.teaserOnRoad ? formatINR(data.heroModel.teaserOnRoad) : "Contact showroom"}
            </span>
          </div>
        </div>

        {/* Mobile Car Silhouette */}
        <div className="relative aspect-[2/1] w-full max-w-lg mx-auto select-none">
          <div
            aria-hidden="true"
            className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[85%] h-6 rounded-[100%] bg-black/25 blur-sm"
          />
          <Image
            src="/images/cars/hero-model-h.svg"
            alt="Model H ZX automatic in white"
            fill
            priority
            sizes="100vw"
            className="object-contain"
          />
        </div>

        {/* Mobile Tap-Accordion (Interactive on mobile/tablet) */}
        <div className="space-y-4 pt-6 border-t border-border/80">
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink">
            Everything you&apos;d call us for,{" "}
            <Accent tone="accent">in a few taps</Accent>
          </h2>

          <div className="space-y-2">
            {accordionSteps.map((step, idx) => {
              const Icon = step.icon;
              const isExpanded = mobileStep === idx;
              return (
                <div
                  key={step.id}
                  className="glass-card rounded-2xl border border-white/90 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setMobileStep(idx)}
                    aria-expanded={isExpanded}
                    aria-controls={`mobile-row-content-${idx}`}
                    className="w-full p-4 flex items-center justify-between text-left gap-3 focus:outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                          isExpanded ? "bg-accent/20 text-accent-ink" : "bg-ink/5 text-ink-mute"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-ink">{step.title}</span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-ink-mute transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* CSS Grid-based smooth accordion reveal */}
                  <div
                    id={`mobile-row-content-${idx}`}
                    className="grid transition-[grid-template-rows] duration-200 ease-out px-4 text-xs text-ink-soft"
                    style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden pb-4">
                      <p className="leading-relaxed pl-11">{step.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Phone Mockup reflecting active accordion step */}
          <div className="pt-4 flex justify-center">
            <PhoneMockup className="w-[280px]">
              {mobileStep === 0 && (
                <PhoneScreenPrice
                  variantName={`${data.heroModel.name} ${data.heroModel.variantName}`}
                  exShowroom={data.heroModel.exShowroom}
                  total={data.heroModel.teaserOnRoad ?? 1459450}
                  validUntil={data.heroModel.validUntil ?? "31 Dec 2026"}
                />
              )}
              {mobileStep === 1 && (
                <PhoneScreenSlots
                  carName={`${data.heroModel.name} ${data.heroModel.variantName}`}
                  showroomName={data.locations[0]?.name ?? "Hazratganj Flagship"}
                />
              )}
              {mobileStep === 2 && (
                <PhoneScreenUsed
                  stockId={data.usedSample?.stock_id ?? "UC-1182"}
                  modelName={data.usedSample?.model_name ?? "Model C"}
                  variantName={data.usedSample?.variant_name ?? "VX Turbo Diesel"}
                  year={data.usedSample?.year ?? 2022}
                  km={data.usedSample?.km ?? 41200}
                  owners={data.usedSample?.owners ?? 1}
                  price={data.usedSample?.price ?? 845000}
                  regMasked={data.usedSample?.reg_no_masked ?? "UP32 ** **** 4120"}
                  score={data.usedSample?.inspection?.score ?? 94}
                />
              )}
              {mobileStep === 3 && (
                <PhoneScreenService
                  workshopName={data.locations.find((l) => l.type === "workshop")?.name ?? "Central Workshop Transport Nagar"}
                  baysAvailable={16}
                />
              )}
            </PhoneMockup>
          </div>
        </div>
      </div>
    </PinnedScene>
  );
}
