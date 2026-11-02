"use client";

import React, { useRef } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Accent } from "@/components/ui/accent";
import { sampleTestimonials } from "@/data/content/testimonials";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion/register";
import { REDUCED_QUERY } from "@/lib/motion/media";
import { Star, Quote } from "lucide-react";

export function Reviews() {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container) return;

      const mm = gsap.matchMedia();

      mm.add(REDUCED_QUERY, () => {
        gsap.set([".review-card", ".review-avatar"], { opacity: 1, y: 0, filter: "none", scale: 1 });
      });

      mm.add(`not all and ${REDUCED_QUERY}`, () => {
        // Cards rise and de-blur
        gsap.fromTo(
          ".review-card",
          {
            opacity: 0,
            y: 80,
            filter: "blur(10px)",
          },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            stagger: 0.15,
            duration: 0.8,
            ease: "expo.out",
            clearProps: "filter",
            scrollTrigger: {
              trigger: container,
              start: "top 78%",
              once: true,
            },
          }
        );

        // Avatars pop with back.out(1.6)
        gsap.fromTo(
          ".review-avatar",
          {
            scale: 0.4,
            opacity: 0,
          },
          {
            scale: 1,
            opacity: 1,
            stagger: 0.15,
            duration: 0.6,
            delay: 0.2,
            ease: "back.out(1.6)",
            scrollTrigger: {
              trigger: container,
              start: "top 78%",
              once: true,
            },
          }
        );
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <section ref={containerRef} className="py-24 px-4 sm:px-8 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2 mb-14">
        <span className="text-[10px] font-bold uppercase tracking-wider text-accent-ink">
          Verified Ownership
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-ink">
          What our <Accent tone="accent">amazing</Accent> customers are saying
        </h2>
        <p className="text-xs text-ink-mute font-medium pt-1">
          Sample reviews. Replace with real customer reviews before launch.
        </p>
      </div>

      {/* Three Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sampleTestimonials.map((review) => (
          <GlassCard
            key={review.id}
            className="review-card p-6 rounded-3xl border border-white/90 shadow-elevated flex flex-col justify-between space-y-5"
          >
            <div className="space-y-4">
              {/* Star Rating & Quote Mark */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <Quote className="h-4 w-4 text-ink-mute/40" />
              </div>

              {/* Quote text */}
              <p className="text-xs sm:text-sm text-ink-soft leading-relaxed font-normal">
                &ldquo;{review.quote}&rdquo;
              </p>
            </div>

            {/* Author info with initials avatar (NO stock photos) */}
            <div className="flex items-center gap-3 pt-4 border-t border-border/80">
              <div className="review-avatar h-10 w-10 rounded-full bg-dark text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm border border-white/20">
                {review.initials}
              </div>
              <div className="text-left text-xs">
                <span className="font-bold text-ink block leading-tight">{review.name}</span>
                <span className="text-[10px] text-ink-mute block">{review.role}</span>
                <span className="text-[10px] text-accent-ink font-semibold block mt-0.5">
                  {review.carModel} · {review.location}
                </span>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
