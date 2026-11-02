"use client";

import React from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Model } from "@/types/domain";
import { formatINR, formatLakh } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColorSwatches } from "@/components/cars/ColorSwatches";
import { ListingFlipCard } from "@/components/listing/ListingFlipCard";
import { FlipToggle } from "@/components/ui/flip-card";
import { MediaParallax } from "@/components/listing/MediaParallax";
import { useFlipGroup } from "@/components/listing/FlipGroup";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Fuel,
  Gauge,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  Info,
} from "lucide-react";

export interface CarListingCardProps {
  model: Model;
  citySlug?: string;
  priority?: boolean;
  className?: string;
}

export function CarListingCard({
  model,
  citySlug = "lucknow",
  priority = false,
  className,
}: CarListingCardProps) {
  const t = useTranslations("listing");
  const { openSignInSheet } = useAuth();
  const flipGroup = useFlipGroup();

  const isFlipped = flipGroup ? flipGroup.isFlipped(model.id) : undefined;
  const handleFlip = () => {
    if (flipGroup) {
      flipGroup.toggleCard(model.id);
    }
  };

  const minPrice = model.min_price ?? 1095000;
  // Dynamic 17% RTO + insurance + statutory estimate for selected city
  const estimatedOnRoad = Math.round(minPrice * 1.17);
  const validityDate = "31 Dec 2026";

  const variants = model.variants || [];
  const primaryVariant = variants[0];
  const mainFuel = primaryVariant?.fuel || "petrol";
  const mainTrans = primaryVariant?.transmission || "automatic";
  const colors = primaryVariant?.colors || [];

  // Up to 4 displayed variants
  const displayedVariants = variants.slice(0, 4);
  const remainingVariantsCount = Math.max(0, variants.length - 4);

  // 3 key specifications from the primary variant specs JSON
  const keySpecsEntries = primaryVariant?.specs
    ? Object.entries(primaryVariant.specs).slice(0, 3)
    : [];

  // FRONT FACE
  const frontFace = (
    <div className="p-5 flex flex-col justify-between h-full space-y-4">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="secondary" className="uppercase text-[10px] tracking-wider">
            {model.body_type}
          </Badge>
          <span className="text-xs text-ink-mute font-medium capitalize">
            {citySlug} Stock
          </span>
        </div>

        {/* Media Parallax (16:9) */}
        <div className="mb-4">
          <MediaParallax
            src={model.hero_image}
            alt={model.name}
            priority={priority}
          />
        </div>

        {/* Model Name as real Link (M3 excluded from flip) */}
        <h3 className="text-xl font-bold tracking-tight text-ink hover:text-accent-ink transition-colors">
          <Link
            href={`/cars/${model.slug}`}
            className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded-sm inline-block"
          >
            {model.name}
          </Link>
        </h3>
        <p className="text-xs text-ink-soft line-clamp-1 mt-0.5 mb-3">
          {model.tagline}
        </p>

        {/* Key Spec Chips */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="inline-flex items-center gap-1 rounded-sm bg-ink/5 px-2 py-1 text-[11px] font-medium text-ink-soft capitalize">
            <Fuel className="h-3 w-3 text-ink-mute" />
            {mainFuel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-sm bg-ink/5 px-2 py-1 text-[11px] font-medium text-ink-soft capitalize">
            <Gauge className="h-3 w-3 text-ink-mute" />
            {mainTrans}
          </span>
          {variants.length > 0 && (
            <span className="rounded-sm bg-ink/5 px-2 py-1 text-[11px] font-medium text-ink-soft">
              {variants.length} {t("variants")}
            </span>
          )}
        </div>
      </div>

      {/* Pricing & Quick View */}
      <div className="pt-3 border-t border-border mt-auto space-y-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-ink-mute">{t("exShowroomFrom")}</span>
            <span className="text-lg font-extrabold text-ink">
              {formatINR(minPrice)}
            </span>
          </div>

          {estimatedOnRoad ? (
            <div className="space-y-0.5 mt-0.5">
              <div className="text-[11px] text-accent-ink font-semibold">
                {t("onRoadFrom", {
                  amount: formatLakh(estimatedOnRoad),
                  city: citySlug,
                })}
              </div>
              <div className="text-[10px] text-ink-mute leading-tight">
                {t("priceValidDisclaimer", { date: validityDate })}
              </div>
            </div>
          ) : (
            <div className="text-xs text-ink-mute font-medium mt-0.5">
              {t("contactShowroom")}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end pt-1">
          <FlipToggle
            face="front"
            label={t("flipShow", { name: model.name })}
            className="text-xs font-semibold text-ink-soft hover:text-ink hover:bg-ink/5 px-3 py-1.5 h-auto rounded-full border border-border"
          >
            <span>{t("quickView")}</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1 text-ink-mute" />
          </FlipToggle>
        </div>
      </div>
    </div>
  );

  // BACK FACE
  const backFace = (
    <div className="p-5 flex flex-col justify-between h-full space-y-4">
      <div>
        {/* Header row with Model Title + Back Toggle */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="truncate pr-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent-ink block">
              {model.body_type}
            </span>
            <h4 className="text-sm font-bold text-ink truncate">{model.name}</h4>
          </div>
          <FlipToggle
            face="back"
            label={t("flipHide", { name: model.name })}
            className="text-xs font-medium text-ink-soft hover:text-ink hover:bg-ink/5 px-2.5 py-1 h-auto rounded-full border border-border shrink-0 gap-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>{t("back")}</span>
          </FlipToggle>
        </div>

        {/* Variants list (max 4) */}
        <div className="mt-3 mb-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-ink-soft uppercase tracking-wider">
            <span>{t("variants")}</span>
            {remainingVariantsCount > 0 && (
              <Link
                href={`/cars/${model.slug}`}
                className="text-[11px] font-semibold text-accent-ink hover:underline"
              >
                {t("moreVariants", { count: remainingVariantsCount })}
              </Link>
            )}
          </div>
          <div className="divide-y divide-border/60 rounded-lg border border-border/80 bg-ink/[0.015] overflow-hidden text-xs">
            {displayedVariants.map((v) => (
              <div
                key={v.id}
                className="p-2 flex items-center justify-between hover:bg-ink/[0.02]"
              >
                <div className="truncate pr-2">
                  <span className="font-semibold text-ink truncate block">
                    {v.name}
                  </span>
                  <span className="text-[10px] text-ink-mute capitalize">
                    {v.fuel} · {v.transmission}
                  </span>
                </div>
                <span className="font-bold text-ink text-xs shrink-0">
                  {formatINR(v.ex_showroom)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Color Swatches (decorative) */}
        {colors.length > 0 && (
          <div className="mb-3">
            <ColorSwatches colors={colors} />
          </div>
        )}

        {/* 3 Key Specs */}
        {keySpecsEntries.length > 0 && (
          <div className="space-y-1 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-mute block">
              {t("keySpecs")}
            </span>
            <div className="grid grid-cols-1 gap-1 text-[11px]">
              {keySpecsEntries.map(([label, val]) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-0.5 border-b border-border/40 text-ink-soft"
                >
                  <span className="text-ink-mute">{label}</span>
                  <span className="font-semibold text-ink">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="pt-3 border-t border-border mt-auto">
        <div className="grid grid-cols-2 gap-2 listing-card-actions">
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="text-xs w-full"
          >
            <Link href={`/cars/${model.slug}`}>{t("viewModel")}</Link>
          </Button>

          <AuthGate
            fallback={
              <Button
                variant="primary"
                size="sm"
                className="text-xs gap-1 w-full"
                onClick={() => openSignInSheet()}
              >
                <span>{t("bookTestDrive")}</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            }
          >
            <Button
              asChild
              variant="primary"
              size="sm"
              className="text-xs gap-1 w-full"
            >
              <Link href={`/book/test-drive?model=${model.slug}`}>
                <span>{t("bookTestDrive")}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </AuthGate>
        </div>
      </div>
    </div>
  );

  return (
    <ListingFlipCard
      front={frontFace}
      back={backFace}
      flipped={isFlipped}
      onFlip={handleFlip}
      ariaLabel={`${model.name} (${model.body_type})`}
      className={className}
    />
  );
}
