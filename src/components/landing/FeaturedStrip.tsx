import React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { PillButton } from "@/components/ui/PillButton";
import { Accent } from "@/components/ui/accent";
import { Reveal } from "@/components/motion/Reveal";
import { FeaturedModelTeaser } from "@/server/landing-data";
import { formatINR } from "@/lib/money";
import { ArrowRight, ShieldCheck } from "lucide-react";

export interface FeaturedStripProps {
  models: FeaturedModelTeaser[];
}

export function FeaturedStrip({ models }: FeaturedStripProps) {
  return (
    <section className="py-20 px-4 sm:px-8 w-full max-w-7xl mx-auto">
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent-ink">
              Official Showroom Lineup
            </span>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-ink">
              Featured models, <Accent tone="mute">ready for delivery</Accent>
            </h2>
          </div>
          <Link
            href="/cars"
            className="text-xs font-bold text-accent-ink hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto"
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
              className="p-5 rounded-3xl border border-white/90 shadow-card flex flex-col justify-between h-full space-y-4"
            >
              {/* Image with subtle contact shadow */}
              <div className="relative aspect-[16/10] w-full select-none">
                <Image
                  src={model.heroImage || "/images/placeholders/car-1.svg"}
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
                  <h3 className="text-base font-bold text-ink">{model.name}</h3>
                  <span className="text-[10px] uppercase font-bold text-ink-mute tracking-wider">
                    {model.bodyType}
                  </span>
                </div>
                <p className="text-xs text-ink-soft line-clamp-1">{model.tagline}</p>
              </div>

              {/* Price & Validity */}
              <div className="pt-3 border-t border-border/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-ink-mute block">
                  Lucknow On-Road
                </span>
                <span className="text-sm font-black text-ink block">
                  {model.teaserOnRoad ? (
                    `From ${formatINR(model.teaserOnRoad)}`
                  ) : (
                    "Contact showroom"
                  )}
                </span>
                <span className="text-[9px] text-ink-mute block leading-tight">
                  {model.validUntil
                    ? `Valid until ${model.validUntil} · Prices may change`
                    : "Official city price rule"}
                </span>
              </div>

              {/* CTA Link */}
              <div className="pt-1">
                <PillButton asChild variant="secondary" showArrow className="w-full text-xs h-10">
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
