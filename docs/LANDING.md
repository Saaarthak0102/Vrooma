# VROOMA — LANDING PAGE SPECIFICATION & SCENE DIRECTORY

This document catalogs every section of the high-fidelity public landing page (`/`), specifying copy keys, data sources, motion behavior, and mobile fallbacks.

---

## 1. Global UI & Foundation

- **Background:** Warm stone canvas (`--bg: #EEF0F3`) with fixed `<SheenBackground>` holding 3 rotated (-24deg) silver gradient bars with scrubbed scroll drift under `PIN_QUERY`.
- **SiteHeader:** Sticky desktop navbar with logo + brand mark, centre nav links, locale toggle (EN / हिं), user profile menu, and primary CTA pill. Uses an IntersectionObserver sentinel at 40px to transition into a bordered glass pill (`bg-white/70`, `backdrop-blur-[10px]`, `--shadow-card`). Mobile viewport provides full-screen slideout sheet with `data-lenis-prevent` and focus trapping.
- **GlassCard:** Standard automotive card (`rgba(255,255,255,0.88)` to `rgba(255,255,255,0.62)` on desktop with blur, solid on mobile) with subtle border and inset highlight.
- **PillButton:** Primary dark pill (`--dark`) with white text and hover nudge arrow; Secondary glass pill. Maximum one primary button per viewport.
- **Accent:** `<Accent tone="mute|accent">` renders Instrument Serif italic in English, and non-italic Noto Serif Devanagari in Hindi.

---

## 2. Scene-by-Scene Specifications

### 2.1 HeroScene (Pinned, 450vh)
- **Copy Keys:** `home.heroTitle`, `home.heroAccent`, `home.heroBody`, `home.browseCars`, `home.bookDemo`, `home.accordionH2`, `home.accordionAccent`, `home.row1Title`–`row4Title`.
- **Data Sources:** `data.heroModel` (Model H ZX Automatic NEW-H-02, ex-showroom and Lucknow teaser on-road), `data.nextSlot` (client-side idle refresh via `/api/slots?next=1`).
- **Desktop Motion:**
  - 0.00–0.12: H1, subline, and car cutout exit; PhoneMockup shifts to center (x +24vw, scale 1.06).
  - 0.10–0.26: H2 enters from left; 4 accordion rows stagger in; confirmation chips pop with `back.out(1.6)`.
  - 0.26–1.00: 4 equal steps (0.185 each) expanding each row's height while cross-fading phone screens:
    1. *Price Screen:* Itemised Lucknow on-road breakdown.
    2. *Slots Screen:* Live showroom demo car availability.
    3. *Used Screen:* 140-point certified vehicle with masked registration.
    4. *Service Screen:* 16-bay workshop booking.
  - 0.94–1.00: 6vh upward translation handing off to WhyVrooma.
- **Mobile / Fallback:** Stacked layout with CSS-only hero entrance (`@keyframes hero-word-rise`) ensuring LCP < 700ms. Interactive tap-accordion toggles phone screen via state.

### 2.2 WhyVrooma (Pinned, 160vh)
- **Copy Keys:** `home.whyTitle`, `home.whyAccent`, `home.whySubtitle`, `home.whyCard1Title`–`whyCard3Desc`, `home.whyDarkBar`.
- **Data Sources:** `data.heroModel`, `data.nextSlot`, `data.usedSample` (score: 94).
- **Desktop Motion:**
  - 0.00–0.50: Central heading scales down from 1.5 to 1.0; 3 GlassCards rise from y 120 with blur.
  - 0.50–0.80: Mini-UIs animate (CountUp on price breakup, slot chips pop, circular inspection score draws to 94% with DrawSVG).
  - 0.80–1.00: Dark workshop bar slides up from y 60.
- **Mobile / Fallback:** Vertical stacked cards wrapped in `<Reveal>`, static 140-point badge, and full-width workshop service card.

### 2.3 ShowroomsOrbit (Pinned, 260vh)
- **Copy Keys:** `home.orbitTitle`, `home.orbitAccent`, `home.orbitSubtitle`, `home.orbitBrief`.
- **Data Sources:** `data.locations` (3 showrooms, 2 workshops, 1 certified yard), `data.stats` (showrooms count, workshops count, available used cars, 340 staff, 6,000 cars/year).
- **Desktop Motion:** Built with `ShrinkScene`. Orb disc (SVG city map) scales from 1.0 to 0.62; 6 location chips fly out from orb center to stage target coordinates; note card rises with CountUp stats.
- **Mobile / Fallback:** Static SVG disc, 2-column grid of locations linking to `/showrooms#slug`, and static stats docket.

