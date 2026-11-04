# VROOMA BUILD INVENTORY & BUILD-TIME RESILIENCE AUDIT

**Generated:** 2026-11-04  
**Scope:** Root-cause analysis of build-time failures, import-time throws, and unhandled data exceptions during `next build`.

---

## 1. Repository TODO Throws

| File | Function / Line | Throw Statement | Reachable at Build Time? | Build Impact / Why |
|---|---|---|:---:|---|
| `src/server/repositories/models.ts` | `listModelVariants` (L48) | `throw new Error(...)` | **YES** | Pre-rendering model pages if database query fails |
| `src/server/repositories/models.ts` | `listModels` (L102) | `throw new Error(...)` | **YES** | Called in `cars/[modelSlug]` `generateStaticParams()` & landing `getLandingData()` |
| `src/server/repositories/models.ts` | `getModelBySlug` (L181) | `throw new Error(...)` | **YES** | Called in `cars/[modelSlug]` page render & `generateMetadata()` |
| `src/server/repositories/used-cars.ts` | `listUsedCars` (L68) | `throw new Error("TODO(day-3)...")` | **YES** | Called in `used-cars/[stockId]` `generateStaticParams()` & landing `getLandingData()` |
| `src/server/repositories/used-cars.ts` | `getUsedCarByStockId` (L82) | `throw new Error("TODO(day-3)...")` | **YES** | Called in `used-cars/[stockId]` page render & `generateMetadata()` |
| `src/server/repositories/pricing.ts` | `getPriceRule` (L59) | `throw new Error("TODO(day-3)...")` | **YES** | Called in `cars/[modelSlug]` page render & landing `getLandingData()` |
| `src/server/repositories/pricing.ts` | `listPriceRules` (L66) | `throw new Error("TODO(day-3)...")` | No | Admin pricing management |
| `src/server/repositories/showrooms.ts` | `listShowrooms` (L12) | `throw new Error("TODO(day-3)...")` | **YES** | Called in landing `getLandingData()` |
| `src/server/repositories/showrooms.ts` | `listWorkshops` (L22) | `throw new Error("TODO(day-3)...")` | **YES** | Called in landing `getLandingData()` |
| `src/server/repositories/slots.ts` | `listSlots` (L36) | `throw new Error("TODO(day-4)...")` | **YES** | Called in landing `getLandingData()` |
| `src/server/repositories/slots.ts` | `listDemoCars` (L46) | `throw new Error("TODO(day-4)...")` | No | Slot management / booking flow |
| `src/server/repositories/variants.ts` | `listVariantsByModel` (L10) | `throw new Error("TODO(day-3)...")` | No | Variant dropdowns / detail |
| `src/server/repositories/variants.ts` | `getVariantById` (L18) | `throw new Error("TODO(day-3)...")` | No | Detail queries |
| `src/server/repositories/bookings.ts` | `listBookings` (L12) | `throw new Error("TODO(day-4)...")` | No | Buyer dashboard (request time) |
| `src/server/repositories/bookings.ts` | `createBooking` (L24) | `throw new Error("TODO(day-4)...")` | No | Booking mutation (request time) |
| `src/server/repositories/leads.ts` | `listLeads` (L42) | `throw new Error("TODO(day-4)...")` | No | Staff inbox (request time) |
| `src/server/repositories/leads.ts` | `getLeadById` (L49) | `throw new Error("TODO(day-4)...")` | No | Staff lead detail (request time) |
| `src/server/repositories/leads.ts` | `createLead` (L108) | `throw new Error("TODO(day-4)...")` | No | Web lead submission (request time) |
| `src/server/repositories/leads.ts` | `updateLeadStatus` (L119) | `throw new Error("TODO(day-4)...")` | No | Staff lead action (request time) |
| `src/server/repositories/leads.ts` | `reassignLead` (L130) | `throw new Error("TODO(day-4)...")` | No | Staff lead action (request time) |
| `src/server/repositories/offers.ts` | `listOffers` (L12) | `throw new Error("TODO(day-4)...")` | No | Offers page (request time) |
| `src/server/repositories/offers.ts` | `listBanners` (L43) | `throw new Error("TODO(day-4)...")` | No | Banner query |
| `src/server/repositories/saved.ts` | `listSavedVehicles` (L45) | `throw new Error("TODO(day-4)...")` | No | Buyer saved items (request time) |
| `src/server/repositories/saved.ts` | `removeSavedVehicle` (L62) | `throw new Error("TODO(day-4)...")` | No | Buyer saved deletion (request time) |
| `src/server/repositories/trade-in.ts`| `createTradeInRequest` (L16) | `throw new Error("TODO(day-4)...")` | No | Trade-in mutation (request time) |
| `src/server/repositories/users.ts` | `listUsers` (L12) | `throw new Error("TODO(day-4)...")` | No | Admin user management (request time) |
| `src/server/repositories/users.ts` | `getUserById` (L19) | `throw new Error("TODO(day-4)...")` | No | Viewer lookup (request time) |
| `src/server/repositories/users.ts` | `updateUser` (L30) | `throw new Error("TODO(day-4)...")` | No | Profile update mutation |

