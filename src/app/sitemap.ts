import { MetadataRoute } from "next";
import { listModels } from "@/server/repositories/models";
import { listUsedCars } from "@/server/repositories/used-cars";
import { env } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const locales = ["en", "hi"];

  const staticRoutes = [
    "",
    "/cars",
    "/used-cars",
    "/offers",
    "/emi-calculator",
    "/showrooms",
    "/about",
    "/contact",
    "/legal/privacy",
    "/legal/terms",
    "/legal/data-rights",
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of staticRoutes) {
      entries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: route === "" ? 1.0 : 0.8,
      });
    }
  }

  // Resiliently fetch models and used cars, falling back to static routes on any failure
  try {
    const [models, usedCars] = await Promise.all([
      listModels().catch(() => []),
      listUsedCars().catch(() => []),
    ]);

    for (const locale of locales) {
      for (const model of models) {
        if (model?.slug) {
          entries.push({
            url: `${baseUrl}/${locale}/cars/${model.slug}`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
          });
        }
      }

      for (const car of usedCars) {
        if (car?.stock_id) {
          entries.push({
            url: `${baseUrl}/${locale}/used-cars/${car.stock_id}`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.8,
          });
        }
      }
    }
  } catch (error) {
    console.warn("⚠️ [sitemap] Dynamic inventory route fetch failed, returning static routes:", error);
  }

  return entries;
}
