import React from "react";
import { Link } from "@/i18n/navigation";
import { Model } from "@/types/domain";
import { formatINR, formatLakh } from "@/lib/money";
import { newCarTag, hasAccentDot } from "@/lib/listing-tags";
import { NotchCard } from "@/components/listing/NotchCard";
import { NotchMedia } from "@/components/listing/NotchMedia";
import { NotchTag } from "@/components/listing/NotchTag";
import { Button } from "@/components/ui/button";
import { Fuel, Gauge, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

export interface CarCardProps {
  model: Model;
  citySlug?: string;
  className?: string;
  hasActiveOffer?: boolean;
  priority?: boolean;
}

export function CarCard({
  model,
  citySlug = "lucknow",
  className = "",
  hasActiveOffer = false,
  priority = false,
}: CarCardProps) {
  const t = useTranslations("listing");

  const minPrice = model.min_price ?? 1095000;
  // Estimate on-road based on 10% RTO + insurance + handling (~17% over ex-showroom)
  const estimatedOnRoad = Math.round(minPrice * 1.17);

  const mainVariant = model.variants?.[0];
  const mainFuel = mainVariant?.fuel || "petrol";
  const mainTrans = mainVariant?.transmission || "automatic";

  // Resolve Tag
  const tagResult = newCarTag({
    isFeatured: model.is_featured,
    hasActiveOffer,
    createdAt: model.created_at,
    bodyType: model.body_type,
    variants: model.variants,
  });

  const tagKey = typeof tagResult === "string" ? tagResult : tagResult.bodyType;
  const tagLabel = t(`tag.${tagKey}` as any);
  const showDot = hasAccentDot(tagResult);

  // Rupee symbol 80% size and lighter per design spec
  const formattedPriceNumber = formatINR(minPrice).replace("₹", "").trim();

  return (
    <NotchCard className={`group ${className}`}>
      {/* 1. Header row: Restyled quietly with 1px hairline border, mono 12px, 6px radius */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="font-mono text-xs px-2 py-0.5 border border-border rounded-[6px] text-ink-soft uppercase tracking-wider">
          {model.body_type}
        </span>
        <span className="text-xs text-ink-mute font-medium inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" aria-hidden="true" />
          <span>Lucknow Stock</span>
        </span>
      </div>

      {/* 2. Media: 16/10 aspect (4/3 on phones) with bottom-left cutout tab and bottom-right arrow notch */}
      <NotchMedia
        src={model.hero_image}
        alt={`${model.name} ${mainVariant?.name || ""}`}
        priority={priority}
        tag={
          <NotchTag
            label={tagLabel}
            hasAccentDot={showDot}
          />
        }
      />

      {/* 3. Vehicle Title & Variant */}
      <div className="space-y-1 mb-2">
        <h3 className="text-lg sm:text-xl font-semibold tracking-[-0.01em] text-ink line-clamp-2 text-balance leading-snug">
          <Link href={`/cars/${model.slug}`} className="notch-card-title-link">
            <span>{model.name}</span>
            {mainVariant?.name && (
              <span className="font-normal text-ink-soft ml-1.5">{mainVariant.name}</span>
            )}
          </Link>
        </h3>
        <p className="text-xs text-ink-soft line-clamp-1">{model.tagline}</p>
      </div>

      {/* 4. Key Spec Chips (elevated above stretched link) */}
      <div className="notch-interactive flex items-center gap-2 mb-4 flex-wrap">
        <span className="inline-flex items-center gap-1 rounded-md bg-ink/[0.04] px-2 py-1 text-[11px] font-medium text-ink-soft capitalize border border-border/50">
          <Fuel className="h-3 w-3 text-ink-mute" />
          {mainFuel}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-ink/[0.04] px-2 py-1 text-[11px] font-medium text-ink-soft capitalize border border-border/50">
          <Gauge className="h-3 w-3 text-ink-mute" />
          {mainTrans}
        </span>
        {model.variants && (
          <span className="rounded-md bg-ink/[0.04] px-2 py-1 text-[11px] font-medium text-ink-soft border border-border/50">
            {model.variants.length} Variants
          </span>
        )}
      </div>

      {/* 5. Pricing & Buttons pushed to bottom with margin-top: auto */}
      <div className="pt-3 border-t border-border mt-auto">
        <div className="mb-3">
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-xs text-ink-mute">Ex-showroom from</span>
            <span className="text-[22px] sm:text-2xl font-bold text-ink">
              <span className="text-[0.8em] font-normal opacity-75 mr-0.5">₹</span>
              {formattedPriceNumber}
            </span>
          </div>
          <div className="text-[11px] text-accent-ink font-semibold">
            On-road from {formatLakh(estimatedOnRoad)} ({citySlug})
          </div>
        </div>

        {/* 6. Buttons with container queries */}
        <div className="notch-card-actions">
          <Button
            href={`/cars/${model.slug}`}
            variant="secondary"
            shape="soft"
            size="md"
            className="notch-interactive text-[13px] font-semibold w-full"
          >
            View Variants
          </Button>

          <Button
            href={`/book/test-drive?model=${model.slug}`}
            variant="primary"
            shape="soft"
            size="md"
            className="notch-interactive text-[13px] font-semibold w-full"
            rightIcon={<ArrowRight className="h-3.5 w-3.5 notch-btn-icon" />}
          >
            Book Demo
          </Button>
        </div>
      </div>
    </NotchCard>
  );
}
