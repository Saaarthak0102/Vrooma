# VROOMA — ARCHITECTURAL DECISION RECORDS (ADRs)

## ADR-001: Next.js 15 App Router & React 19
- **Context:** The dealership platform requires fast public search indexing (SSR) alongside highly reactive client dashboards (CSR) and steppers.
- **Decision:** Adopt Next.js 15 App Router with TypeScript `strict: true`.
- **Consequences:** Pages benefit from server-side rendering for SEO and JSON-LD schema generation, while client components handle interactive filters, loan sliders, and modals.

---

## ADR-002: Repository Pattern for Data Access Abstraction
- **Context:** Need to ship a complete, high-fidelity Phase 1 frontend that runs immediately offline without requiring a live cloud database, while enabling a seamless swap to Supabase in Phase 2.
- **Decision:** Isolate all data fetching and mutations behind domain interfaces in `src/server/repositories/*`. An environment flag `NEXT_PUBLIC_USE_MOCK=true` selects an in-memory mutable store or Supabase SSR client.
- **Consequences:** Zero UI components or API routes contain direct SQL or database driver code. Swapping to Supabase requires editing zero frontend files.

---

## ADR-003: Integer Rupees Representation
- **Context:** Floating-point arithmetic introduces rounding drift in financial calculations (road tax, insurance, GST, EMI).
- **Decision:** All monetary amounts in database schemas, types, and APIs are stored strictly as integer Indian Rupees (`BIGINT`).
- **Consequences:** Eliminates decimal rounding discrepancies; display formatting is handled by pure utility functions (`formatINR`, `formatLakh`).

---

## ADR-004: URL State Synchronization with `nuqs`
- **Context:** Car buyers filter inventory by multiple facets (price, body, fuel, transmission, year). Page reloads or React context state make URLs unshareable and degrade back/forward navigation.
- **Decision:** Utilize `nuqs` (Next.js URL query state) for all catalog filters.
- **Consequences:** Filter states are fully synchronized with the browser URL, crawlable, bookmarkable, and shareable via WhatsApp without full-page reloads.

---

## ADR-005: Strict Dead-Button Policy with `notWired()`
- **Context:** Prototypes often contain dead links (`href="#"`) or silent `onClick` handlers that confuse stakeholders and users.
- **Decision:** Prohibit dead links and empty callbacks. All actions pending backend integration must use `notWired("Action Label", targetDay)` and be registered in `docs/WIRING.md`.
- **Consequences:** Users receive immediate visual feedback via Sonner toasts, and developers maintain an automated audit trail tracked by `scripts/check-wiring.mjs`.

---

## ADR-006: Radix UI Primitives with Luxury Tokens
- **Context:** Dealership UI must feel like a bespoke automotive showroom rather than a generic boilerplate template.
- **Decision:** Wrap un-styled Radix UI primitives (`@radix-ui/react-*`) in `src/components/ui/` with custom CSS variable tokens (`--bg`, `--surface`, `--ink`, `--accent`).
- **Consequences:** Full keyboard accessibility (WAI-ARIA compliance) with bespoke luxury automotive aesthetics.


---

## ADR-007: GSAP + Lenis for Phase 2 Landing Orchestration (No Three.js)
- **Context:** The dealership brief emphasizes premium automotive feel, minimal aesthetic, and fast mobile performance (<2.5s on 4G). Heavy 3D WebGL (Three.js/Fiber) introduces 600KB+ initial bundles, high GPU battery drain, and poor 4G LCP.
- **Decision:** Use GSAP (ScrollTrigger, DrawSVGPlugin, MotionPathPlugin) combined with Lenis smooth scrolling. Pinned scenes run strictly on desktop under `PIN_QUERY = (min-width: 1024px) and (prefers-reduced-motion: no-preference)`. Never run pinned layouts or Lenis on mobile/reduced-motion.
- **Consequences:** Ultra-fluid 60fps scrubbed timelines on desktop while mobile devices get instant, accessible, vertical static flows with zero scroll jank.

---

