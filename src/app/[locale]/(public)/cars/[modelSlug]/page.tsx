import React from "react";
import { notFound } from "next/navigation";
import { getModelBySlug, listModels } from "@/server/repositories/models";
import { getPriceRule } from "@/server/repositories/pricing";
import { constructMetadata } from "@/lib/seo";
import { VehicleJsonLd, BreadcrumbJsonLd } from "@/components/seo/VehicleJsonLd";
import { ModelDetailView } from "./ModelDetailView";
import { env } from "@/lib/env";

export async function generateStaticParams() {
  const models = await listModels();
  return models.map((m) => ({
    modelSlug: m.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ modelSlug: string; locale: string }>;
}) {
  const { modelSlug, locale } = await params;
  const model = await getModelBySlug(modelSlug);
  if (!model) return {};

  return constructMetadata({
    title: `${model.name} Price in Lucknow, Specs & Test Drive`,
    description: `${model.tagline}. View official Lucknow ex-showroom and on-road prices, EMI calculator, and book a test drive today.`,
    path: `/cars/${modelSlug}`,
    image: model.hero_image,
    locale,
  });
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ modelSlug: string; locale: string }>;
}) {
  const { modelSlug, locale } = await params;
  const model = await getModelBySlug(modelSlug);
  const allModels = await listModels();

  if (!model) {
    notFound();
  }

  // Pre-fetch default price rule for first variant in Lucknow
  const defaultVariant = model.variants?.[0];
  const priceRule = defaultVariant
    ? await getPriceRule({
        cityId: "city-lucknow",
        variantId: defaultVariant.id,
        modelId: model.id,
      })
    : null;

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
