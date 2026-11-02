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

