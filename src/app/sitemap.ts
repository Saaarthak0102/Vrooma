import { MetadataRoute } from "next";
import { mockModels } from "@/data/mock/models";
import { mockUsedCars } from "@/data/mock/used-cars";
import { env } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
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

    // Dynamic model pages
    for (const model of mockModels) {
      entries.push({
        url: `${baseUrl}/${locale}/cars/${model.slug}`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.9,
      });
    }

    // Dynamic used-car pages
    for (const car of mockUsedCars) {
      entries.push({
        url: `${baseUrl}/${locale}/used-cars/${car.stock_id}`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  }

  return entries;
}

