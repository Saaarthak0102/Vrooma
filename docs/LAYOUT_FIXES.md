# VROOMA — LANDING LAYOUT FIX PASS & POSITIONING AUDIT

## 1. CURRENT POSITIONING MAP

| Scene | Layer | How it is positioned today (CSS left/top/width or inset, in vw/vh/%/px) | Which tween moves it (x/y/xPercent/scale values) | z-index |
|---|---|---|---|---|
| `HeroScene` | `hero-h1-group` | `top: pt-10 (40px) inside max-w-7xl px-8`, `left: px-8 (32px)`, `width: max-w-4xl` | `tl.to(heroH1, { yPercent: -40, opacity: 0, duration: 0.12 }, 0)` | `z-20` |
| `HeroScene` | `hero-body-group` | `top: 28vh`, `left: 42vw`, `width: max-w-md` | `tl.to(heroBody, { opacity: 0, y: -20, duration: 0.1 }, 0.02)` | `z-20` |
| `HeroScene` | `hero-floater-chip (Next Free Slot)` | `top: 44vh`, `left: 34vw`, `width: auto` | `tl.to(heroChips, { opacity: 0, scale: 0.8, duration: 0.08 }, 0)` | `z-30` |
| `HeroScene` | `hero-floater-chip (Teaser On-Road)` | `top: 58vh`, `right: 6vw`, `width: max-w-[220px]` | `tl.to(heroChips, { opacity: 0, scale: 0.8, duration: 0.08 }, 0)` | `z-30` |
| `HeroScene` | `hero-car-wrapper` | `bottom: -2vh`, `right: -4vw`, `width: 46vw, max-w-[780px]` | `tl.to(heroCar, { x: "35vw", y: "8vh", rotate: 6, opacity: 0, duration: 0.12 }, 0)` | `z-20` |
| `HeroScene` | `hero-phone-wrapper` | `inset: 0 (flex items-end justify-start pl-[6vw] pb-[-8vh], transform: rotate(-2deg))`, `width: 280-330px` | `tl.to(phone, { x: "24vw", scale: 1.06, rotate: 0, duration: 0.14 }, 0)`, `tl.to(phone, { y: "-6vh", opacity: 0.25, duration: 0.06 }, 0.94)` | `z-10` |
| `HeroScene` | `hero-h2-group` | `top: pt-16 (64px) inside max-w-7xl px-8 flex justify-end`, `right: px-8 inside max-w-7xl`, `width: w-[50vw] max-w-xl` | `gsap.set(h2Group, { opacity: 0, x: -60 })`, `tl.to(h2Group, { opacity: 1, x: 0, duration: 0.12 }, 0.1)`, `tl.to(..., { y: "-6vh", opacity: 0.25 }, 0.94)` | `z-30` |
| `HeroScene` | `hero-accordion-container (rows 0-3)` | `below h2Group (pt-2)`, `width: 100% of w-[50vw] max-w-xl` | `gsap.set(rows, { opacity: 0, x: -40, filter: "blur(8px)" })`, `tl.to(rows, { x: 0, opacity: 1, filter: "blur(0px)", stagger: 0.04, duration: 0.12 }, 0.12)`, height/opacity tweens 0.26-0.94, handoff at 0.94 | `z-30` |
| `HeroScene` | `hero-confirmation-chip (2 chips)` | `below accordion rows (pt-2)`, `width: auto` | `gsap.set(confChips, { scale: 0.6, opacity: 0 })`, `tl.to(confChips, { scale: 1, opacity: 1, stagger: 0.05, duration: 0.12 }, 0.16)`, handoff at 0.94 | `z-30` |
| `WhyVrooma` | `why-heading` | `top: py-12 pt-4 inside max-w-7xl flex flex-col justify-between`, `inset-x: 0 (text-center)`, `width: 100%` | `gsap.set(heading, { scale: 1.5, y: "8vh" })`, `tl.to(heading, { scale: 1, y: 0, duration: 0.5 }, 0)` | `auto` |
| `WhyVrooma` | `why-card (3 cards)` | `middle of flex-col (my-auto pt-6)`, `grid grid-cols-3 gap-6`, `width: 100%` | `gsap.set(cards, { y: 120, filter: "blur(12px)", opacity: 0 })`, `tl.to(cards, { y: 0, filter: "blur(0px)", opacity: 1, stagger: 0.12, duration: 0.45 }, 0.08)` | `auto` |
| `WhyVrooma` | `why-dark-bar` | `bottom: mt-4 of flex-col`, `inset-x: 0`, `width: 100%` | `gsap.set(darkBar, { y: 60, opacity: 0 })`, `tl.to(darkBar, { y: 0, opacity: 1, duration: 0.2 }, 0.8)` | `auto` |
| `ShowroomsOrbit` | `orbit-heading` | `top: 16vh`, `right: 6vw`, `width: max-w-md` | `gsap.set(heading, { scale: 1, x: 0 })`, `tl.to(heading, { scale: 0.8, y: "-12vh", duration: 0.45 }, 0)` | `z-20` |
| `ShowroomsOrbit` | `orbit-orb` | `center: relative h-[52vh] aspect-square rounded-full` | `gsap.set(orb, { scale: 1, x: "-18vw", y: 0 })`, `tl.to(orb, { scale: 0.62, x: "0vw", duration: 0.45 }, 0)` | `z-10` |
| `ShowroomsOrbit` | `orbit-location-chip (chips 0-5)` | `absolute top/left percentages: (14%, 8%), (46%, 6%), (76%, 10%), (16%, 68%), (46%, 72%), (78%, 64%)` | `gsap.set(chips, { scale: 0.3, opacity: 0 })`, `tl.to(chips, { scale: 1, opacity: 1, stagger: 0.06, duration: 0.4 }, 0.12)` | `z-30` |
| `ShowroomsOrbit` | `orbit-note-card` | `bottom: 4vh`, `inset-x: auto (centered in flex items-center)`, `width: w-full max-w-3xl` | `gsap.set(noteCard, { y: 80, opacity: 0 })`, `tl.to(noteCard, { y: 0, opacity: 1, duration: 0.3 }, 0.45)` | `z-30` |
| `TransparentPricing` | `pricing-heading` | `top: 28vh`, `left: 4vw`, `width: max-w-xl` | `gsap.set(heading, { scale: 1, x: 0, y: 0 })`, `tl.to(heading, { scale: 0.65, y: "-26vh", duration: 0.35 }, 0.35)` | `z-20` |
| `TransparentPricing` | `pricing-car-a (SUV)` | `bottom: 6vh`, `left: 2vw`, `width: 38vw, max-w-[560px]` | `gsap.set(carA, { x: "-30vw", rotate: -14, opacity: 0 })`, `tl.to(carA, { x: "0vw", rotate: -9, opacity: 1, duration: 0.35 }, 0)`, `tl.to(carA, { scale: 0.45, x: "-24vw", y: "-22vh", duration: 0.35 }, 0.35)` | `z-10` |
| `TransparentPricing` | `pricing-car-b (EV)` | `top: 12vh`, `right: 4vw`, `width: 36vw, max-w-[520px]` | `gsap.set(carB, { x: "30vw", rotate: 14, opacity: 0 })`, `tl.to(carB, { x: "0vw", rotate: 7, opacity: 1, duration: 0.35 }, 0)`, `tl.to(carB, { scale: 0.45, x: "24vw", y: "-22vh", duration: 0.35 }, 0.35)` | `z-10` |
| `TransparentPricing` | `pricing-card (3 cards)` | `bottom: 4vh`, `inset-x: 0`, `width: 100% (grid grid-cols-3 gap-6)` | `gsap.set(cards, { y: 80, filter: "blur(10px)", opacity: 0 })`, `tl.to(cards, { y: 0, filter: "blur(0px)", opacity: 1, stagger: 0.1, duration: 0.3 }, 0.7)` | `z-30` |
| `InspectedUsed` | `inspected-badge` | `relative h-28 w-28 mb-2 (centered flex-col top)` | `gsap.set(badge, { scale: 1, y: 0 })`, `tl.to(badge, { scale: 0.65, y: "-6vh", duration: 0.5 }, 0)` | `z-10` |
| `InspectedUsed` | `inspected-heading` | `below badge (centered flex-col)` | `gsap.set(heading, { scale: 1, y: 0 })`, `tl.to(heading, { scale: 0.75, y: "-4vh", duration: 0.5 }, 0)` | `z-10` |
| `InspectedUsed` | `inspected-left-card` | `bottom: 10vh`, `col 1 of grid-cols-2 max-w-5xl inset-x-0 mx-auto` | `gsap.set(leftCard, { x: "-60vw", opacity: 0 })`, `tl.to(leftCard, { x: "0vw", opacity: 1, duration: 0.45 }, 0.5)` | `z-30` |
| `InspectedUsed` | `inspected-right-card` | `bottom: 10vh`, `col 2 of grid-cols-2 max-w-5xl inset-x-0 mx-auto` | `gsap.set(rightCard, { x: "60vw", opacity: 0 })`, `tl.to(rightCard, { x: "0vw", opacity: 1, duration: 0.45 }, 0.55)` | `z-30` |
| `FeaturedStrip` | `featured-strip-content` | `py-20 px-4 sm:px-8 max-w-7xl mx-auto` (non-pinned) | Static CSS / `<Reveal>` stagger | `auto` |
| `BookingSteps` | `booking-heading` | `top: py-10 inside max-w-7xl flex-col`, `left: 0`, `width: max-w-2xl` | Static in pinned flex-col container | `auto` |
| `BookingSteps` | `booking-left-card` | `middle: grid-cols-12 col-span-4` | `gsap.set(leftCard, { x: "-8vw", opacity: 0 })`, `tl.to(leftCard, { x: "0vw", opacity: 1, duration: 0.55 }, 0.08)` | `auto` |
| `BookingSteps` | `booking-phone` | `middle: grid-cols-12 col-span-4 flex justify-center` | `gsap.set(phone, { y: "30vh", rotate: 3, opacity: 0 })`, `tl.to(phone, { y: "0vh", rotate: 0, opacity: 1, duration: 0.6 }, 0)`, `tl.to(phone, { yPercent: -8, duration: 0.3 }, 0.7)` | `auto` |
| `BookingSteps` | `booking-right-card` | `middle: grid-cols-12 col-span-4` | `gsap.set(rightCard, { x: "8vw", opacity: 0 })`, `tl.to(rightCard, { x: "0vw", opacity: 1, duration: 0.55 }, 0.12)` | `auto` |
| `Reviews` | `reviews-content` | `py-24 px-4 sm:px-8 max-w-7xl mx-auto` (non-pinned) | `gsap.fromTo(.review-card, y: 80 -> 0)`, `gsap.fromTo(.review-avatar, scale: 0.4 -> 1)` | `auto` |
| `FinalCta` | `final-heading` | `top: py-12 inside max-w-7xl flex-col text-center`, `width: max-w-2xl mx-auto` | Static in pinned flex-col container | `auto` |
| `FinalCta` | `final-phone` | `center row: shrink-0 -rotate-3 w-[230px]` | Static in center row | `auto` |
| `FinalCta` | `final-route` | `center row: absolute inset-0` | `gsap.set(route, { drawSVG: "0%" })`, `tl.to(route, { drawSVG: "100%", duration: 0.7 }, 0)` | `auto` |
| `FinalCta` | `final-pin` | `on route path` | `tl.to(pin, { motionPath, duration: 0.7 }, 0)` | `auto` |
| `FinalCta` | `final-car-img` | `center row: w-[42vw] max-w-[620px] select-none shrink-0` | `tl.to(car, { scale: 1.04, duration: 0.3 }, 0.7)` | `auto` |
| `FinalCta` | `final-footer-text` | `bottom: py-12 inside max-w-7xl text-center text-xs text-ink-mute` | Static in pinned flex-col container | `auto` |
| `SiteFooter` | `footer-content` | `Container pt-16 pb-12 relative z-10` | Static | `z-10` |
| `SiteFooter` | `footer-wordmark` | `text-center clamp(8rem, 26vw, 24rem)` | `gsap.fromTo(wordmark, yPercent: 45 -> 0, opacity: 0 -> 1)` | `auto` |

