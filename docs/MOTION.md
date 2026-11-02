# VROOMA — MOTION SPECIFICATION & ARCHITECTURE

## 1. Motion Philosophy & Budget

Motion in Vrooma reflects the precision engineering of a luxury passenger vehicle: whisper-quiet, responsive, and deliberate.
- **Strict Motion Constraints:**
  - Animate **ONLY** `transform` and `opacity` (plus `filter: blur` on entrances, maximum 12px, removed after).
  - Never animate `width`, `height`, `top`, or `left` (except the scrubbed accordion row height tween in pinned desktop mode).
  - **No Generic Hover Zoom:** Hover and focus states change border color and subtle box shadow only.
  - **One Accent Color:** `--accent` (#1FBF75). Serif-italic accent words alternate between `tone="mute"` (`--ink-mute`) and `tone="accent"` (`--accent-ink`).
  - **Aria-Hidden:** Every decorative motion layer has `aria-hidden="true"`. DOM order reads 100% logically without CSS.

---

## 2. Motion Stack

- **GSAP 3.12+:** Core animation engine with free plugins:
  - `ScrollTrigger`: Scroll position tracking, pinning, and scrubbing.
  - `DrawSVGPlugin`: SVG vector route drawing and circular inspection progress rings.
  - `MotionPathPlugin`: Waypoint tracking for map pins and vehicle routing.
- **Lenis 1.3+:** Momentum smooth scroll provider, strictly synchronized with `gsap.ticker.lagSmoothing(0)`.
- **Media Queries:**
  ```ts
  export const PIN_QUERY = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";
  export const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
  ```
- **Signature Eases:**
  - Entrance: `"expo.out"`
  - Scrubbed Moves: `"power2.inOut"`
  - Pops & Accents: `"back.out(1.6)"`
  - Default: `"power3.out"`

---

## 3. Pinned Scenes & Scrubbed Timelines

All pinned scenes are built with `PinnedScene` and `ShrinkScene`, executing ONLY under `PIN_QUERY`. On screens `<1024px` or under reduced motion, the layout drops pins completely and defaults to an accessible vertical stacked flow.

| Scene | Scroll Length | Focal Visual | Progress Scrub Timeline (0.00 – 1.00) | Mobile / Reduced Fallback |
|---|---|---|---|---|
| **5.1 HeroScene** | 450vh | `PhoneMockup` (-2deg) + White Model H Cutout | **0.00–0.12:** H1/body/car exit; phone translates x +24vw, scale 1.06.<br>**0.10–0.26:** H2 enters, 4 glass rows stagger in from left, confirmation chips pop.<br>**0.26–1.00:** 4 equal steps (0.185 each) cross-fading phone screens (Price → Slots → Used → Service) while active row expands height.<br>**0.94–1.00:** Upward translate (6vh) handoff. | Stacked layout; CSS-only hero intro (`@keyframes hero-word-rise`); interactive tap-accordion with CSS grid animation. |
| **5.3 WhyVrooma** | 160vh | 3 Trust Pillar GlassCards + Dark Bar | **0.00–0.50:** Large heading (scale 1.5) settles to scale 1.0; 3 cards rise (y 120 → 0, blur 12 → 0).<br>**0.50–0.80:** Mini-UIs animate (CountUp on price, slot chips pop, score circle draws with DrawSVG).<br>**0.80–1.00:** Dark workshop bar slides up (y 60 → 0). | Stacked cards with `<Reveal>`, static 140-point badge and service CTA bar. |
| **5.4 ShowroomsOrbit** | 260vh | SVG City Map Disc (Orb) | **0.00–0.45:** Orb shrinks (scale 1 → 0.62) and centers; 6 location chips fly out from orb center to stage targets.<br>**0.45–0.75:** Note card rises from bottom (y 80 → 0).<br>**0.75–1.00:** Dealership stats count up (showrooms, workshops, used cars, cars/year). | Static 2-column location grid, note card with instant stats. |
| **5.5 TransparentPricing** | 280vh | Tilted Car Cutouts A & B (Perspective 1200px) | **0.00–0.35:** Cars fly in from outer edges (x ±30vw, rotate ±14deg).<br>**0.35–0.70:** Heading scales to 0.55 top-center; cars shrink to 0.45 at upper edges.<br>**0.70–1.00:** 3 GlassCards rise itemising RTO tax, valid-until date, and upfront EMI. | Single static SUV profile, 3 stacked pricing cards with `<Reveal>`. |
| **5.6 InspectedUsed** | 260vh | Green Glass Medallion (`InspectedBadge`) | **0.00–0.50:** Badge shrinks (scale 1 → 0.65), heading scales to 0.75.<br>**0.50–1.00:** Left card (140-pt checklist dossier) and Right card (masked registration plate & DPDP consent) slide in (x ±60vw → 0). | Centred shield icon, 2 stacked cards with masked plate. |
| **5.8 BookingSteps** | 220vh | PhoneMockup + Real EMI Calculator Card | **0.00–0.70:** Phone rises (y +30vh, rotate 3 → 0); Left card (3 steps) and Right card (dark EMI calculator) enter from ±8vw.<br>**0.70–1.00:** Phone subtle -8% parallax over scene; live interactive EMI sliders update state. | Stacked 3 steps, interactive EMI sliders, and phone preview. |
| **5.10 FinalCta** | 140vh | Route Connector + MapPin + Model H | **0.00–0.70:** Dashed route line draws from Phone to Car via DrawSVG; map-pin follows path via MotionPathPlugin.<br>**0.70–1.00:** Car subtle emphasis scale (1.04). | Static car cutout with primary test drive CTA pill. |

---

## 4. Reduced-Motion & Mobile Architecture

- **Lenis Deactivation:** Lenis is completely bypassed when `window.matchMedia("(prefers-reduced-motion: reduce)").matches` is true.
- **Modal / Panel Suspension:** When any Sheet, Dialog, or the ChatWidget opens, `stopLenis()` is called; on dismissal, `startLenis()` resumes scrolling. All inner scrollable containers have `data-lenis-prevent`.
- **Instant Fallback:** Under reduced motion, all entrance animations resolve immediately (`opacity: 1`, `transform: none`, `filter: none`), completely avoiding motion sickness.
