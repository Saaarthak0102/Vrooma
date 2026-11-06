"use client";

import React, { useState } from "react";
import { requestModelOfferAction } from "@/server/actions/enquiry";
import { useSavedModel } from "@/components/cars/useSavedModel";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRequireAuth } from "@/components/auth/useRequireAuth";
import { useRouter } from "next/navigation";
import { Bookmark, Sparkles, Calendar, Check } from "lucide-react";
import { toast } from "sonner";

export interface PriceSummaryBarProps {
  modelName: string;
  variantName: string;
  variantId: string;
  modelSlug: string;
  price: number;
}

export function PriceSummaryBar({
  modelName,
  variantName,
  variantId,
  modelSlug,
  price,
}: PriceSummaryBarProps) {
  const router = useRouter();
  const { requireAuth } = useRequireAuth();
  const { saved, pending, toggle: handleSave } = useSavedModel(modelSlug);

  const [offerPending, setOfferPending] = useState(false);

  const handleOffer = () => {
    requireAuth(async () => {
      if (offerPending) return;
      setOfferPending(true);
      try {
        const res = await requestModelOfferAction(modelSlug, variantName);
        if (res.ok) {
          toast.success(
            res.data.consultantName
              ? `Request received. ${res.data.consultantName} will contact you shortly with the latest offers.`
              : "Request received. A consultant will contact you shortly with the latest offers."
          );
        } else {
          toast.error(res.error.message || "Could not submit your request.");
        }
      } catch {
        toast.error("Could not submit your request.");
      } finally {
        setOfferPending(false);
      }
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-white/95 backdrop-blur-md py-3 px-4 shadow-2xl">
      <div className="mx-auto max-w-[1240px] flex items-center justify-between gap-4">
        {/* Left price info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base sm:text-lg text-ink">
              {modelName}
            </span>
            <span className="text-xs font-semibold text-ink-soft hidden sm:inline">
              · {variantName}
            </span>
          </div>
          <div className="text-xs text-ink-mute flex items-baseline gap-1">
            <span>Ex-showroom:</span>
            <span className="font-bold text-ink text-sm sm:text-base">
              {formatINR(price)}
            </span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={pending}
            className={`gap-1.5 text-xs hidden md:flex ${saved ? "text-accent-ink" : "text-ink-soft"}`}
          >
            {saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            <span>{saved ? "Saved" : "Save"}</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleOffer}
            disabled={offerPending}
            className="text-xs gap-1 hidden sm:flex"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent-ink" />
            <span>Get Offer</span>
          </Button>

          <Button asChild variant="primary" size="sm" className="text-xs gap-1.5">
            <Link href={`/book/test-drive?variant=${variantId}&model=${modelSlug}`}>
              <Calendar className="h-3.5 w-3.5" />
              <span>Book Test Drive</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

