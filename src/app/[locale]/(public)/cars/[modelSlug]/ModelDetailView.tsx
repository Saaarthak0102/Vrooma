"use client";

import React, { useState, useMemo } from "react";
import { Model, Variant, PriceRule, VariantColor } from "@/types/domain";
import { computeOnRoad } from "@/lib/price-engine";
import { formatINR, formatLakh } from "@/lib/money";
import { calculateEmi } from "@/lib/emi";
import { PageShell } from "@/components/layout/PageShell";
import { Gallery } from "@/components/cars/Gallery";
import { VariantSelector } from "@/components/cars/VariantSelector";
import { ColorSwatches } from "@/components/cars/ColorSwatches";
import { CitySelect } from "@/components/cars/CitySelect";
import { SpecTable } from "@/components/cars/SpecTable";
import { PriceBreakup } from "@/components/cars/PriceBreakup";
import { PriceSummaryBar } from "@/components/cars/PriceSummaryBar";
import { SimilarCars } from "@/components/cars/SimilarCars";
import { AuthGate } from "@/components/auth/AuthGate";
import { Badge } from "@/components/ui/badge";
import { Calculator, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";

export interface ModelDetailViewProps {
  model: Model;
  allModels: Model[];
  initialPriceRule: PriceRule | null;
}

export function ModelDetailView({
  model,
  allModels,
  initialPriceRule,
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

  // Compute On-Road Price using pure price engine
  const onRoadBreakup = useMemo(() => {
    return computeOnRoad({
      variant: selectedVariant,
      rule: initialPriceRule,
      includeAccessories,
    });
  }, [selectedVariant, initialPriceRule, includeAccessories]);

  // Gallery images with color override
  const galleryImages = useMemo(() => {
    if (currentColorImage) {
      return [currentColorImage, ...(model.gallery || [])];
    }
    return model.gallery || [model.hero_image];
  }, [currentColorImage, model.gallery, model.hero_image]);

  // Basic monthly EMI
  const monthlyEmi = useMemo(() => {
    const principal = Math.round(selectedVariant.ex_showroom * 0.8);
    return calculateEmi(principal, 8.5, 60);
  }, [selectedVariant]);

  const cityName = selectedCity === "kanpur" ? "Kanpur" : "Lucknow";

  return (
    <PageShell
      breadcrumbs={[
        { label: "New Cars", href: "/cars" },
        { label: model.name },
      ]}
      className="pb-28" // Extra padding for sticky action bar
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Gallery, Specs & Color Swatches */}
        <div className="lg:col-span-7 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="accent" className="text-xs uppercase">
                {model.body_type}
              </Badge>
              <CitySelect value={selectedCity} onChange={setSelectedCity} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
              {model.name}
            </h1>
            <p className="text-sm text-ink-soft mt-1 leading-relaxed">
              {model.tagline}
            </p>
          </div>

          {/* Large Studio Gallery */}
          <Gallery images={galleryImages} modelName={model.name} />

          {/* Color Swatches */}
          {selectedVariant.colors && selectedVariant.colors.length > 0 && (
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <ColorSwatches
                colors={selectedVariant.colors}
                onColorChange={(color: VariantColor) => setCurrentColorImage(color.image_url)}
              />
            </div>
          )}

          {/* Technical Specifications */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-lg font-bold text-ink">
              Technical Specifications ({selectedVariant.name})
            </h3>
            <SpecTable
              specs={selectedVariant.specs}
              features={selectedVariant.features}
            />
          </div>
        </div>

        {/* Right Column: Pricing, Variant Selector & Gated Breakup */}
        <div className="lg:col-span-5 space-y-6">
          {/* Price Overview Card */}
          <div className="rounded-xl border border-border bg-white p-6 shadow-card space-y-4">
            <div className="flex items-baseline justify-between pb-3 border-b border-border">
              <div>
                <span className="text-xs text-ink-mute uppercase font-semibold block">
                  Ex-Showroom Price
                </span>
                <span className="text-2xl sm:text-3xl font-black text-ink">
                  {formatINR(selectedVariant.ex_showroom)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-ink-mute block">Estimated On-Road</span>
                <span className="text-sm sm:text-base font-extrabold text-accent-ink">
                  From {formatLakh(Math.round(selectedVariant.ex_showroom * 1.17))}
                </span>
              </div>
            </div>

            {/* Basic EMI Free Teaser */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-ink/[0.02] border border-border/80 text-xs">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-accent-ink" />
                <div>
                  <span className="font-semibold text-ink block">
                    EMI starts at {formatINR(monthlyEmi)}/mo
                  </span>
                  <span className="text-[10px] text-ink-mute">Based on 20% down payment @ 8.5% (60 mos)</span>
                </div>
              </div>
              <Link
                href="/emi-calculator"
                className="text-xs font-semibold text-accent-ink hover:underline shrink-0"
              >
                Customize
              </Link>
            </div>
          </div>

          {/* Variant Selector */}
          {model.variants && model.variants.length > 0 && (
            <VariantSelector
              variants={model.variants}
              selectedVariantId={selectedVariant.id}
              onSelect={(v) => {
                setSelectedVariant(v);
                setCurrentColorImage(null);
              }}
            />
          )}

          {/* Gated Official On-Road Price Breakup */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                Official RTO & Statutory Breakup
              </span>
              <span className="text-[10px] text-ink-mute flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-accent-ink" />
                DPDP Verified
              </span>
            </div>

            <AuthGate
              actionLabel="Sign in with phone or email to view full breakup"
              className="rounded-xl border border-dashed border-border bg-white p-6 text-center"
            >
              <PriceBreakup
                breakup={onRoadBreakup}
                cityName={cityName}
                includeAccessories={includeAccessories}
                onToggleAccessories={setIncludeAccessories}
              />
            </AuthGate>
          </div>
        </div>
      </div>

      {/* Similar Cars in Lineup */}
      <SimilarCars currentModelId={model.id} models={allModels} />

      {/* Sticky Bottom Action Bar */}
      <PriceSummaryBar
        modelName={model.name}
        variantName={selectedVariant.name}
        variantId={selectedVariant.id}
        modelSlug={model.slug}
        price={selectedVariant.ex_showroom}
      />
    </PageShell>
  );
}