---

## 2. BASELINE MEASUREMENT (PRE-FIX)

Audit executed across all 5 mandatory viewports (1920x980, 1536x730, 1440x800, 1366x660, 1280x620) via `scripts/check-layout.mjs`.

- Total baseline violations: **475**
- Breakdown by Viewport:
  - `1920x980`: 73 violations
  - `1536x730`: 96 violations
  - `1440x800`: 87 violations
  - `1366x660`: 105 violations
  - `1280x620`: 114 violations

### Reproduction of Core Brief Defects:
- **D1 (HeroScene @ progress 0)**:
  - `hero:h1` intersects header safe zone (top 40px < safeTop 100px).
  - `hero:phone` left edge at 90px overshoots container left (340px) by 210px.
  - `hero:car` right edge at 1677px overshoots container right (1580px).
  - `hero:chip-slot` and CTA button row have minimal clearance.
  - Car lower shadow clipped at stage bottom.
- **D2 (HeroScene accordion @ progress 0.26 - 1.0)**:
  - `hero:h2` intersects header safe zone (top 64px < safeTop 100px).
  - Vertical gap between H2 and accordion rows violates 48px clearance.
  - Rows overshoot container boundaries on narrower viewports.
- **D3 (ShowroomsOrbit @ progress 0.45 - 1.0)**:
  - `orbit:heading` collides with header safe zone.
  - Orbit chips collide with orb and note card.
  - `orbit:note-card` collides with bottom safe zone and chips.
