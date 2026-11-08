import React from "react";
import Image from "next/image";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { PillButton } from "@/components/ui/PillButton";
import { Accent } from "@/components/ui/accent";
import { Reveal } from "@/components/motion/Reveal";
import { FeaturedModelTeaser } from "@/server/landing-data";
import { formatINR } from "@/lib/money";
import { getVehicleAsset } from "@/constants/vehicle-assets";
import { ArrowRight } from "lucide-react";

export interface FeaturedStripProps {
  models: FeaturedModelTeaser[];
}

export function FeaturedStrip({ models }: FeaturedStripProps) {
  return (
    <section className="py-20 px-4 sm:px-8 w-full max-w-7xl mx-auto">
      <Reveal>
        <div data-layout="featured:heading" data-layout-kind="text" className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div className="space-y-2">
            <span className="fs-micro font-bold uppercase tracking-wider text-accent-ink">
              Official Showroom Lineup
            </span>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-ink">
              Featured models, <Accent tone="mute">ready for delivery</Accent>
            </h2>
          </div>
          <Link
            href="/cars"
            className="fs-small font-bold text-accent-ink hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>View all Brand X models</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Reveal>

      {/* Grid of Model Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {models.map((model, idx) => (
          <Reveal key={model.id} delay={idx * 0.08}>
            <GlassCard
              interactive
              data-layout={`featured:card-${idx}`}
              data-layout-kind="card"
              className="p-5 rounded-3xl border border-white/90 shadow-card flex flex-col justify-between h-full space-y-4"
            >
              {/* Image with subtle contact shadow */}
              <div className="relative aspect-[16/10] w-full select-none">
                <Image
                  src={getVehicleAsset(model.heroImage || model)}
                  alt={`${model.name} in Lucknow`}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-contain"
                  loading="lazy"
                />
              </div>

              {/* Title & Tagline */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="fs-title font-bold text-ink">{model.name}</h3>
                  <span className="fs-micro uppercase font-bold text-ink-mute tracking-wider">
                    {model.bodyType}
                  </span>
                </div>
                <p className="fs-small text-ink-soft line-clamp-1">{model.tagline}</p>
              </div>

              {/* Price & Validity */}
              <div className="pt-3 border-t border-border/80 space-y-1">
                <span className="fs-micro uppercase font-bold text-ink-mute block">
                  Lucknow On-Road
                </span>
                <span className="text-sm sm:text-base font-black text-ink block">
                  {model.teaserOnRoad ? (
                    `From ${formatINR(model.teaserOnRoad)}`
                  ) : (
                    "Contact showroom"
                  )}
                </span>
                <span className="fs-micro text-ink-mute block leading-tight">
                  {model.validUntil
                    ? `Valid until ${model.validUntil} · Prices may change`
                    : "Official city price rule"}
                </span>
              </div>

              {/* CTA Link */}
              <div className="pt-1">
                <PillButton asChild variant="secondary" showArrow className="w-full fs-small h-10">
                  <Link href={`/cars/${model.slug}`}>View details</Link>
                </PillButton>
              </div>
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
