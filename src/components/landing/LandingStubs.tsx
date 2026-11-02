import React from "react";
import { Container } from "@/components/ui/container";

interface LandingStubProps {
  title: string;
  phase?: string;
}

function LandingSectionStub({ title, phase = "Landing Phase (Prompt 2)" }: LandingStubProps) {
  return (
    <section className="py-12 border-y border-dashed border-border/80 bg-ink/[0.015] my-6">
      <Container>
        <div className="rounded-xl border border-dashed border-ink/20 p-8 text-center space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-accent-ink bg-accent/15 px-2.5 py-0.5 rounded-pill inline-block">
            {phase}
          </span>
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <p className="text-xs text-ink-soft max-w-md mx-auto">
            Placeholder component for {title}. GSAP scenes, Lenis smooth scroll and interactive 3D assets will be wired in Phase 2.
          </p>
        </div>
      </Container>
    </section>
  );
}

export function HeroScene() {
  return <LandingSectionStub title="Hero Scene (GSAP Canvas / Car Viewport)" />;
}

export function WhyVrooma() {
  return <LandingSectionStub title="Why Vrooma: Dealership Reimagined" />;
}

export function ShowroomsOrbit() {
  return <LandingSectionStub title="Showrooms & Workshop Orbit Tour" />;
}

export function TransparentPricing() {
  return <LandingSectionStub title="Transparent Pricing Showcase" />;
}

export function InspectedUsed() {
  return <LandingSectionStub title="140-Point Inspected Used Stock Experience" />;
}

export function BookingSteps() {
  return <LandingSectionStub title="Frictionless Booking Steps Flow" />;
}

export function Reviews() {
  return <LandingSectionStub title="Verified Owner Reviews & Delivery Moments" />;
}

export function FinalCta() {
  return <LandingSectionStub title="Final Showroom Call to Action Banner" />;
}

