# VROOMA — MOTION SPECIFICATION & BUDGET

## 1. Motion Philosophy

Motion in Vrooma must feel like a precision luxury vehicle: responsive, deliberate, and whisper-quiet.
- **Micro-Interactions Only (Phase 1):** Subtle elevations on car cards, springy modal entries, smooth accordion reveals, and reactive SLA countdown badges.
- **Strict Motion Budget:** Micro-interaction animations must never exceed **250ms**. Transitions use an elegant cubic bezier `[0.16, 1, 0.3, 1]` or standard `easeOut`.
- **Reduced Motion Support:** All animations must respect `prefers-reduced-motion: reduce`, defaulting instantly to final opacity and scale without movement.

---

## 2. Phase 1 Motion Implementation (In Place)

Phase 1 uses `motion/react` (Framer Motion) exclusively for lightweight layout and modal animations:

### Dialog & Modal Transitions
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.98, y: 8 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.98, y: 8 }}
  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
/>
```

### Card Elevation & Swatches
- Hover state: `transition: transform 0.2s ease, box-shadow 0.2s ease`.
- Swatch selection: `scale(1.1)` with 150ms spring response.

---

## 3. Phase 2 Animated Landing Page (Deferred)

The following high-fidelity landing scenes are explicitly deferred to Phase 2:
1. **Lenis Smooth Scroll:** Global inertial momentum scrolling with viewport velocity tracking.
2. **HeroScene:** Canvas-based 3D car turnstile responding to initial page mount.
3. **ShowroomsOrbit:** Interactive 3D orbital showcase of Lucknow dealerships pinned to scroll progress.
4. **TransparentPricing:** Pinned scroll-scrub breakdown dissecting on-road pricing layers into animated cards.
5. **InspectedUsed:** Visual exploded view of the 140-point vehicle inspection checklist.

> [!NOTE]
> All Phase 2 scenes currently render clean, static, accessible HTML/CSS placeholder sections in `src/components/landing/` to maintain 100% route completeness and visual appeal without introducing premature scroll overhead.

