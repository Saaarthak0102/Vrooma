# VROOMA — PREMIUM LISTING CARDS V2 SPECIFICATION

## 1. Component Usage Table & Architectural Decision

### Usage Matrix

| Component | Every File That Imports It | In Scope / Out of Scope |
|---|---|---|
| `CarCard` | `src/components/cars/CarGrid.tsx`<br>`src/components/cars/SimilarCars.tsx` | **IN SCOPE** (restyle in place) |
| `CarGrid` | `src/app/[locale]/(public)/cars/page.tsx` | **IN SCOPE** (consumes restyled `CarCard`) |
| `UsedCarCard` | `src/app/[locale]/(public)/used-cars/page.tsx` | **IN SCOPE** (restyle in place) |
| `SavedCarCard` | `src/app/[locale]/(buyer)/dashboard/saved/page.tsx`<br>`src/app/[locale]/(buyer)/dashboard/page.tsx` | **IN SCOPE** (restyle in place) |
| `SimilarCars` | `src/app/[locale]/(public)/cars/[modelSlug]/ModelDetailView.tsx` | **IN SCOPE** (consumes restyled `CarCard`) |
| `FeaturedStrip` | `src/app/[locale]/(public)/page.tsx` | **FROZEN / OUT OF SCOPE** (uses standalone `GlassCard`) |
| `OfferListingCard` | None (Parked flip-card branch) | **FROZEN / OUT OF SCOPE** |
| `CarListingCard` | None (Parked flip-card branch) | **FROZEN / OUT OF SCOPE** |
| `UsedListingCard` | None (Parked flip-card branch) | **FROZEN / OUT OF SCOPE** |
| `ListingFlipCard` | None (Parked flip-card branch) | **FROZEN / OUT OF SCOPE** |
| `FlipGroup` | None (Parked flip-card branch) | **FROZEN / OUT OF SCOPE** |

### Architectural Decision

The landing's `FeaturedStrip` under `src/components/landing/` does **not** import `CarCard` or `UsedCarCard`—it implements its own `GlassCard` layout. Per Section 1 specification:
> *"If the landing does not import them, restyle in place and do not create duplicates. Record the decision in the usage table."*

Therefore, `CarCard`, `UsedCarCard`, and `SavedCarCard` are **restyled in place** using the new shared primitives (`NotchCard`, `NotchMedia`, `NotchTag`, `NotchArrow`). No duplicate components are created.

---

## 2. Shared Primitives Architecture (`src/components/listing/`)

Pure CSS, zero client JavaScript for effects. All rendering is server-compatible.

### Tokens
```css
:root {
  --lc-surface: #FFFFFF;
  --lc-radius: 16px;
  --lc-media-inset: 8px;
  --lc-media-radius: 12px;
  --lc-notch-r: 14px;
  --lc-tab-h: 36px;
  --lc-arrow: 52px;
  --lc-btn-radius: 12px;
  --lc-ease: cubic-bezier(.22, 1, .36, 1);
  --lc-dur: 450ms;
  --lc-dur-btn: 300ms;
}

@media (max-width: 639px) {
  :root {
    --lc-tab-h: 34px;
    --lc-arrow: 48px;
    --lc-notch-r: 12px;
  }
}
```

### Primitives
1. **`NotchCard`**: Root article element with solid `--lc-surface` background, `--lc-radius` corner rounding, lifted shadow pseudo-layer (`::before`), 2px bottom accent hairline (`::after`), container queries for button responsiveness, and `:has(.notch-card-title-link:focus-visible)` focus ring.
2. **`NotchMedia`**: Media container with 16:10 aspect ratio (4:3 below 640px), `--lc-media-radius`, hover image zoom (1.045), diagonal single light-sweep animation (`::after`), bottom-left tag cutout mount, and bottom-right arrow cutout mount.
3. **`NotchTag`**: Bottom-left notch with `--lc-tab-h` height, `--lc-surface` background, top-right radius `--lc-notch-r`, max-width 62%, and two concave fillet squares painted with `radial-gradient(circle at 100% 0, transparent var(--lc-notch-r), var(--lc-surface) calc(var(--lc-notch-r) + .5px))` above and to the right.
4. **`NotchArrow`**: Decorative bottom-right notch (`aria-hidden="true"`, not focusable, not a link) with `--lc-arrow` dimensions, `--lc-surface` background, top-left radius `--lc-notch-r`, two concave fillet squares painted with `radial-gradient(circle at 0 0, transparent var(--lc-notch-r), var(--lc-surface) calc(var(--lc-notch-r) + .5px))` above and to the left, and a centered 40px dark circle with 18px `ArrowRight` icon rotating from -45deg (↗) to 0deg (→) on hover.