---

## 2. Build-Time Exports, Pages, Layouts, Metadata, and Route Handlers

| File | Export Type | What Runs at Build | Failure Mode / Vulnerability |
|---|---|---|---|
| `src/app/[locale]/layout.tsx` | `generateStaticParams()` | Generates static params for locales `['en', 'hi']` | Safe (uses static routing array). |
| `src/app/[locale]/(public)/cars/[modelSlug]/page.tsx` | `generateStaticParams()` | Calls `listModels()` to get model slugs | Fails build if `listModels()` throws or database is unpopulated; lacks `dynamicParams = true`. |
| `src/app/[locale]/(public)/cars/[modelSlug]/page.tsx` | Page Component & `generateMetadata` | Calls `getModelBySlug()`, `listModels()`, `getPriceRule()` | Throws during static prerender if Supabase fails or price rule is unseeded. |
| `src/app/[locale]/(public)/used-cars/[stockId]/page.tsx` | `generateStaticParams()` | Calls `listUsedCars()` to get stock IDs | Fails build with `TODO(day-3): Supabase listUsedCars` when `NEXT_PUBLIC_USE_MOCK=false`; lacks `dynamicParams = true`. |
| `src/app/[locale]/(public)/used-cars/[stockId]/page.tsx` | Page Component & `generateMetadata` | Calls `getUsedCarByStockId()` | Throws during static prerender if Supabase throws. |
| `src/app/[locale]/(public)/page.tsx` | `export const revalidate = 60` | Calls `getLandingData()` at build / ISR | Fails build if any repository in `getLandingData` throws uncaught. |
| `src/app/sitemap.ts` | `sitemap()` (MetadataRoute) | Evaluates all sitemap entries at build time | Lacks `revalidate = 3600`; currently uses static mocks and lacks resilient fallback to static routes. |
| `src/app/robots.ts` | `robots()` (MetadataRoute) | Returns robots configuration | Safe (purely deterministic). |
| `src/app/[locale]/(public)/opengraph-image.tsx` | `export const runtime = "edge"` | ImageResponse dynamic edge generation | Generates build warning: `Using edge runtime on a page currently disables static generation`. |
| `src/app/[locale]/(buyer)/dashboard/page.tsx` | `export const dynamic = "force-dynamic"` | Dynamic server-rendered page | Safe (skipped during static generation). |
| Route Handlers (`src/app/api/**/route.ts`) | Handlers (`GET`, `POST`, etc.) | Next.js analyzes routes during build | Safe when using `NextRequest` or marked dynamic. |

---

## 3. Modules that Throw or Validate Env on Load

| Module | What Runs on Import / Load | Failure Mode / Vulnerability |
|---|---|---|
| `src/lib/env.ts` | Immediate Zod parsing + inline throw | Throws `FATAL SECURITY ERROR: ALLOW_DEV_LOGIN must never be enabled in production.` during `next build` whenever `ALLOW_DEV_LOGIN=true` is in `.env.local` (because Next.js sets `NODE_ENV=production` for builds). |
| `src/lib/env.ts` | Immediate Zod parsing | Lacks `APP_ENV`, lacks `SKIP_ENV_VALIDATION=1` bypass for CI pipelines, and treats build-time warnings as potential blockers. |
| `src/lib/supabase/admin.ts` | `createAdminClient()` | Throws `SUPABASE_SECRET_KEY is required` if invoked when `NEXT_PUBLIC_USE_MOCK=false` and keys missing. |
| `src/app/api/auth/dev-login/route.ts` | Route handler | Checked `NODE_ENV !== "development" || ALLOW_DEV_LOGIN !== "true"`; needs triple-check: `NODE_ENV === 'development' && APP_ENV !== 'production' && ALLOW_DEV_LOGIN === 'true'`. |

---

## 4. Edge Runtime Files

| File | Runtime Export | Imports | Resolution |
|---|---|---|---|
| `src/app/[locale]/(public)/opengraph-image.tsx` | `export const runtime = "edge"` | `import { ImageResponse } from "next/og"` | Change to `export const runtime = "nodejs"` to eliminate build warning and enable reliable static pre-generation. |

