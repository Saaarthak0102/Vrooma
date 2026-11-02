"use client";

import React from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { UsedCar } from "@/types/domain";
import { formatINR } from "@/lib/money";
import { calculateEmi } from "@/lib/emi";
import { EMI_DEFAULTS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MaskedReg } from "@/components/used/MaskedReg";
import { OwnerKmYearBadges } from "@/components/used/OwnerKmYearBadges";
import { ListingFlipCard } from "@/components/listing/ListingFlipCard";
import { FlipToggle } from "@/components/ui/flip-card";
import { MediaParallax } from "@/components/listing/MediaParallax";
import { useFlipGroup } from "@/components/listing/FlipGroup";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ShieldCheck,
  ArrowRight,
  Ban,
  Check,
  ChevronLeft,
  Fuel,
  MapPin,
  Sparkles,
} from "lucide-react";

export interface UsedListingCardProps {
  car: UsedCar;
  priority?: boolean;
  className?: string;
}

const SHOWROOM_NAMES: Record<string, string> = {
  "sr-hazratganj": "Flagship Hazratganj",
  "sr-gomtinagar": "Gomti Nagar Center",
  "sr-kanpur-mall": "Kanpur City Center",
};

export function UsedListingCard({
  car,
  priority = false,
  className,
}: UsedListingCardProps) {
  const t = useTranslations("listing");
  const { openSignInSheet } = useAuth();
  const flipGroup = useFlipGroup();

  const isFlipped = flipGroup ? flipGroup.isFlipped(car.id) : undefined;
  const handleFlip = () => {
    if (flipGroup) {
      flipGroup.toggleCard(car.id);
    }
  };

  const isBooked = car.status === "booked";
  const mainImage = car.images[0] || "/images/placeholders/car-2.svg";
  const carTitle = `${car.model_name} ${car.variant_name}`;
  const showroomName =
    SHOWROOM_NAMES[car.showroom_id] || "Pre-Owned Hub (Shaheed Path)";

  // Indicative EMI calculation using standard defaults
  const loanPrincipal = Math.round(
    car.price * (1 - EMI_DEFAULTS.downPaymentPct / 100)
  );
  const emiAmount = calculateEmi(
    loanPrincipal,
    EMI_DEFAULTS.annualRatePct,
    EMI_DEFAULTS.tenureMonths
  );

  // Top 3 passed inspection checkpoints
  const topPassedChecks = (car.inspection?.checks || [])
    .filter((c) => c.status === "pass")
    .slice(0, 3);

  // FRONT FACE
  const frontFace = (
    <div
      className={`p-5 flex flex-col justify-between h-full space-y-4 ${
        isBooked ? "opacity-90 bg-ink/[0.01]" : ""
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="font-mono text-[10px]">
              {car.stock_id}
            </Badge>
            {car.certified && (
              <Badge variant="accent" className="gap-1 text-[10px]">
                <ShieldCheck className="h-3 w-3" />
                <span>Certified</span>
              </Badge>
            )}
          </div>
          {isBooked ? (
            <Badge variant="danger" className="text-[10px] gap-1">
              <Ban className="h-3 w-3" />
              <span>Booked</span>
            </Badge>
          ) : (
            <span className="text-xs text-accent-ink font-semibold">
              Available
            </span>
          )}
        </div>

        {/* Media with pointer fine parallax */}
        <div className="mb-4">
          <MediaParallax
            src={mainImage}
            alt={carTitle}
            priority={priority}
          />
        </div>

        {/* Title link (excluded from flip via M3) */}
        <h3 className="text-lg font-bold tracking-tight text-ink hover:text-accent-ink transition-colors">
          <Link
            href={`/used-cars/${car.stock_id}`}
            className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded-sm inline-block"
          >
            {car.model_name}{" "}
            <span className="font-medium text-ink-soft">
              {car.variant_name}
            </span>
          </Link>
        </h3>

        {/* Badges: Year, Km, Owners */}
        <div className="mt-2 mb-3">
          <OwnerKmYearBadges
            year={car.year}
            km={car.km}
            owners={car.owners}
          />
        </div>
      </div>

      {/* Pricing, Inspection & Flip Action */}
      <div className="pt-3 border-t border-border mt-auto space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-xs text-ink-mute block">{t("price")}</span>
            <span className="text-xl font-extrabold text-ink">
              {formatINR(car.price)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-ink-mute block">
              {t("inspection")}
            </span>
            <span className="text-xs font-bold text-accent-ink">
              {t("certifiedScore", { score: car.inspection.score })}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end pt-1">
          <FlipToggle
            face="front"
            label={t("flipShow", { name: carTitle })}
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
        {/* Header row with stock ID + title and Back button */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="truncate pr-2">
            <span className="text-[10px] font-mono font-bold text-ink-mute uppercase tracking-wider block">
              {car.stock_id}
            </span>
            <h4 className="text-sm font-bold text-ink truncate">{carTitle}</h4>
          </div>
          <FlipToggle
            face="back"
            label={t("flipHide", { name: carTitle })}
            className="text-xs font-medium text-ink-soft hover:text-ink hover:bg-ink/5 px-2.5 py-1 h-auto rounded-full border border-border shrink-0 gap-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>{t("back")}</span>
          </FlipToggle>
        </div>

        {/* Masked Registration Chip */}
        <div className="mt-3 mb-3">
          <MaskedReg regNo={car.reg_no_masked} />
        </div>

        {/* Key Facts */}
        <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 bg-ink/[0.02] rounded-lg border border-border/60 mb-3">
          <div className="flex items-center gap-1.5 text-ink-soft">
            <Fuel className="h-3.5 w-3.5 text-ink-mute shrink-0" />
            <span className="capitalize truncate">{car.fuel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-ink-soft">
            <MapPin className="h-3.5 w-3.5 text-ink-mute shrink-0" />
            <span className="truncate">{showroomName}</span>
          </div>
        </div>

        {/* Top 3 Verified Checks */}
        <div className="space-y-1.5 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-mute block">
            {t("inspectionChecks")}
          </span>
          <div className="space-y-1">
            {topPassedChecks.map((check, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 text-xs text-ink-soft"
              >
                <Check className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="truncate">{check.item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* EMI & CTAs */}
      <div className="pt-3 border-t border-border mt-auto space-y-3">
        <div className="flex items-center gap-1.5 text-[11px] text-accent-ink font-semibold">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>{t("emiFrom", { amount: formatINR(emiAmount) })}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 listing-card-actions">
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="text-xs w-full"
          >
            <Link href={`/used-cars/${car.stock_id}`}>
              {t("reportSpecs")}
            </Link>
          </Button>

          {isBooked ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="text-xs opacity-60 cursor-not-allowed w-full"
            >
              {t("booked")}
            </Button>
          ) : (
            <AuthGate
              fallback={
                <Button
                  variant="primary"
                  size="sm"
                  className="text-xs gap-1 w-full"
                  onClick={() => openSignInSheet()}
                >
                  <span>{t("bookVipView")}</span>
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
                <Link href={`/book/test-drive?usedCar=${car.stock_id}`}>
                  <span>{t("bookVipView")}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </AuthGate>
          )}
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
      ariaLabel={`${car.year} ${carTitle} (${car.stock_id})`}
      className={className}
    />
  );
}
