# Listing Cards Architecture & Component Usage

## Component Import Matrix

This table proves which components serve each screen and ensures that replacing listing cards on the three target catalog routes (`/cars`, `/used-cars`, `/offers`) does NOT break other screens (such as landing `FeaturedStrip`, model detail `SimilarCars`, or buyer dashboard `SavedCarCard`).

| Component | Files That Import / Define It | Target Screens / Usage | Action in this Phase |
|---|---|---|---|
| `CarCard` | `src/components/cars/CarGrid.tsx`<br>`src/components/cars/SimilarCars.tsx` | - `/cars/[modelSlug]` ("Explore Other Models" section via `SimilarCars`)<br>- Used by legacy `CarGrid` | **PRESERVED & UNMODIFIED**. Kept for `SimilarCars` and non-listing views. |
| `CarGrid` | `src/app/[locale]/(public)/cars/page.tsx` | - `/cars` (New car catalog) | Replaced in `/cars/page.tsx` with flip-card based grid using `CarListingCard` wrapped in `FlipGroup`. |
| `UsedCarCard` | `src/app/[locale]/(public)/used-cars/page.tsx` | - `/used-cars` (Certified pre-owned catalog) | **PRESERVED & UNMODIFIED**. Replaced in `/used-cars/page.tsx` with `UsedListingCard` wrapped in `FlipGroup`. |
| Legacy Offer Card | `src/app/[locale]/(public)/offers/page.tsx` (inline JSX) | - `/offers` (Promotions catalog) | Replaced in `/offers/page.tsx` with `OfferListingCard` wrapped in `FlipGroup`. |
| `SavedCarCard` | `src/app/[locale]/(buyer)/dashboard/page.tsx`<br>`src/app/[locale]/(buyer)/dashboard/saved/page.tsx` | - `/dashboard`<br>- `/dashboard/saved` | **PRESERVED & UNMODIFIED**. |
| Landing Featured Card | `src/components/landing/FeaturedStrip.tsx` (inline `GlassCard`) | - `/` (Homepage featured strip) | **FROZEN & UNTOUCHED**. |

---

## Flip Listing Cards Architecture

The new flip listing cards introduce interactive 3D cards exclusively for:
1. `/cars` -> `CarListingCard`
2. `/used-cars` -> `UsedListingCard`
3. `/offers` -> `OfferListingCard`

Each card is powered by `src/components/ui/flip-card.tsx` and `src/components/listing/ListingFlipCard.tsx`, governed by the `FlipGroup` context to ensure that opening one card automatically closes all others in the grid.
