import { Metadata } from "next";
import { env } from "./env";
import { BRAND_NAME, BRAND_TAGLINE } from "./constants";
import { DEFAULT_VEHICLE_ASSET } from "@/constants/vehicle-assets";

export interface GenerateSeoProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  locale?: string;
}

export function constructMetadata({
  title,
  description = "Discover new and certified used cars in Lucknow with transparent on-road prices, instant EMI calculation, and 5-minute lead response.",
  path = "",
  image = DEFAULT_VEHICLE_ASSET,
  locale = "en",
}: GenerateSeoProps = {}): Metadata {
  const fullTitle = title ? `${title} | ${BRAND_NAME}` : `${BRAND_NAME} - ${BRAND_TAGLINE}`;
  const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const canonicalUrl = `${siteUrl}/${locale}${path ? (path.startsWith("/") ? path : `/${path}`) : ""}`;

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${siteUrl}/en${path}`,
        hi: `${siteUrl}/hi${path}`,
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: BRAND_NAME,
      images: [
        {
          url: image.startsWith("http") ? image : `${siteUrl}${image}`,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
      locale: locale === "hi" ? "hi_IN" : "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image.startsWith("http") ? image : `${siteUrl}${image}`],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

