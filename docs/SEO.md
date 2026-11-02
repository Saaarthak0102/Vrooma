# VROOMA — SEO & STRUCTURED DATA STRATEGY

## 1. Indexing & Architecture

To capture high-intent automotive search volume across Lucknow, Kanpur, and Uttar Pradesh, every vehicle in the dealership catalog has a crawlable, indexable, pre-rendered URL:
- New Car Models: `/cars/[modelSlug]` (e.g. `/cars/model-h`, `/cars/model-s`)
- Certified Pre-Owned: `/used-cars/[stockId]` (e.g. `/used-cars/uc-1182`, `/used-cars/uc-1190`)
- Facilities & Hubs: `/showrooms`

### Metadata Generation (`generateMetadata`)
All dynamic routes implement Next.js `generateMetadata` for dynamic titles, descriptions, canonical URLs, and localized alternates (`en` and `hi`):
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const model = await getModelBySlug(params.modelSlug);
  return {
    title: `${model.name} On-Road Price in Lucknow & Kanpur | Vrooma Brand X`,
    description: `Explore ${model.name} ex-showroom & on-road price, mileage, specifications, EMI starting ₹${model.emi}/mo, and book a home test drive in Lucknow.`,
    alternates: {
      canonical: `https://vrooma.in/cars/${model.slug}`,
      languages: {
        en: `https://vrooma.in/en/cars/${model.slug}`,
        hi: `https://vrooma.in/hi/cars/${model.slug}`,
      },
    },
    openGraph: { ... },
  };
}
```

---

## 2. JSON-LD Structured Data

Vrooma injects Schema.org compliant structured data into the HTML `<head>` on key pages via `@/components/seo/*`:

### A. AutoDealer Schema (`OrganizationJsonLd.tsx`)
Rendered on Homepage and Showroom pages, establishing Vrooma's local Google Maps entity authority:
- Legal name, address, latitude/longitude, opening hours, phone numbers for Lucknow showrooms.

### B. Car & Vehicle Schema (`VehicleJsonLd.tsx`)
Rendered on `/cars/[modelSlug]` and `/used-cars/[stockId]`:
```json
{
  "@context": "https://schema.org",
  "@type": "Car",
  "name": "Brand X Model H ZX Automatic",
  "vehicleModelDate": 2026,
  "fuelType": "Petrol",
  "vehicleTransmission": "Automatic",
  "offers": {
    "@type": "Offer",
    "priceCurrency": "INR",
    "price": 1245000,
    "availability": "https://schema.org/InStock",
    "validThrough": "2026-11-30"
  }
}
```

### C. BreadcrumbList Schema (`BreadcrumbJsonLd.tsx`)
Provides search engines with clear path hierarchies: `Home > New Cars > Model H`.

---

## 3. Dynamic Sitemap & Robots Configuration

- `src/app/sitemap.ts`: Automatically indexes all static marketing pages and maps all active models (`/cars/*`) and available used inventory (`/used-cars/*`).
- `src/app/robots.ts`: Allows public search crawling while disallowing staff and admin consoles (`/staff/*`, `/admin/*`, `/api/*`).