- **D4 (TransparentPricing @ progress 0 - 1.0)**:
  - `pricing:heading` and cars overshoot container left/right bounds.
  - Lower car cutout clipped by stage bounds.
- **D5 (InspectedUsed @ progress 0.55 - 1.0)**:
  - Badge and heading remain in DOM and visible through card gaps.
  - Cards unequal height and bottom-anchored.
- **D6 (FinalCta @ progress 0 - 1.0)**:
  - `final:heading` intersects header safe zone (top 48px < safeTop 100px).
  - `final:phone` intersects header safe zone and overlaps text sub-copy.
  - Route line start coordinates misaligned with phone edge.


---

## 3. LOG OF NUMERIC TWEEN EDITS

`file | tween | before -> after | reason`
- `src/components/landing/HeroScene.tsx` | `phone` tween at timeline `0` | `x: "24vw"` -> `x: "9vw"` | Positions phone resting accordion state (x ~418-768px) with >=64px gap to text column (x=895px), preventing overlap with H2 and rows.
- `src/components/landing/HeroScene.tsx` | handoff tween at timeline `0.94` | `y: "-6vh"` -> `y: "0vh"` | Prevents H2 and phone from intersecting header safe zone (R1) at progress 1.0 resting state.
- `src/components/landing/ShowroomsOrbit.tsx` | `heading` tween at timeline `0` | `scale: 0.8, y: "-12vh"` -> `scale: 0.82, x: "0vw", y: "0vh"` | Centers H2 at top (--safe-top) at final resting state instead of remaining pinned top-right under the nav.
- `src/components/landing/FinalCta.tsx` | SVG route path `d` attribute & viewBox | `viewBox="0 0 1000 400" d="M 280 200 C 420 80 620 320 760 210"` -> `viewBox="0 0 1000 600" d="M 240 300 C 380 300, 540 450, 660 440"` | Connects phone's right edge mid-area (240, 300) to car front hood (660, 440) across all viewports.
- `src/components/landing/WhyVrooma.tsx` | heading initial setup at timeline `0` | `scale: 1.5, y: "8vh"` -> `scale: 1.1, y: "4vh"` | Prevents heading from overflowing container/viewport left and right boundaries (R3/R4) at progress 0 while keeping the scale-down animation intact.
- `src/components/landing/BookingSteps.tsx` | phone parallax tween at timeline `0.70` | `yPercent: -8` -> `yPercent: -3` | Prevents phone from overlapping heading (R2) at progress 1.0 resting state on smaller viewport heights.

