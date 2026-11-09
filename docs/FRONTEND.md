# VROOMA — FRONTEND REFERENCE

Design system, motion, landing page, listing cards, buyer dashboard, buttons, performance, SEO and assets in one place. Tokens live in `src/app/globals.css`; the owner-facing rules are in `CLAUDE.md` sections 4 and 6.

## 1. Design philosophy
Premium showroom feel: large car photography, generous white space, one accent colour, a price and one clear next step on every car page, nothing on screen without a purpose.

## 2. Tokens and type
- Colours (CSS variables, mapped in Tailwind with `color-mix` so `bg-ink/5` style shades work): `--bg #EEF0F3`, `--surface #FFF`, `--ink #0F1720`, `--ink-soft #4B5563`, `--ink-mute #8A94A3`, `--dark #121A24`, `--accent #1FBF75`, `--accent-ink #0B8F56`, `--accent-soft #E3F7EE`, `--ok`, `--warn #F5A524`, `--danger #E5484D`, radii 10/16/24/pill, `--shadow-card`.
- Fonts via `next/font`: **Urbanist** (UI) and **Instrument Serif Italic** (one emphasised word per headline, never more).
- Mobile text floor 14px (`--fs-micro`); tap targets at least 44×44 (40 in dense console grids).
- Primitives in `src/components/ui/` wrap Radix: `Button` (primary accent, dark, secondary, ghost), `Badge` (pill), `Card`, `Input`/`Select` (44px), `EmptyState`, `Table`.
- Do: `formatINR()` for money; mask registration plates; a clear next step on each vehicle page; `notWired()` for pending work. Don't: hard-code rupee strings, `href="#"`, empty handlers.

## 3. Motion
- Animate only `transform` and `opacity` (entrance blur up to 12px, removed after). Never width/height/top/left (one exception: scrubbed accordion height in pinned desktop mode). Micro-interactions ≤ 250ms.
- No hover zoom, except listing-card media on `/cars`, `/used-cars`, `/offers` (scale ≤ 1.05, parallax ≤ 8px, transform only, pointer-fine devices). Cards themselves never scale. Hover effects use `@media (hover:hover) and (pointer:fine)`, never screen width.
- Stack: GSAP 3.12 (ScrollTrigger, DrawSVG, MotionPath) and Lenis smooth scroll on public pages only. No Three.js or WebGL. Pins run only under `(min-width:1024px) and (prefers-reduced-motion: no-preference)`; otherwise a stacked, accessible flow. Reduced motion resolves every entrance instantly and bypasses Lenis.
- Opening any sheet, dialog or the chat widget calls `stopLenis()`; scrollable inner areas carry `data-lenis-prevent`. Console routes use native scroll.
- Decorative motion layers are `aria-hidden`; DOM order reads correctly without CSS.
- Eases: entrance `expo.out`, scrubbed `power2.inOut`, pops `back.out(1.6)`, default `power3.out`.
- Buttons and dropdowns: origin-aware hover/press motion defined once in the button primitives; CTAs inside GSAP timelines are registered so timelines never fight their hover states.

## 4. Landing page (`/`)
CSS-only hero intro (`@keyframes hero-word-rise`) so the LCP text paints at once. Data comes from `getLandingData` (no hard-coded prices or showroom names).

| Scene | Length | Content | Mobile / reduced motion |
|---|---|---|---|
| HeroScene | 450vh | Phone mockup cycling Price, Slots, Used, Service | stacked, no pin |
| WhyVrooma | 160vh | Three trust pillars (price, slots, 140-point inspection) | stacked cards |
| ShowroomsOrbit | 260vh | Map orb with six location chips and stats | static grid |
| TransparentPricing | 280vh | Two car cut-outs and RTO / validity / EMI cards | one car, stacked cards |
| InspectedUsed | 260vh | Inspection medallion, 140-point card, masked plate card | stacked |
| FeaturedStrip | normal | Featured models | n/a |
| BookingSteps | 220vh | Three steps with the real EMI calculator | stacked |
| Reviews | normal | Sample customer cards | n/a |
| FinalCta | 140vh | Route line drawn from phone to car, test-drive CTA | static |