## ADR-008: CSS-Only Hero Intro for Instant LCP (<700ms)
- **Context:** If hero headlines and car imagery wait for JavaScript hydration and GSAP initialization, the Largest Contentful Paint (LCP) metric suffers on mobile 4G networks.
- **Decision:** Execute the initial entrance of H1 words and hero car via pure CSS keyframe animations (`@keyframes hero-word-rise`) and inline `--i` stagger variables rendered directly on the server by the `<Words>` component.
- **Consequences:** The primary LCP element paints by ~500–700ms without blocking on JavaScript chunks.

---

## ADR-009: Zero SplitText Dependency
- **Context:** SplitText is a proprietary GSAP Club plugin requiring private license keys and adds runtime DOM manipulation overhead.
- **Decision:** Eliminate SplitText. Implement a lightweight Server Component `<Words>` that splits text strings into accessible DOM spans with CSS animation delays.
- **Consequences:** Zero external licensing complexity, full server-rendered SEO indexability, and identical visual luxury typography.

---

## ADR-011: Automated Layout Audit & Visual Verification via Playwright
- **Context:** Pinned GSAP desktop scenes have complex rest states across multiple viewport sizes (1920x980, 1536x730, 1440x800, 1366x660, 1280x620). Manual inspection alone is error-prone when verifying non-intersection with header zones, safe bounds, minimum card/text gaps, and mobile/reduced-motion integrity.
- **Decision:** Introduce `scripts/check-layout.mjs` using Playwright Chromium in devDependencies. Key DOM elements are marked with non-functional `data-layout` and `data-layout-kind` attributes. The script scrolls to rest progress states, captures screenshots, and mathematically evaluates rules R1–R5.
- **Consequences:** Provides regression testing for responsive landing page layouts, automated overlap detection, and visual audit screenshots in `docs/layout-audit/`.

---

## ADR-012: Unit & Component Testing with Vitest, @testing-library/react, and jsdom
- **Context:** Flip-card interactions, accessibility semantics, focus transitions, keyboard navigation (Escape, Enter, Space), and listing card behaviors require deterministic component-level test automation.
- **Decision:** Install `@testing-library/react`, `jsdom`, and `@testing-library/jest-dom` as devDependencies and configure Vitest with jsdom environment for DOM component tests.
- **Consequences:** Enables comprehensive unit verification of flip toggling, aria-expanded states, focus management, and child event propagation without requiring a full browser instance for fast CI/test execution.


---

## ADR-013: Site-Wide Button Motion & Origin-Aware Dropdowns via Pure CSS (Zero New JS Runtime)
- **Context:** To elevate Vrooma to automotive luxury standards, buttons require subtle tactile spring tap feedback, light sweeps, and status crossfades, while menus, selects, and popovers require origin-anchored physical scale/shift entrance animations. However, adding third-party UI libraries (such as EasyUI or Framer Motion) would increase client JS bundles, conflict with GSAP pinned timelines, and degrade mobile 4G LCP performance.
- **Decision:** Implement all button motion, springs, sweeps, and origin-aware dropdown transitions exclusively with pure modern CSS custom properties and keyframes in `src/styles/buttons.css` (imported once in `globals.css`):
  1. **Zero New JavaScript Runtime:** 0 bytes of new JavaScript libraries added.
  2. **Computed Spring Curve:** Implemented `--btn-ease-spring` using the CSS `linear()` timing function with 3.8% overshoot settling at 420ms based on damped harmonic oscillator physics ($\zeta = 0.72$, $\omega_n = 22$), with cubic-bezier fallback for legacy engines.
  3. **GSAP Insulation Architecture:** The outer `<button>`/`<Link>` provides only layout positioning and focus rings; all transforms, press scaling (`scale(.96)`), and sweep animations are strictly confined to `.btn__surface`. This prevents any collision with GSAP ScrollTrigger timelines.
  4. **Stable Layout Grid Stacking:** `.btn__content` uses a single CSS grid cell to crossfade label, loading spinner, and success check layers, preventing any button width jumps.
  5. **Origin-Aware Transitions:** Dropdown menus, selects, popovers, and tooltips read the primitive's exposed `--radix-*-content-transform-origin` and animate dynamically from the calculated `data-side` (top, bottom, left, right).
- **Consequences:** Eliminates layout jank, maintains strict zero JS bundle increase on the homepage and catalog routes, preserves full DPDP compliance and accessibility, and delivers ultra-smooth 60fps micro-interactions across touch and pointer devices.