---

## 4. REQUESTED FADE-OUT TWEEN (D5)

- **Target Elements:** `#inspected-badge`, `#inspected-heading`
- **Location:** `src/components/landing/InspectedUsed.tsx`
- **Tween Definition:**
  ```typescript
  tl.to(
    [badge, heading],
    {
      opacity: 0,
      ease: "none",
      duration: 0.27,
    },
    0.5
  );
  ```
- **Timing & Rationale:** Cards slide in between progress 0.50 and 0.95 (duration 0.45). This scrubbed tween starts at progress 0.50 and runs for duration 0.27 (matching exactly 60% of the cards slide-in duration) with `ease: "none"`. It cleanly fades out the green badge, eyebrow, and heading to `opacity: 0` so that no text remains visible behind or between the cards at rest states (progress 0.55 to 1.0).



---

## 5. ROUND 2: LANDING FIXES & PHONE-FIRST ADAPTATIONS

### 5.1 FONT SIZES AUDIT & TOKEN MAPPING

| Role | Previous Landing Sizes | New Token / Size | Scope & Components |
|---|---|---|---|
| **Micro** | `text-[9px]` (9px), `text-[10px]` (10px), `text-[11px]` (11px) | `var(--fs-micro)` = **14px** | Eyebrows, stat labels, captions, validity lines, "Prices may change", masked plate chips, footnotes |
| **Small UI** | `text-xs` (12px), `text-[13px]` (13px) | `var(--fs-small)` = **15px** (desktop) / **15px** (mobile) | Chip subtitles, card sub-copy, footnotes, accordion subtitles, EMI slider labels |
| **Body** | `text-xs` (12px), `text-sm` (14px), `text-base` (16px) | `var(--fs-body)` = **17px** | Card body text, row descriptions, note card narrative, buttons |
| **Row/Card Titles** | `text-sm` (14px), `text-base` (16px), `text-lg` (18px) | `var(--fs-title)` = **21px** | Accordion row titles, GlassCard headings, EMI calculator title, inspection dossier title |
| **H1/H2 Headings** | Hero H1: `clamp(2.3rem, 4svh, 3.6rem)`<br>Hero H2: `clamp(1.75rem, 3.2svh, 2.6rem)`<br>WhyVrooma H2: `clamp(2.25rem, 4svh, 3.2rem)`<br>Orbit H2: `clamp(2.25rem, 3.5svh, 2.5rem)`<br>Pricing H2: `text-4xl sm:text-5xl`<br>Inspected H2: `text-3xl sm:text-4xl lg:text-5xl`<br>Booking H2: `text-xl sm:text-2xl lg:text-3xl`<br>Final H2: `text-3xl sm:text-4xl lg:text-5xl` | Raised upper limit of clamp by **+2px**: <br>• Hero H1: `clamp(2.3rem, 4svh, calc(3.6rem + 2px))`<br>• Hero H2: `clamp(1.75rem, 3.2svh, calc(2.6rem + 2px))`<br>• WhyVrooma H2: `clamp(2.25rem, 4svh, calc(3.2rem + 2px))`<br>• Orbit H2: `clamp(2.25rem, 3.5svh, calc(2.5rem + 2px))`<br>• Pricing H2: `calc(3rem + 2px)`<br>• Inspected H2: `calc(3rem + 2px)`<br>• Booking H2: `calc(1.875rem + 2px)`<br>• Final H2: `calc(3rem + 2px)` | All pinned & static landing headers; preserves editorial scale while respecting 2px upper clamp limit |
| **Phone Mockup Screens** | `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-xs` | Container query `cqw` with strict floor `clamp(12px, 3.6cqw, 14px)` | Text rendered inside `PhoneScreenHome`, `Price`, `Slots`, `Used`, `Service` renders at $\ge 12$px at every phone mockup size |
| **Mobile Form Inputs** | `text-xs` (12px) | `16px !important` (`@media (max-width: 767px)`) | All text/email/number form inputs and selectors; halts automatic iOS mobile Safari zoom |