---

## 3. Tag Hierarchy & Resolution Engine

Pure function in `src/lib/listing-tags.ts`:

### New Car Tags (Priority Order)
1. `isFeatured === true` → `"featured"` (with 6px accent dot)
2. `hasActiveOffer === true` → `"offer"` (with 6px accent dot)
3. `createdAt` within `NEW_ARRIVAL_DAYS = 60` → `"newArrival"` (no accent dot)
4. Fallback: `{ bodyType }` (translated body style, e.g. "Sedan", "SUV", no accent dot)

### Used Car Tags (Priority Order)
1. `listedAt` within `JUST_LISTED_DAYS = 14` → `"justListed"` (with 6px accent dot)
2. `km <= LOW_KM_THRESHOLD = 25000` → `"lowKms"` (no accent dot)
3. `owners === 1` → `"oneOwner"` (no accent dot)
4. `inspectionScore > 0` → `"inspected"` (no accent dot)
5. Fallback: `null` (hides tag notch completely)

---

## 4. Stretched Link & Accessibility Hierarchy

1. Entire card acts as a single cohesive `<article>` landmark.
2. The vehicle title link (`.notch-card-title-link`) uses `::after` (`position: absolute; inset: 0; z-index: 1`) to make the entire card surface clickable.
3. Interactive buttons, swatches, and badges sit at `position: relative; z-index: 2` with explicit click and keyboard targets.
4. Focus rings (`outline: 2px solid var(--accent); outline-offset: 3px`) remain unclipped.
5. All text maintains $\ge 12\text{px}$ floor (tab label) and $\ge 14\text{px}$ for specifications.
6. Buttons maintain a minimum height of 44px for touch targets.

---

## 5. ROUND 2 SPECIFICATION & CHANGE LOG

### Summary of Round 2 Changes
- **C1. Remove Arrow Everywhere**: Deleted decorative bottom-right arrow circle and concave cutouts from all cards. Removed `NotchArrow` component, CSS, `--lc-arrow` tokens, and hover rules.
- **C2. Full-Width Image**: Image band spans the card's full width inside the 1px card border (`margin-inline: calc(var(--lc-pad) * -1)`). Single token `--lc-pad` (16px mobile, 20px from 640px) locks card padding and media negative margins together. Tab text has left padding `var(--lc-pad)` lining up flush with title and specs below. Straight band with square side edges.
- **C3. Remove Green Line on Hover**: Deleted the bottom hairline (`.notch-card::after` scaleX animation). Preserved card lift, shadow layer fade, soft green border tint (`color-mix`), image zoom, and light sweep.
- **C4. Tag Words for SUV and EV**: Added `SUV_EV_TAG_OVERRIDES_OTHERS = true` in `lib/constants.ts`. SUVs resolve to `"familyFriendly"` ("Family friendly" / "परिवार के लिए"), EVs resolve to `"ecoFriendly"` ("Eco friendly" / "पर्यावरण अनुकूल"). EV beats SUV when a model is both. No accent dot on these tags.
- **C5. Better, Quieter Dark Primary Button Hover**: Removed text roll, duplicate label markup, and accent ring. Applied shade shift (`color-mix(in srgb, var(--dark) 88%, white)`), single soft light sweep (`::after` 105deg gradient translateX -130% -> 130% over 700ms), 1px top highlight (`::before` opacity fade), arrow icon translateX(3px) over 250ms, active press scale(0.985), and accessible focus ring.

### Round 2 Change Log (`file | what | before -> after`)

