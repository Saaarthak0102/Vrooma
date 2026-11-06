"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Offer } from "@/types/domain";
import { format, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListingFlipCard } from "@/components/listing/ListingFlipCard";
import { FlipToggle } from "@/components/ui/flip-card";
import { useFlipGroup } from "@/components/listing/FlipGroup";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Calendar,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  Tag,
} from "lucide-react";

export interface OfferListingCardProps {
  offer: Offer;
  className?: string;
}

const MODEL_NAMES: Record<string, string> = {
  "model-h": "Model H",
  "model-c": "Model C",
  "model-s": "Model S",
  "model-x": "Model X",
  "model-t": "Model T",
};

export function OfferListingCard({ offer, className }: OfferListingCardProps) {
  const t = useTranslations("listing");
  const { openSignInSheet } = useAuth();
  const flipGroup = useFlipGroup();

  const isFlipped = flipGroup ? flipGroup.isFlipped(offer.id) : undefined;
  const handleFlip = () => {
    if (flipGroup) {
      flipGroup.toggleCard(offer.id);
    }
  };

  const formattedDate = React.useMemo(() => {
    if (!offer.valid_until) return "Ongoing";
    try {
      const parsed = parseISO(offer.valid_until);
      return format(parsed, "d MMM yyyy", {
        locale: enUS,
      });
    } catch {
      return offer.valid_until;
    }
  }, [offer.valid_until]);

  const targetModelName = offer.model_id
    ? MODEL_NAMES[offer.model_id] || offer.model_id
    : null;

  // FRONT FACE
  const frontFace = (
    <div className="p-6 flex flex-col justify-between h-full space-y-5">
      <div className="space-y-4">
        {/* Top Tag & Validity */}
        <div className="flex items-center justify-between">
          <Badge variant="accent" className="text-xs uppercase font-semibold">
            {offer.badge || "Special Offer"}
          </Badge>
          <span className="text-[11px] text-ink-mute flex items-center gap-1 font-medium">
            <Calendar className="h-3.5 w-3.5" />
            {t("validTill", { date: formattedDate })}
          </span>
        </div>

        {/* Larger Title */}
        <h3 className="text-xl font-extrabold text-ink leading-snug tracking-tight">
          {offer.title}
        </h3>
      </div>

      {/* Verification & Details Toggle */}
      <div className="pt-4 border-t border-border flex items-center justify-between mt-auto">
        <span className="text-[11px] text-accent-ink font-semibold flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {t("showroomVerified")}
        </span>
        <FlipToggle
          face="front"
          label={t("flipShow", { name: offer.title })}
          className="text-xs font-semibold text-ink-soft hover:text-ink hover:bg-ink/5 px-3 py-1.5 h-auto rounded-full border border-border"
        >
          <span>{t("details")}</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1 text-ink-mute" />
        </FlipToggle>
      </div>
    </div>
  );

  // BACK FACE
  const backFace = (
    <div className="p-6 flex flex-col justify-between h-full space-y-4">
      <div className="space-y-4">
        {/* Header row with badge & Back toggle */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <Badge variant="outline" className="text-xs uppercase font-semibold">
            {offer.badge || "Offer Terms"}
          </Badge>
          <FlipToggle
            face="back"
            label={t("flipHide", { name: offer.title })}
            className="text-xs font-medium text-ink-soft hover:text-ink hover:bg-ink/5 px-2.5 py-1 h-auto rounded-full border border-border shrink-0 gap-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>{t("back")}</span>
          </FlipToggle>
        </div>

        {/* Full description */}
        <p className="text-xs sm:text-sm text-ink-soft leading-relaxed bg-ink/[0.02] p-4 rounded-lg border border-border/60">
          {offer.body}
        </p>

        {/* Applies to model link */}
        {offer.model_id && targetModelName && (
          <div className="text-xs text-ink-soft">
            <Link
              href={`/cars/${offer.model_id}`}
              className="text-accent-ink hover:underline font-semibold inline-flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded-sm"
            >
              <Tag className="h-3.5 w-3.5 shrink-0" />
              <span>{t("appliesTo", { model: targetModelName })}</span>
            </Link>
          </div>
        )}

        {/* Valid until date */}
        <div className="text-xs text-ink-mute flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{t("validTill", { date: formattedDate })}</span>
        </div>
      </div>

      {/* Claim Offer CTA */}
      <div className="pt-4 border-t border-border mt-auto">
        <AuthGate
          fallback={
            <Button
              variant="primary"
              size="sm"
              className="text-xs gap-1.5 w-full"
              onClick={() => openSignInSheet()}
            >
              <span>{t("claimOffer")}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          }
        >
          <Button
            asChild
            variant="primary"
            size="sm"
            className="text-xs gap-1.5 w-full"
          >
            <Link href="/book/test-drive">
              <span>{t("claimOffer")}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </AuthGate>
      </div>
    </div>
  );

  return (
    <ListingFlipCard
      front={frontFace}
      back={backFace}
      flipped={isFlipped}
      onFlip={handleFlip}
      ariaLabel={offer.title}
      className={className}
    />
  );
}