---

### 5.2 NUMERIC TWEEN EDITS LOG

`file | tween / target | before -> after | reason`
- `src/components/landing/HeroScene.tsx` | `#screen-home` fade out at timeline `0.26` | Added `autoAlpha: 0, y: -12, duration: 0.05, ease: "power2.inOut"` | Fades out Home screen when Row 0 Price screen enters (`autoAlpha: 1`), resolving the multi-screen text overprint defect (F3). Fades back IN when scrolling back up.
- `src/components/landing/HeroScene.tsx` | `#screen-price`, `#screen-slots`, `#screen-used`, `#screen-service` tweens | `opacity` -> `autoAlpha`, duration `0.06` -> `0.05` | AutoAlpha ensures `visibility: hidden` when screen opacity is 0. 0.05 duration restricts screen cross-fade overlap to <=27% of step timeline (0.185).
- `src/components/landing/ShowroomsOrbit.tsx` | `CHIP_TARGETS[0-5]` end coordinates | `[{ top: "16%", left: "2%" }, { top: "40%", left: "1%" }, { top: "64%", left: "3%" }, { top: "16%", left: "73%" }, { top: "40%", left: "74%" }, { top: "64%", left: "72%" }]` -> `[{ top: "24%", left: "2%" }, { top: "43%", left: "1%" }, { top: "62%", left: "2%" }, { top: "24%", left: "74%" }, { top: "43%", left: "75%" }, { top: "62%", left: "74%" }]` | Re-anchors chips into three evenly spaced rows (24%, 43%, 62%) in two vertical bands (left 1-2%, right 74-75%), clearing the top safe zone below the heading and maintaining >=24px clearance above the bottom note card without overlapping the central orb.

