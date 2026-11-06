import React from "react";
import type { Metadata } from "next";
import { getLandingData } from "@/server/landing-data";
import {
  HeroScene,
  WhyVrooma,
  ShowroomsOrbit,
  TransparentPricing,
  InspectedUsed,
  FeaturedStrip,
  BookingSteps,
  Reviews,
  FinalCta,
} from "@/components/landing";
import { DealerAndWebsiteJsonLd } from "@/components/seo/VehicleJsonLd";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const title = "Vrooma Lucknow — Authorised Brand X Dealership | On-Road Prices & Test Drives";
  const description =
    "Official Brand X dealership in Lucknow & Kanpur. Browse authentic on-road price breakups, certified pre-owned stock, and instant demo slot booking.";

  const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  return {
    title,
    description,
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: "Vrooma",
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function HomePage() {
  const data = await getLandingData();

  return (
    <div className="relative w-full overflow-hidden flex flex-col">
      <DealerAndWebsiteJsonLd />

      {/* Accessible skip link */}
      <Button
        href="#main-content"
        variant="primary"
        shape="pill"
        size="sm"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 text-xs font-bold"
      >
        Skip to main content
      </Button>

      <div id="main-content" className="w-full flex flex-col">
        {/* 1. HeroScene (pinned 450vh, CSS intro + accordion) */}
        <HeroScene data={data} />

        {/* 2. WhyVrooma (pinned 160vh, 3 trust pillars + dark bar) */}
        <WhyVrooma data={data} />

        {/* 3. ShowroomsOrbit (pinned 260vh, interactive map orb + location chips) */}
        <ShowroomsOrbit data={data} />

        {/* 4. TransparentPricing (pinned 280vh, tilted cars + 3 price cards) */}
        <TransparentPricing data={data} />

        {/* 5. InspectedUsed (pinned 260vh, shield badge + 140-pt dossier & DPDP card) */}
        <InspectedUsed data={data} />

        {/* 6. FeaturedStrip (P1 non-pinned, internal SEO links for models) */}
        <FeaturedStrip models={data.featuredModels} />

        {/* 7. BookingSteps (pinned 220vh, 3 steps + phone + real EMI sliders) */}
        <BookingSteps data={data} />

        {/* 8. Reviews (non-pinned, 3 verified customer glass cards) */}
        <Reviews />

        {/* 9. FinalCta (pinned 140vh, DrawSVG route + MotionPath pin follower) */}
        <FinalCta data={data} />
      </div>
    </div>
  );
}
