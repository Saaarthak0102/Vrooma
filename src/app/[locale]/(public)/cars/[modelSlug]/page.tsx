import React from "react";
import { notFound } from "next/navigation";
import { getModelBySlug, listModels } from "@/server/repositories/models";
import { getPriceRule } from "@/server/repositories/pricing";
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
  params: Promise<{ modelSlug: string; locale: string }>;
}) {
  const { modelSlug, locale } = await params;
  try {
    const model = await getModelBySlug(modelSlug);
    if (!model) return {};

    return constructMetadata({
      title: `${model.name} Price in Lucknow, Specs & Test Drive`,
      description: `${model.tagline}. View official Lucknow ex-showroom and on-road prices, EMI calculator, and book a test drive today.`,
      path: `/cars/${modelSlug}`,
      image: model.hero_image,
      locale,
    });
  } catch (error) {
    console.warn(`[ModelPage:generateMetadata] Error fetching model ${modelSlug}:`, error);
    return {};
  }
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ modelSlug: string; locale: string }>;
}) {
  const { modelSlug, locale } = await params;
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

  // Pre-fetch default price rule for first variant in Lucknow
  const defaultVariant = model.variants?.[0];
  let priceRule = null;
  if (defaultVariant) {
    try {
      priceRule = await getPriceRule({
        cityId: "city-lucknow",
        variantId: defaultVariant.id,
        modelId: model.id,
      });
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
        price={model.min_price ?? 1095000}
        url={`${env.NEXT_PUBLIC_SITE_URL}/${locale}/cars/${model.slug}`}
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
        initialPriceRule={priceRule}
      />
    </>
  );
}

