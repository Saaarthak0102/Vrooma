import React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Model } from "@/types/domain";
import { formatINR, formatLakh } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Fuel, Gauge, ArrowRight } from "lucide-react";

export interface CarCardProps {
  model: Model;
  citySlug?: string;
  className?: string;
}

export function CarCard({ model, citySlug = "lucknow", className }: CarCardProps) {
  const minPrice = model.min_price ?? 1095000;
  // Estimate on-road from based on 10% RTO + insurance + handling (~17% over ex-showroom)
  const estimatedOnRoad = Math.round(minPrice * 1.17);

  const mainFuel = model.variants?.[0]?.fuel || "petrol";
  const mainTrans = model.variants?.[0]?.transmission || "automatic";

  return (
    <div
      className={`group rounded-lg border border-border bg-white p-5 shadow-card hover:shadow-md transition-all duration-200 flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="secondary" className="uppercase text-[10px] tracking-wider">
            {model.body_type}
          </Badge>
          <span className="text-xs text-ink-mute font-medium">Lucknow Stock</span>
        </div>

        {/* Car Image with subtle hover elevation */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-ink/[0.03] mb-4">
          <Image
            src={model.hero_image}
            alt={model.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Vehicle Info */}
        <h3 className="text-xl font-bold tracking-tight text-ink group-hover:text-accent-ink transition-colors">
          {model.name}
        </h3>
        <p className="text-xs text-ink-soft line-clamp-1 mt-0.5 mb-3">{model.tagline}</p>

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
          {model.variants && (
            <span className="rounded-sm bg-ink/5 px-2 py-1 text-[11px] font-medium text-ink-soft">
              {model.variants.length} Variants
            </span>
          )}
        </div>
      </div>

      {/* Pricing & CTA */}
      <div className="pt-3 border-t border-border mt-auto">
        <div className="mb-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-ink-mute">Ex-showroom from</span>
            <span className="text-lg font-extrabold text-ink">{formatINR(minPrice)}</span>
          </div>
          <div className="text-[11px] text-accent-ink font-semibold">
            On-road from {formatLakh(estimatedOnRoad)} ({citySlug})
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="secondary" size="sm" className="text-xs">
            <Link href={`/cars/${model.slug}`}>View Variants</Link>
          </Button>
          <Button asChild variant="primary" size="sm" className="text-xs gap-1">
            <Link href={`/book/test-drive?model=${model.slug}`}>
              <span>Book Demo</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
