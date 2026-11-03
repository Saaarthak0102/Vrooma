import React from "react";
import { Link } from "@/i18n/navigation";
import { UsedCar } from "@/types/domain";
import { formatINR } from "@/lib/money";
import { usedCarTag, hasAccentDot } from "@/lib/listing-tags";
import { NotchCard } from "@/components/listing/NotchCard";
import { NotchMedia } from "@/components/listing/NotchMedia";
import { NotchTag } from "@/components/listing/NotchTag";
import { MaskedReg } from "./MaskedReg";
import { OwnerKmYearBadges } from "./OwnerKmYearBadges";
import { ShieldCheck, ArrowRight, Ban } from "lucide-react";
import { useTranslations } from "next-intl";

export interface UsedCarCardProps {
  car: UsedCar;
  className?: string;
  priority?: boolean;
}

export function UsedCarCard({ car, className = "", priority = false }: UsedCarCardProps) {
  const t = useTranslations("listing");
  const isBooked = car.status === "booked";
  const mainImage = car.images[0] || "/images/placeholders/car-2.svg";

  // Resolve Tag
  const tagResult = usedCarTag({
    listedAt: car.listed_at,
    km: car.km,
    owners: car.owners,
    inspectionScore: car.inspection?.score,
  });

  const tagLabel = tagResult ? t(`tag.${tagResult}` as any) : null;
  const showDot = tagResult ? hasAccentDot(tagResult) : false;

  const formattedPriceNumber = formatINR(car.price).replace("₹", "").trim();

  return (
    <NotchCard
      isBooked={isBooked}
      className={`group ${className}`}
    >
      {/* 1. Header row: Quiet hairline stock ID, Certified text with shield, status */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs px-2 py-0.5 border border-border rounded-[6px] text-ink-soft bg-transparent">
            {car.stock_id}
          </span>
          {car.certified && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-ink bg-transparent">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Certified</span>
            </span>
          )}
        </div>
        {isBooked ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
            <Ban className="h-3.5 w-3.5" />
            <span>Booked</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-ink">
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" aria-hidden="true" />
            <span>Available</span>
          </span>
        )}
      </div>

      {/* 2. Media: 16/10 aspect (4/3 on phones) with bottom-left cutout tab */}
      <NotchMedia
        src={mainImage}
        alt={`${car.model_name} ${car.variant_name}, ${car.year}`}
        priority={priority}
        tag={
          tagLabel ? (
            <NotchTag
              label={tagLabel}
              hasAccentDot={showDot}
            />
          ) : undefined
        }
      />

      {/* 3. Title & Variant */}
      <div className="space-y-1 mb-2">
        <h3 className="text-lg sm:text-xl font-semibold tracking-[-0.01em] text-ink line-clamp-2 text-balance leading-snug">
          <Link href={`/used-cars/${car.stock_id}`} className="notch-card-title-link">
            <span>{car.model_name}</span>{" "}
            <span className="font-normal text-ink-soft">{car.variant_name}</span>
          </Link>
        </h3>
      </div>

      {/* 4. Masked Registration & Badges (Year, Km, Owners) */}
      <div className="mt-1 mb-3 notch-interactive">
        <MaskedReg regNo={car.reg_no_masked} />
      </div>

      <div className="mb-4 notch-interactive">
        <OwnerKmYearBadges year={car.year} km={car.km} owners={car.owners} />
      </div>

      {/* 5. Pricing & Inspection score pushed to bottom with margin-top: auto */}
      <div className="pt-3 border-t border-border mt-auto">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <span className="text-xs text-ink-mute block">Price</span>
            <span className="text-[22px] sm:text-2xl font-bold text-ink tabular-nums">
              <span className="text-[0.8em] font-normal opacity-75 mr-0.5">₹</span>
              {formattedPriceNumber}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-ink-mute block">Inspection</span>
            <span className="text-xs font-bold text-accent-ink">
              {car.inspection.score}/100 Score
            </span>
          </div>
        </div>

        {/* 6. Buttons with container queries */}
        <div className="notch-card-actions">
          <Link
            href={`/used-cars/${car.stock_id}`}
            className="notch-btn-secondary notch-interactive"
          >
            <span>Report & specs</span>
          </Link>

          {isBooked ? (
            <button
              disabled
              className="notch-btn-secondary notch-interactive opacity-60 cursor-not-allowed bg-ink/[0.03]"
            >
              <span>Booked</span>
            </button>
          ) : (
            <Link
              href={`/book/test-drive?usedCar=${car.stock_id}`}
              className="notch-btn-primary notch-interactive"
            >
              <span>Book VIP view</span>
              <ArrowRight className="h-3.5 w-3.5 notch-btn-icon" />
            </Link>
          )}
        </div>
      </div>
    </NotchCard>
  );
}
