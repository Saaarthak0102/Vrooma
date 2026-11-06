"use client";

import React, { useState } from "react";
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
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    requireAuth(() => {
      setSaved(!saved);
      toast.success(saved ? "Removed from saved vehicles" : "Vehicle saved to your account");
    });
  };

  const handleOffer = () => {
    requireAuth(() => {
      toast.success(`Enquiry submitted for ${modelName} ${variantName}. Our Hazratganj consultant will contact you with the best corporate and festive offers.`);
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
            className={`gap-1.5 text-xs hidden md:flex ${saved ? "text-accent-ink" : "text-ink-soft"}`}
          >
            {saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            <span>{saved ? "Saved" : "Save"}</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleOffer}
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