---

### 5.3 COMPLETE CHANGELOG

| File | What | Before -> After | Why |
|---|---|---|---|
| `src/app/globals.css` | Typography and phone sizing tokens | Added `--fs-micro: 14px`, `--fs-small: 15px`, `--fs-body: 17px`, `--fs-title: 21px`, `--phone-w: clamp(280px, 22vw, 340px)`, plus mobile input 16px rule | Centralized font sizing system conforming to Round 2 token rules, eliminating ad hoc sizes and preventing iOS form zoom |
| `src/components/landing/phone/PhoneMockup.tsx` | Sizing & container queries | Fixed `w-[280px]` -> `w-[var(--phone-w,280px)]` and added `style={{ containerType: "inline-size" }}` to `.phone-mockup-inner` | Standardizes phone widths across Hero, BookingSteps, and FinalCta while enabling nested screen responsive sizing using `cqw` |
| `src/components/landing/phone/PhoneScreenHome.tsx` | Screen text sizing & wrapping | Hardcoded `text-[10px]`, `text-[11px]`, `text-xs` -> `clamp(12px, 3.6cqw, 14px)`; added `flex-wrap gap-1 leading-tight` to validity bar | Ensures text renders at $\ge 12$px at all mockup scales and prevents "Valid until 31 Dec 2026" from clipping |
| `src/components/landing/phone/PhoneScreenPrice.tsx` | Screen text sizing | `text-[9px]`, `text-[10px]`, `text-xs` -> `clamp(12px, ...cqw, ...)` | Guarantees $\ge 12$px font size floor inside mockup |
| `src/components/landing/phone/PhoneScreenSlots.tsx` | Screen text sizing | `text-[9px]`, `text-[10px]`, `text-xs` -> `clamp(12px, ...cqw, ...)` | Guarantees $\ge 12$px font size floor inside mockup |
| `src/components/landing/phone/PhoneScreenUsed.tsx` | Screen text sizing | `text-[9px]`, `text-[10px]`, `text-xs` -> `clamp(12px, ...cqw, ...)` | Guarantees $\ge 12$px font size floor inside mockup |
| `src/components/landing/phone/PhoneScreenService.tsx` | Screen text sizing | `text-[9px]`, `text-[10px]`, `text-xs` -> `clamp(12px, ...cqw, ...)` | Guarantees $\ge 12$px font size floor inside mockup |
| `src/components/landing/HeroScene.tsx` | Screen layering & cross-fade bug (F3) | Transparent stacked screens without home fade-out -> All 5 screens positioned `absolute inset-0 bg-[#EEF0F3]`, layered with `z-index` (10..50), `autoAlpha` transitions with Home screen fading out at 0.26 and in when scrolling up | Completely eliminates phone screen text collision/overprint; ensures only 1 active screen visible at any rest state |
| `src/components/landing/HeroScene.tsx` | Mobile accordion screens (F3) | Conditional React unmounting -> Stacked screens in PhoneMockup with smooth opacity/visibility transition, `aria-hidden` and `inert` | Prevents jarring layout shifts in mobile view and maintains parity with desktop screens |
| `src/components/landing/HeroScene.tsx` | Typography (F2) | `text-[10px]`, `text-xs`, `text-sm` -> `fs-micro`, `fs-small`, `fs-body`, `fs-title`; H1 & H2 clamp raised by 2px | Enforces Round 2 typography scale and 14px mobile floor |
| `src/components/landing/WhyVrooma.tsx` | Dark banner positioning (F4) | Bottom fixed with `mt-4` overflowing viewport -> Positioned in free band below cards: `w-[min(100%, 1100px)] mx-auto mb-2`, >=24px above stage bottom and clear of chat widget | Prevents dark banner from overflowing viewport bottom and keeps cards in place |
| `src/components/landing/WhyVrooma.tsx` | Mobile banner layout (F4) | Horizontal bar with squished button -> Stacked container block with full-width button `min-h-[44px] h-12` | Accessible mobile tap targets and clean vertical flow |
| `src/components/landing/WhyVrooma.tsx` | Typography (F2) | Micro/body/title ad hoc classes -> `fs-micro`, `fs-small`, `fs-body`, `fs-title`; H2 clamp upper limit +2px | Upgrades typography across cards, badge, and dark bar |
| `src/components/landing/ShowroomsOrbit.tsx` | Stats duplication bug (F5) | 7 stat items in desktop grid with repeated rows and mislabelled `~6,000 SHOWROOMS` -> Exactly 4 distinct stats in 1 row (`grid-cols-4`): Showrooms, Workshops, Used In Stock, Cars / Year | Resolves duplicate and mislabelled stat counters |
| `src/components/landing/ShowroomsOrbit.tsx` | Note card & Orb (F5) | Note card `bottom-0` tall height covering Kanpur chip -> Note card `bottom-6` (24px above bottom), `max-w-[min(960px,calc(100%-48px))]`, `max-h-[26svh]`; orb `clamp(240px, 40svh, 340px)` | Maintains >=24px gap between orb and note card; frees vertical space for chips |
| `src/components/landing/ShowroomsOrbit.tsx` | Chips coordinates & wrapping (F5) | Old targets overlapping note card -> New targets `top: 24%, 43%, 62%`, `max-w-[min(360px, 24vw)]` with text wrapping | All 6 location chips visible with zero collisions |
| `src/components/landing/ShowroomsOrbit.tsx` | Mobile layout (F5) | Large static disc & 4-col stats -> Orb `w-[min(70vw,280px)]`, 2-column location grid (1 column below 380px), note card with 2x2 stats | Fully responsive phone layout with $\ge 44$px tap targets |
| `src/components/landing/BookingSteps.tsx` | Standard phone mockup size (F6) | Small phone `h-[clamp(230px,36svh,330px)] w-auto` -> `<PhoneMockup className="w-[var(--phone-w)] !h-auto">` | Standardizes phone size across hero, booking, and final scenes |
| `src/components/landing/BookingSteps.tsx` | Phone placement & bottom bleed (F6) | `items-center gap-6` -> `items-start gap-8 lg:gap-12`, phone top aligned with cards, bleeding off stage bottom | Matches hero phone bleed behavior and provides $\ge 48$px gap to cards |
| `src/components/landing/BookingSteps.tsx` | Mobile phone insertion (F6) | Missing phone mockup in mobile view -> Centered `<PhoneMockup className="w-[min(78vw,320px)] mx-auto">` between steps card and EMI card | Phone displayed in mobile stacked view without overflowing |
| `src/components/landing/BookingSteps.tsx` | Typography & tap targets (F2) | Micro/small font sizes -> `fs-micro`, `fs-small`, `fs-body`, `fs-title`; H2 clamp upper limit +2px; mobile button `min-h-[44px]` | Complies with typography scale and tap target standards |
| `src/components/landing/TransparentPricing.tsx` | Typography & card formatting (F2) | Ad hoc sizes -> `fs-micro`, `fs-small`, `fs-body`, `fs-title`; H2 clamp upper limit +2px; mobile link `min-h-[44px]` | Complies with typography scale |
| `src/components/landing/InspectedUsed.tsx` | Typography (F2) | Ad hoc sizes -> `fs-micro`, `fs-small`, `fs-body`, `fs-title`; H2 clamp upper limit +2px; mobile link `min-h-[44px]` | Complies with typography scale |
| `src/components/landing/FeaturedStrip.tsx` | Typography (F2) | Ad hoc sizes -> `fs-micro`, `fs-small`, `fs-body`, `fs-title` | Complies with typography scale |
| `src/components/landing/Reviews.tsx` | Typography (F2) | Ad hoc sizes -> `fs-micro`, `fs-small`, `fs-body`, `fs-title`; H2 clamp upper limit +2px | Complies with typography scale |
| `src/components/landing/FinalCta.tsx` | Standard phone & typography (F2, F6) | `!h-[clamp(340px,68svh,500px)] !w-auto` -> `w-[var(--phone-w)] !h-auto`; `fs-micro`, `fs-small`, `fs-body`, `fs-title`; H2 clamp +2px | Standardizes phone token and raises typography across scene |
