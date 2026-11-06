import React from "react";
import { notFound } from "next/navigation";
import { getModelBySlug, listModels } from "@/server/repositories/models";
import { getPriceRule } from "@/server/repositories/pricing";
import { computeOnRoad } from "@/lib/price-engine";
import type { OnRoadResult } from "@/server/actions/pricing";
import { constructMetadata } from "@/lib/seo";
import { VehicleJsonLd, BreadcrumbJsonLd } from "@/components/seo/VehicleJsonLd";
import { ModelDetailView } from "./ModelDetailView";
import { env } from "@/lib/env";
import { safeStaticParams } from "@/lib/static-params";

export const dynamicParams = true;

export async function generateStaticParams() {
  return safeStaticParams(async () => {
    const models = await listModels();
    return models.map((m) => ({
      modelSlug: m.slug,
    }));
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ modelSlug: string }>;
}) {
  const { modelSlug } = await params;
  try {
    const model = await getModelBySlug(modelSlug);
    if (!model) return {};

    return constructMetadata({
      title: `${model.name} Price in Lucknow, Specs & Test Drive`,
      description: `${model.tagline}. View official Lucknow ex-showroom and on-road prices, EMI calculator, and book a test drive today.`,
      path: `/cars/${modelSlug}`,
      image: model.hero_image,
    });
  } catch (error) {
    console.warn(`[ModelPage:generateMetadata] Error fetching model ${modelSlug}:`, error);
    return {};
  }
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ modelSlug: string }>;
}) {
  const { modelSlug } = await params;
  let model = null;
  let allModels: any[] = [];

  try {
    [model, allModels] = await Promise.all([
      getModelBySlug(modelSlug),
      listModels().catch(() => []),
    ]);
  } catch (error) {
    console.warn(`[ModelPage] Error loading model ${modelSlug}:`, error);
  }

  if (!model) {
    notFound();
  }

  // Pre-render the PUBLIC teaser only (headline total + validity) for the first variant in Lucknow.
  // The itemised breakup is never part of this static page: it is fetched per signed-in user by getOnRoadAction.
  const defaultVariant = model.variants?.[0];
  let initialOnRoad: OnRoadResult | null = null;
  if (defaultVariant) {
    try {
      const priceRule = await getPriceRule({
        cityId: "city-lucknow",
        variantId: defaultVariant.id,
        modelId: model.id,
        fuel: defaultVariant.fuel,
      });
      const headline = computeOnRoad({ variant: defaultVariant, rule: priceRule, includeAccessories: true });
      initialOnRoad = headline
        ? { tier: "teaser", total: headline.total, validUntil: headline.validUntil }
        : { tier: "unavailable" };
    } catch (e) {
      console.warn(`[ModelPage] Price rule fetch failed for ${defaultVariant.id}:`, e);
    }
  }

  return (
    <>
      <VehicleJsonLd
        name={`${model.name} Official Showroom`}
        image={model.hero_image}
        description={model.tagline}
        price={model.min_price}
        url={`${env.NEXT_PUBLIC_SITE_URL}/cars/${model.slug}`}
        bodyType={model.body_type}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "New Cars", item: "/cars" },
          { name: model.name, item: `/cars/${model.slug}` },
        ]}
      />
      <ModelDetailView
        model={model}
        allModels={allModels}
        initialOnRoad={initialOnRoad}
      />
    </>
  );
}