Plus a scrubbed wordmark footer. Landing-only components (PhoneMockup, InspectedBadge, Orb, MapPinRoute, SheenBackground) are pure CSS/SVG.

## 5. Listing cards (`/cars`, `/used-cars`, `/offers`)
Flip cards (`CarListingCard`, `UsedListingCard`, `OfferListingCard`, built on `ListingFlipCard` and `FlipGroup`, so opening one closes the others) in `src/components/listing/`. Other screens keep their own cards: `CarCard` (similar models), `SavedCarCard` (dashboard), landing `FeaturedStrip`.
- Full-width image band, no decorative arrow, no hover underline; hover = lift, soft shadow, subtle tint, media zoom within the motion budget. Dark primary button hover is a quiet shade shift.
- Tag words resolve by priority (`src/lib/listing-tags.ts`): new cars (e.g. family friendly for SUVs, EV), used cars (certified, low km, price drop). One tag per card.
- One stretched link per card keeps the whole card clickable while buttons stay independent; keyboard order and focus rings are preserved; flip is a button with `aria-expanded`.

## 6. Buyer dashboard
Bento layout of blocks: greeting, next appointment, counts (bookings, enquiries, saved), saved vehicles, recent chats, "My cars" (garage with reminder opt-in), data-rights panel. Density adapts to viewport height so it fits without page scroll on desktop; mobile opens panels as sheets. Account navigation sits in the navbar user menu (My profile, Dashboard, Sign out) and a dedicated profile page; the navbar name is vertically aligned by a shared header grid. Components are in `src/components/dashboard/`.

## 7. Console chrome
Staff and admin pages render no public header, footer, chat widget or Lenis; one top bar (`ConsoleShell`), spreadsheet-style grids with side panels, and an interactive Overview of charts per screen. Details: `docs/WIRING.md`, `docs/ROUTES.md`.

## 8. Performance (brief: under 2.5 s on 4G)
- Targets: LCP ≤ 2.0 s, INP ≤ 100 ms, CLS ≤ 0.05. Landing client JS well under 200 KB gzipped.
- `next/image` with correct `sizes`, fixed aspect ratios (no layout shift), `priority` only above the fold; fonts self-hosted through `next/font` with `display: swap`.
- Critical text and prices render on the server; filters sync through `nuqs`; heavy modules (PapaParse) are dynamically imported; third-party scripts deferred.
- Check for each new feature: server-rendered critical content, fixed image dimensions, deferred scripts, bundle size seen in `pnpm build`.

## 9. SEO
- Every model (`/cars/[modelSlug]`) and used car (`/used-cars/[stockId]`) is a server-rendered, indexable page with `generateMetadata` (title, description, canonical, OpenGraph).
- JSON-LD via `src/components/seo/` (`AutoDealer`, `Car`/`Vehicle`, `BreadcrumbList`), always serialised with `jsonLdString` (escapes `<`, U+2028 and U+2029).
- `src/app/sitemap.ts` lists static pages, active models and available used cars; `src/app/robots.ts` blocks `/staff`, `/admin` and `/api`. The site is English only; old `/en` and `/hi` URLs redirect.

## 10. Assets
- Approved vehicle illustrations are SVG cut-outs in `public/images/cars/` (`s`, `y`, `c`, `x`, `r`), de-badged and with no readable plates. Real photos are served from Supabase Storage.
- For studio photos, `scripts/make-cutouts.py` removes backgrounds (rembg) and exports WebP with alpha.

## 11. Frontend definition of done
Every change is checked at 360×740, 390×844, 768×1024, 1024×768, 1280×720, 1536×864, 1920×1080, landscape phone 667×375, touch with no hover, reduced motion and 200% zoom (`docs/TESTING.md`). Every route has `loading.tsx` and `error.tsx`; empty states use `EmptyState` with a recovery action; modals trap focus and close on Escape.