| File | What | Before -> After |
|---|---|---|
| `src/components/listing/NotchArrow.tsx` | Arrow primitive deletion | Existed with concave fillets and dark arrow circle -> Deleted file entirely |
| `src/components/listing/index.ts` | Export cleanup | `export * from "./NotchArrow";` -> Removed export |
| `src/components/listing/NotchMedia.tsx` | Media primitive arrow removal | Rendered `<NotchArrow>` with `showArrow` and `isBooked` props -> Clean media container with full-width band and tag only |
| `src/components/listing/ListingCardSkeleton.tsx` | Skeleton cutout matching | Arrow notch cutout placeholder -> Removed arrow cutout; added `paddingLeft: "var(--lc-pad)"` to tab placeholder |
| `src/components/listing/listing-card.css` | Token definition | `--lc-arrow: 52px; --lc-media-inset: 8px; --lc-media-radius: 12px;` -> Removed; added `--lc-pad: 16px;` (20px at >=640px) |
| `src/components/listing/listing-card.css` | Card padding synchronization | `padding: 16px;` (20px >=640px) -> `padding: var(--lc-pad);` |
| `src/components/listing/listing-card.css` | Bottom accent hairline removal | `.notch-card::after` with `scaleX(0 -> 1)` animation -> Deleted `.notch-card::after` and all related hover/focus rules |
| `src/components/listing/listing-card.css` | Full-width media band | `border-radius: var(--lc-media-radius); width: 100%;` -> `border-radius: 0; width: auto; margin-inline: calc(var(--lc-pad) * -1);` |
| `src/components/listing/listing-card.css` | Tag text alignment | `.notch-tag { padding: 0 16px 0 0; }` -> `.notch-tag { padding: 0 16px 0 var(--lc-pad); }` |
| `src/components/listing/listing-card.css` | Arrow CSS cleanup | `.notch-arrow`, `.notch-arrow-circle`, `.notch-arrow-icon` and hover rotation -> Completely removed |
| `src/components/listing/listing-card.css` | Primary button hover | Text roll (`.notch-btn-roll`), duplicate text span, inner accent ring -> Minimal shade shift (`color-mix(in srgb, var(--dark) 88%, white)`), single light sweep (`::after`), 1px top highlight (`::before`), arrow icon translateX(3px) |
| `src/lib/constants.ts` | SUV/EV priority override constant | Did not exist -> `export const SUV_EV_TAG_OVERRIDES_OTHERS = true;` |
| `src/lib/listing-tags.ts` | Tag resolution engine | Only `featured`, `offer`, `newArrival`, `{bodyType}` -> Added `familyFriendly`, `ecoFriendly`, EV detection (`body_type` or variants), SUV detection, and `SUV_EV_TAG_OVERRIDES_OTHERS` priority branching |
| `messages/en.json` | English tag translations | Missing `familyFriendly` and `ecoFriendly` -> `"familyFriendly": "Family friendly"`, `"ecoFriendly": "Eco friendly"` |
| `messages/hi.json` | Hindi tag translations | Missing `familyFriendly` and `ecoFriendly` -> `"familyFriendly": "परिवार के लिए"`, `"ecoFriendly": "पर्यावरण अनुकूल"` |
| `tests/listing-tags.test.ts` | Tag test suite | Tested v1 priority without SUV/EV tags -> Added comprehensive tests for SUV, EV, EV-beats-SUV, overrides true/false, sedan/hatchback unchanged, dot rules |
| `src/components/cars/CarCard.tsx` | New car card tag & button | No variants passed to `newCarTag`, button used text roll -> Passed `variants: model.variants`, simplified button DOM to `<span>Book Demo</span>` + `<ArrowRight>` |
| `src/components/used/UsedCarCard.tsx` | Used car card button & media | Passed `isBooked` to `NotchMedia`, button used text roll -> Clean `<NotchMedia>`, simplified button DOM to `<span>Book VIP view</span>` + `<ArrowRight>` |
| `docs/LISTING_CARDS_V2.md` | Architectural specification | Documented Round 1 primitives -> Added Round 2 specification and change log |

