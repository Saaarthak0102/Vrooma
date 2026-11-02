import React from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Container, Section } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Accent } from "@/components/ui/accent";
import { CarCard } from "@/components/cars/CarCard";
import { UsedCarCard } from "@/components/used/UsedCarCard";
import { listModels } from "@/server/repositories/models";
import { listUsedCars } from "@/server/repositories/used-cars";
import {
  HeroScene,
  WhyVrooma,
  ShowroomsOrbit,
  TransparentPricing,
  InspectedUsed,
  BookingSteps,
  Reviews,
  FinalCta,
} from "@/components/landing";
import { ArrowRight, ShieldCheck, Clock, Home, Search } from "lucide-react";
import { OrganizationJsonLd } from "@/components/seo/VehicleJsonLd";

export default async function HomePage() {
  const models = await listModels();
  const usedCars = await listUsedCars();

  const featuredModels = models.slice(0, 3);
  const featuredUsed = usedCars.slice(0, 3);

  return (
    <div className="space-y-12">
      <OrganizationJsonLd />

      {/* Hero Section */}
      <Section spacing="default" className="pt-8 sm:pt-14 pb-8">
        <Container>
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-white px-3.5 py-1 text-xs font-semibold text-accent-ink border border-border shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              Authorised Brand X Dealership · Lucknow & Kanpur
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-ink leading-[1.15]">
              Drive home your next car with{" "}
              <Accent>absolute confidence</Accent>
            </h1>

            <p className="text-base sm:text-lg text-ink-soft max-w-2xl mx-auto leading-relaxed">
              Transparent on-road price breakdowns, 140-point certified pre-owned vehicles, and instant showroom demo bookings across Hazratganj and Gomti Nagar.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button asChild size="lg" className="w-full sm:w-auto text-sm gap-2">
                <Link href="/cars">
                  <span>Browse New Cars</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto text-sm">
                <Link href="/book/test-drive">Book Showroom Demo</Link>
              </Button>
            </div>

            {/* Quick Search Shortcut Bar */}
            <div className="pt-6 max-w-xl mx-auto">
              <Link
                href="/cars"
                className="flex items-center justify-between rounded-pill bg-white border border-border p-2 pl-5 shadow-card hover:border-accent transition-colors text-xs text-ink-mute"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="h-4 w-4 text-ink-mute" />
                  <span>Search Model H, Model C, or fuel types...</span>
                </div>
                <span className="rounded-pill bg-dark px-3.5 py-1.5 font-semibold text-white text-[11px]">
                  Explore
                </span>
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      {/* Three Trust Pillars */}
      <section className="py-6 border-y border-border/80 bg-white/60">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-ink/[0.015]">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center text-accent-ink shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink">Transparent On-Road Pricing</h4>
                <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                  Official RTO road tax, registration, and comprehensive insurance breakdowns from verified admin tables. Zero dealer markups.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-ink/[0.015]">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center text-accent-ink shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink">5-Minute Lead Response SLA</h4>
                <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                  Every inquiry reaches a dedicated showroom relationship manager within five minutes. No waiting, no unanswered queries.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-ink/[0.015]">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center text-accent-ink shrink-0">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink">Doorstep Test Drives</h4>
                <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                  Book a sanitized demo slot at your home or office in Lucknow with real-time bay and vehicle availability.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Featured Models Strip */}
      <Section spacing="sm">
        <Container>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-accent-ink">
                Showroom Collection
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink mt-1">
                Featured Brand X Models
              </h2>
            </div>
            <Button asChild variant="outline" size="sm" className="text-xs self-start sm:self-auto">
              <Link href="/cars">View All Models ({models.length})</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredModels.map((model) => (
              <CarCard key={model.id} model={model} />
            ))}
          </div>
        </Container>
      </Section>

      {/* Certified Used Cars Strip */}
      <Section spacing="sm">
        <Container>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-accent-ink">
                140-Point Verified
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink mt-1">
                Certified Pre-Owned Selection
              </h2>
            </div>
            <Button asChild variant="outline" size="sm" className="text-xs self-start sm:self-auto">
              <Link href="/used-cars">View All Used Cars ({usedCars.length})</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredUsed.map((car) => (
              <UsedCarCard key={car.id} car={car} />
            ))}
          </div>
        </Container>
      </Section>

      {/* Placeholder Landing Components to be populated in Landing Phase */}
      <div className="space-y-4">
        <HeroScene />
        <WhyVrooma />
        <ShowroomsOrbit />
        <TransparentPricing />
        <InspectedUsed />
        <BookingSteps />
        <Reviews />
        <FinalCta />
      </div>
    </div>
  );
}