### 2.4 TransparentPricing (Pinned, 280vh)
- **Copy Keys:** `home.pricingTitle`, `home.pricingAccent`, `home.pricingSubtitle`, `home.pricingCard1Title`–`pricingCard3Desc`.
- **Data Sources:** `data.heroModel` (Lucknow RTO rule calculation), `data.emiDefaults`.
- **Desktop Motion:** Built with `ShrinkScene`. Two tilted car cutouts (SUV and EV fastback) enter from outside edges, settle, and shrink to upper corners; 3 GlassCards rise detailing itemised RTO road tax, valid-until dates, and upfront monthly EMI.
- **Mobile / Fallback:** Single car silhouette, stacked cards with `<Reveal>` and direct links to `/cars/model-h` and `/emi-calculator`.

### 2.5 InspectedUsed (Pinned, 260vh)
- **Copy Keys:** `home.inspectedTitle`, `home.inspectedAccent`, `home.inspectedLeftTitle`, `home.inspectedRightTitle`, `home.inspectedRightDesc`.
- **Data Sources:** `data.usedSample` (UC-1182 Model C VX Turbo Diesel: year 2022, 41,200 km, 1 owner, ₹8,45,000, masked plate `UP32 ** **** 4120`, 140-pt check checklist).
- **Desktop Motion:** Built with `ShrinkScene`. Central `InspectedBadge` (green glass medallion) scales to 0.65; Left card (inspection checklist dossier) and Right card (masked registration plate & DPDP rights) slide in from ±60vw.
- **Mobile / Fallback:** Centred shield badge, stacked checklist card, and DPDP privacy rights card.

### 2.6 FeaturedStrip (P1 Non-Pinned)
- **Copy Keys:** `home.featuredModels`, `home.featuredModelsSub`.
- **Data Sources:** `data.featuredModels` (top 4 models with base on-road teaser prices).
- **Motion:** Responsive 4-column card grid with staggered `<Reveal>` entrances. Provides key internal links for SEO indexing.

### 2.7 BookingSteps (Pinned, 220vh)
- **Copy Keys:** `home.bookingTitle`, `home.bookingAccent`, `home.bookingStep1`–`bookingStep3`, `home.planEmi`.
- **Data Sources:** Real interactive EMI engine via `lib/emi.ts` seeded by `data.emiDefaults`.
- **Desktop Motion:** PhoneMockup rises from y +30vh; Left card (3 steps) and Right dark card (live EMI loan sliders) slide in from sides; subtle -8% parallax over scene. Sliders update monthly EMI in real time with `aria-live="polite"`.
- **Mobile / Fallback:** Stacked 3-step checklist, mobile phone preview, and live interactive touch sliders.

### 2.8 Reviews (Non-Pinned)
- **Copy Keys:** `home.reviewsTitle`, `home.reviewsAccent`, `home.reviewsSubtitle`, `home.reviewsSample`.
- **Data Sources:** `src/data/content/testimonials.ts` (`isSample: true`).
- **Motion:** 3 GlassCards with initials avatars (no stock photos); cards rise from y 80 and de-blur; avatars pop with `back.out(1.6)`.

### 2.9 FinalCta (Pinned, 140vh)
- **Copy Keys:** `home.finalCtaTitle`, `home.finalCtaAccent`.
- **Data Sources:** `data.heroModel`.
- **Desktop Motion:** PhoneMockup on left, Model H cutout on right. A dashed SVG route line is drawn with DrawSVG while a map-pin icon follows the motion path via `MotionPathPlugin` and terminates at the car.
- **Mobile / Fallback:** Car image with clean `<Reveal>` entrance and primary test drive CTA pill.

### 2.10 SiteFooter
- **Copy Keys:** `footer.newsletterTitle`, `footer.newsletterConsent`, `footer.subscribe`.
- **Data Sources:** Live `POST /api/newsletter` with zod validation and DPDP consent requirement. Writes to `newsletter_subscribers` table (migration 0008).
- **Motion:** Giant "Vrooma" wordmark (Instrument Serif italic, clamp(8rem, 26vw, 24rem)) scrubs yPercent 45 → 0 and opacity 0 → 1 over the last 70vh of page scroll.

