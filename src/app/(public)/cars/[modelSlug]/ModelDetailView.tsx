"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Model, Variant, VariantColor } from "@/types/domain";
import { formatINR } from "@/lib/money";
import { getOnRoadAction, type OnRoadResult } from "@/server/actions/pricing";
import { useAuth } from "@/components/auth/AuthProvider";
import { getVehicleAsset, isApprovedVehicleAsset } from "@/constants/vehicle-assets";
import { PageShell } from "@/components/layout/PageShell";
import { VariantSelector } from "@/components/cars/VariantSelector";
import { VariantHighlights } from "@/components/cars/VariantHighlights";
import { ColorSwatches } from "@/components/cars/ColorSwatches";
import { CitySelect } from "@/components/cars/CitySelect";
import { PriceBreakup } from "@/components/cars/PriceBreakup";
import { ModelEmiCalculator } from "@/components/cars/ModelEmiCalculator";
import { SimilarCars } from "@/components/cars/SimilarCars";
import { AuthGate } from "@/components/auth/AuthGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/components/auth/useRequireAuth";
import { useSavedModel } from "@/components/cars/useSavedModel";
import { toast } from "sonner";
import {
  Heart,
  Calendar,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ModelDetailViewProps {
  model: Model;
  allModels: Model[];
  /** Server-rendered teaser (headline total only) for the default variant in Lucknow. Never the raw rule. */
  initialOnRoad: OnRoadResult | null;
}

export function ModelDetailView({
  model,
  allModels,
  initialOnRoad,
}: ModelDetailViewProps) {
  const [selectedCity, setSelectedCity] = useState("lucknow");
  const [selectedVariant, setSelectedVariant] = useState<Variant>(
    model.variants?.[0] || {
      id: "var-default",
      model_id: model.id,
      name: "Standard Variant",
      fuel: "petrol",
      transmission: "automatic",
      ex_showroom: model.min_price || 1245000,
      specs: {},
      features: [],
    }
  );
  const [includeAccessories, setIncludeAccessories] = useState(true);
  const [currentColorImage, setCurrentColorImage] = useState<string | null>(null);
  const { saved, toggle: toggleSaved } = useSavedModel(model.slug);
  const { requireAuth } = useRequireAuth();

  // On-road price comes from the server, computed from the admin price table and gated by session:
  // signed out -> headline total only; signed in -> full itemised breakup. The browser never gets the raw rule.
  const { user } = useAuth();
  const [onRoad, setOnRoad] = useState<OnRoadResult | null>(initialOnRoad);
  const [onRoadLoading, setOnRoadLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setOnRoadLoading(true);
    getOnRoadAction({
      variantId: selectedVariant.id,
      city: selectedCity === "kanpur" ? "kanpur" : "lucknow",
      includeAccessories,
    })
      .then((result) => {
        if (!cancelled) setOnRoad(result);
      })
      .catch(() => {
        if (!cancelled) setOnRoad({ tier: "unavailable" });
      })
      .finally(() => {
        if (!cancelled) setOnRoadLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedVariant.id, selectedCity, includeAccessories, user?.id]);

  const onRoadBreakup = onRoad?.tier === "full" ? onRoad.breakup : null;

  // Validity date of the price rule behind the headline (shown next to the price, as the brief requires).
  const onRoadValidUntilRaw =
    onRoad?.tier === "full" ? onRoad.breakup.validUntil : onRoad?.tier === "teaser" ? onRoad.validUntil : null;
  const onRoadValidUntil = onRoadValidUntilRaw
    ? new Date(onRoadValidUntilRaw).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  // Smooth-scroll to the breakup section (plain anchor still works without JS / with reduced motion).
  const scrollToBreakup = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("price-breakup");
    if (!target) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", "#price-breakup");
  };
  const onRoadHeadline =
    onRoad?.tier === "full" ? onRoad.breakup.total : onRoad?.tier === "teaser" ? onRoad.total : null;

  // Approved centralized vehicle asset resolution
  const currentVehicleAsset = useMemo(() => {
    if (currentColorImage && isApprovedVehicleAsset(currentColorImage)) {
      return currentColorImage;
    }
    return getVehicleAsset({
      slug: model.slug,
      name: model.name,
      hero_image: model.hero_image,
      body_type: model.body_type,
    });
  }, [currentColorImage, model.slug, model.name, model.hero_image, model.body_type]);

  const cityName = selectedCity === "kanpur" ? "Kanpur" : "Lucknow";

  // Action Handlers
  const handleSave = toggleSaved;

  const specEntries = Object.entries(selectedVariant.specs || {});

  return (
    <PageShell
      breadcrumbs={[
        { label: "New Cars", href: "/cars" },
        { label: model.name },
      ]}
      className="pb-12 sm:pb-16"
    >
      {/* =========================================================================
          STAGE 1: FIRST VIEWPORT — PRODUCT OVERVIEW (TWO-COLUMN PRODUCT LAYOUT)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* LEFT COLUMN: MODEL IDENTITY, ACTIONS & VEHICLE SHOWCASE */}
        <div className="lg:col-span-7 space-y-6">
          {/* Top Section: Model Information + Vertical Action Stack */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Left Sub-Group: Model Information & Location Selector */}
            <div className="space-y-2 min-w-0 flex-1">
              <Badge
                variant="outline"
                className="text-[11px] font-bold uppercase tracking-wider text-ink-soft bg-stone-100/80 border-border/80 px-2.5 py-0.5"
              >
                {model.body_type}
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-ink">
                {model.name}
              </h1>
              <p className="text-sm sm:text-base text-ink-soft leading-relaxed max-w-xl">
                {model.tagline}
              </p>

              {/* Showroom Pricing City Selector */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-ink-mute uppercase tracking-wider">
                  Showroom Pricing:
                </span>
                <CitySelect value={selectedCity} onChange={setSelectedCity} />
              </div>
            </div>

            {/* Right Sub-Group: Vertical Action Stack */}
            <div className="flex flex-col gap-2.5 w-full sm:w-44 shrink-0 sm:pt-1">
              {/* 1. Save (Secondary Action) */}
              <Button
                type="button"
                variant="outline"
                shape="pill"
                size="md"
                onClick={handleSave}
                className={cn(
                  "w-full h-10 px-4 text-xs font-semibold justify-center gap-1.5 transition-all duration-200 border-border/80 bg-white hover:bg-stone-50",
                  saved
                    ? "text-emerald-700 border-emerald-600/40 bg-emerald-50/50"
                    : "text-ink-soft hover:text-ink"
                )}
                aria-label={saved ? "Remove from saved vehicles" : "Save vehicle"}
              >
                <Heart
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    saved ? "fill-emerald-600 text-emerald-600 scale-105" : "text-ink-mute"
                  )}
                />
                <span>{saved ? "Saved" : "Save"}</span>
              </Button>

              {/* 2. Book Test Drive (Primary Action) */}
              <Button
                asChild
                variant="primary"
                shape="pill"
                size="md"
                className="w-full h-10 px-4 text-xs font-bold justify-center gap-2 bg-dark text-white hover:bg-dark/90 shadow-sm transition-all duration-200"
              >
                <Link href={`/book/test-drive?variant=${selectedVariant.id}&model=${model.slug}`}>
                  <Calendar className="h-4 w-4 text-white/80" />
                  <span>Book Test Drive</span>
                  <ArrowRight className="h-3.5 w-3.5 text-white/70 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Vehicle Image Frame */}
          <div className="relative w-full h-[260px] sm:h-[300px] lg:h-[330px] rounded-2xl bg-gradient-to-b from-stone-50/90 to-stone-100/40 border border-border/80 flex items-center justify-center overflow-hidden">
            <Image
              src={currentVehicleAsset}
              alt={`${model.name} - ${selectedVariant.name}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-contain p-6 select-none transition-all duration-300 drop-shadow-xs"
            />
          </div>

          {/* Color Swatches (if variant has color options) */}
          {selectedVariant.colors && selectedVariant.colors.length > 0 && (
            <div className="pt-1">
              <ColorSwatches
                colors={selectedVariant.colors}
                onColorChange={(color: VariantColor) => setCurrentColorImage(color.image_url)}
              />
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SHOWROOM PRICING & VARIANT SELECTOR */}
        <div className="lg:col-span-5 space-y-6">
          {/* Showroom Pricing Card (No EMI starts or customize link) */}
          <div className="rounded-2xl border border-border/80 bg-white p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-baseline justify-between pb-1">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-mute block">
                  Ex-Showroom Price
                </span>
                <span className="text-2xl sm:text-3xl font-black text-ink tracking-tight mt-0.5 block">
                  {formatINR(selectedVariant.ex_showroom)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-medium text-ink-mute block">
                  On-Road ({cityName})
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-700">
                  {onRoadHeadline !== null ? formatINR(onRoadHeadline) : onRoadLoading ? "…" : "—"}
                </span>
                {onRoadValidUntil && (
                  <span className="text-[10px] text-ink-mute block">Valid until {onRoadValidUntil}</span>
                )}
              </div>
            </div>
            {onRoadHeadline !== null ? (
              <p className="text-[11px] text-ink-mute">
                Includes road tax, registration, insurance, logistics & statutory charges for {cityName}.
                Prices may change.{" "}
                <a
                  href="#price-breakup"
                  onClick={scrollToBreakup}
                  className="font-semibold text-accent-ink underline underline-offset-2 hover:text-ink"
                >
                  View full price breakup
                </a>
              </p>
            ) : (
              <p className="text-[11px] text-ink-mute">
                {onRoadLoading
                  ? "Fetching the official on-road price…"
                  : `The on-road price for ${cityName} is being updated. Please contact the showroom for a quote.`}
              </p>
            )}
          </div>

          {/* Variant Selector & Highlights */}
          {model.variants && model.variants.length > 0 && (
            <div className="space-y-4">
              <VariantSelector
                variants={model.variants}
                selectedVariantId={selectedVariant.id}
                onSelect={(v) => {
                  setSelectedVariant(v);
                  setCurrentColorImage(null);
                }}
              />
              <VariantHighlights variant={selectedVariant} model={model} />
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          STAGE 2: PRICING & FINANCING (BALANCED TWO-COLUMN 50/50 SECTION)
         ========================================================================= */}
      <section id="price-breakup" className="mt-14 pt-12 border-t border-border/80 space-y-6 scroll-mt-24">
        <div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink">
            Pricing & Financing
          </h2>
          <p className="text-xs sm:text-sm text-ink-soft mt-1">
            Transparent statutory cost breakdown and flexible financing options for {model.name} {selectedVariant.name} in {cityName}.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Left Column: Official RTO & Statutory Breakup (DPDP Gated) */}
          <div className="space-y-3 flex flex-col">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">
                Official RTO & Statutory Breakup
              </span>
              <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                DPDP Verified
              </span>
            </div>

            <AuthGate
              actionLabel="Sign in with phone or email to view full breakup"
              className="rounded-2xl border border-dashed border-border/80 bg-white/80 p-6 text-center"
            >
              {onRoadLoading && onRoad?.tier !== "full" ? (
                <div
                  className="rounded-2xl border border-border/80 bg-white p-6 text-center text-xs text-ink-mute animate-pulse"
                  aria-busy="true"
                >
                  Loading official price breakup…
                </div>
              ) : (
                <PriceBreakup
                  breakup={onRoadBreakup}
                  cityName={cityName}
                  includeAccessories={includeAccessories}
                  onToggleAccessories={setIncludeAccessories}
                />
              )}
            </AuthGate>
          </div>

          {/* Right Column: Interactive EMI Calculator */}
          <div className="space-y-3 flex flex-col">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">
                Financing & EMI Estimator
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">
                Instant Pre-Approval Available
              </span>
            </div>

            <ModelEmiCalculator
              variantPrice={selectedVariant.ex_showroom}
              variantName={selectedVariant.name}
              modelName={model.name}
              className="flex-1"
            />
          </div>
        </div>
      </section>

      {/* =========================================================================
          STAGE 3: TECHNICAL SPECIFICATIONS & FEATURES (PLAIN SECTION)
         ========================================================================= */}
      <section className="mt-14 pt-12 border-t border-border/80 space-y-12">
        {/* A. Technical Specifications (Plain section + thin horizontal dividers) */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink">
              Technical Specifications
            </h2>
            <p className="text-sm font-bold text-emerald-700 mt-1">
              {selectedVariant.name}
            </p>
          </div>

          {specEntries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
              {specEntries.map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-3 border-b border-border/60 text-xs sm:text-sm"
                >
                  <span className="font-medium text-ink-soft">{key}</span>
                  <span className="font-bold text-ink text-right ml-4">{val}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-mute">
              Specifications pending official publication.
            </p>
          )}
        </div>

        {/* B. Key Variant Features (Compact information group) */}
        {selectedVariant.features && selectedVariant.features.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-mute">
              Key Variant Features
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {selectedVariant.features.map((feat, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-ink py-0.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                  <span className="font-medium">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          STAGE 4: PROTECTED UNTOUCHED BOUNDARY (SIMILAR CARS & FOOTER)
         ========================================================================= */}
      <SimilarCars currentModelId={model.id} models={allModels} />
    </PageShell>
  );
}
