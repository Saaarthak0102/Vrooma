import React from "react";
import { JsonLd } from "./JsonLd";
import { DEALER_NAME, BRAND_NAME } from "@/lib/constants";
import { env } from "@/lib/env";

export interface VehicleJsonLdProps {
  name: string;
  image: string;
  description: string;
  price: number;
  currency?: string;
  vin?: string;
  bodyType?: string;
  fuelType?: string;
  url: string;
}

export function VehicleJsonLd({
  name,
  image,
  description,
  price,
  currency = "INR",
  vin,
  bodyType,
  fuelType,
  url,
}: VehicleJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Car",
    name,
    image,
    description,
    vehicleIdentificationNumber: vin,
    bodyType,
    fuelType,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: currency,
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "AutoDealer",
        name: DEALER_NAME,
      },
      url,
    },
  };

  return <JsonLd data={schema} />;
}

export interface BreadcrumbItemSchema {
  name: string;
  item: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItemSchema[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item.startsWith("http")
        ? item.item
        : `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}${item.item}`,
    })),
  };

  return <JsonLd data={schema} />;
}

export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: DEALER_NAME,
    alternateName: BRAND_NAME,
    url: env.NEXT_PUBLIC_SITE_URL,
    logo: `${env.NEXT_PUBLIC_SITE_URL}/images/placeholders/logo-mark.svg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "14/A, MG Marg, Hazratganj",
      addressLocality: "Lucknow",
      addressRegion: "Uttar Pradesh",
      postalCode: "226001",
      addressCountry: "IN",
    },
    telephone: "+91-522-4098800",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:30",
        closes: "20:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: "10:00",
        closes: "19:00",
      },
    ],
  };

  return <JsonLd data={schema} />;
}


export function DealerAndWebsiteJsonLd() {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AutoDealer",
        "@id": `${siteUrl}/#dealer`,
        name: DEALER_NAME,
        alternateName: BRAND_NAME,
        url: siteUrl,
        logo: `${siteUrl}/images/placeholders/logo-mark.svg`,
        telephone: "+91-522-4098800",
        address: {
          "@type": "PostalAddress",
          streetAddress: "14/A, MG Marg, Hazratganj",
          addressLocality: "Lucknow",
          addressRegion: "Uttar Pradesh",
          postalCode: "226001",
          addressCountry: "IN",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 26.852,
          longitude: 80.946,
        },
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            opens: "09:30",
            closes: "20:00",
          },
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: "Sunday",
            opens: "10:00",
            closes: "19:00",
          },
        ],
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: DEALER_NAME,
        url: siteUrl,
        logo: `${siteUrl}/images/placeholders/logo-mark.svg`,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "Vrooma Lucknow",
        publisher: { "@id": `${siteUrl}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/cars?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return <JsonLd data={schema} />;
}
