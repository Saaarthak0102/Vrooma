import { Metadata } from "next";
import { env } from "./env";
import { BRAND_NAME, BRAND_TAGLINE } from "./constants";
import { DEFAULT_VEHICLE_ASSET } from "@/constants/vehicle-assets";

export interface GenerateSeoProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}

export function constructMetadata({
  title,
  description = "Discover new and certified used cars in Lucknow with transparent on-road prices, instant EMI calculation, and 5-minute lead response.",
  path = "",
  image = DEFAULT_VEHICLE_ASSET,
  noIndex = false,
}: GenerateSeoProps = {}): Metadata {
  const fullTitle = title ? `${title} | ${BRAND_NAME}` : `${BRAND_NAME} - ${BRAND_TAGLINE}`;
  const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const canonicalUrl = `${siteUrl}${path ? (path.startsWith("/") ? path : `/${path}`) : ""}`;

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: canonicalUrl,
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
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image.startsWith("http") ? image : `${siteUrl}${image}`],
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
    },
  };
}

