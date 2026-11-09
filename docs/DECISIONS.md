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

## ADR: English only (no Hindi, no locale concept)

- **Date:** 2026-11-06
- **Decision:** The app is English only. Removed: `/[locale]` routing, the language switcher, `messages/hi.json`, the Devanagari font, hreflang/Hindi open-graph SEO, per-user language preference, and the `useLocale`/`@/i18n/navigation` plumbing.
- **Supersedes:** the client brief and `CLAUDE.md` rule 3 ("Hindi and English"). That requirement was dropped on the owner's instruction; do not reintroduce it by following the old brief.
- **Kept:** `messages/en.json` as the one text catalogue (read through `next-intl` with a fixed `en`); the Hindi words in `src/lib/validation/discount.ts` (a staff-safety filter); the `profiles.locale` and `*_hi` database columns (never read or written by the app, no migration).
- **Compatibility:** `/en/...` and `/hi/...` permanently redirect to the unprefixed URL (`next.config.ts`); `safeNext` strips a legacy prefix.

## ADR: Email code only (no Google) and no profile address

- **Date:** 2026-11-07
- **Decision:** Sign-in is the emailed one-time code only. Google OAuth is removed: no button, no `startGoogle` action, no `/auth/callback` route. `/auth/confirm` (email link) stays.
- **Address:** The customer's address and PIN code are no longer kept on the profile. They are asked only in the home test drive and vehicle pickup parts of the booking forms and stored on that booking (`bookings.address`, `bookings.pincode`, migration `0027`). `profiles.address` and `profiles.pincode` were dropped. Erasure also wipes booking addresses.
- **Owner steps:** turn the Google provider off in Supabase Authentication (DEV, later PROD).

## ADR: Consolidated consoles, 2-3 screens per role

- **Date:** 2026-11-07
- **Decision:** Staff and admin use spreadsheet-style screens (`DataGrid`: sort, search, filters, CSV export) with side panels instead of detail pages. Consultant 2 screens, Used-Car Manager 3, Dealer Principal 3. One top bar (`ConsoleShell`) replaces both sidebars. Console routes render no public header, footer or chat, and use native scrolling (smooth-scroll hijacked the wheel inside panels).
- **Roles:** unchanged (`buyer`, `consultant`, `manager` = Used-Car Manager, `admin` = Dealer Principal). No new role; the service-advisor view is Bookings.
- **Access:** `/staff/stock` is manager and admin only; `/admin/*` is admin only (managers no longer reach it).
- **Redirects:** every old console URL redirects to its new home (see `docs/ROUTES.md`).
- **Buyer side:** deliberately unchanged.

## ADR: Staff always land in their console after sign-in

- **Date:** 2026-11-07
- **Decision:** `postSignInPath(role, next)` in `src/lib/console-nav.ts` is the single rule used by the email-code page, the sign-in sheet, the email link and onboarding. Consultant and manager go to `/staff`, admin to `/admin`, even when `next` points at a public page; a `next` inside a console they may open is kept. Buyers keep `next`.
- **Dev persona switch:** is a real sign-in through `/api/auth/dev-login`. It used to set a fake client-side profile, so the navbar looked signed in while `/dashboard` and `/profile` redirected to sign-in.

## ADR: Price band from past sales, manager only

- **Date:** 2026-11-07
- **Decision:** The used-car price band is server-computed from `used_car_sales_history` (same model, within 2 years, adjusted for year and km) and returned only to manager and admin. It replaces the earlier client-side flat ±6%. No comparable sales means no band. The manager still sets every final price.

## ADR: Types must match the schema

- **Date:** 2026-11-07
- **Context:** `src/types/db.ts` (hand-written) let code write columns that do not exist: trade-in `fuel`/`transmission`, offers `updated_at`, CSV import `row_count`. Each failed at runtime only.
- **Decision:** `tests/types-match-schema.test.ts` compares both type files table by table. Trade-in submissions no longer write or invent fuel/transmission (the form never asks for them). Banners store `/` when no link is given; price rules require a model or variant (the database already did).

## ADR: AI goes live through one guarded runner, with rule-based fallbacks

- **Date:** 2026-11-08
- **Context:** Until now nothing called an LLM: the chatbot, lead summary and draft were rule-based, and the Vercel AI SDK integration was deferred. The brief needs real summaries and drafts, a chatbot that answers from the catalog, and one domain agent, without ever quoting discounts or inventing prices.
- **Decision:** Claude through the Vercel AI SDK (`@ai-sdk/anthropic`). Haiku-class for the chatbot and digests, Sonnet-class for lead summaries, replies and the Lead Desk Agent. All calls go through `runAi()` (`src/server/ai/`): daily call cap, timeout, output guards (discount words, registration numbers, ungrounded prices), audit row in `ai_logs`, and the existing rule-based answer as fallback, so the site works with no key or when the provider is down.
- **Agent:** the Lead Desk Agent only *proposes* (reply, slot, status change, reassignment, task). A consultant approves, and the existing guarded server actions execute. It never negotiates; a discount request becomes "escalate to manager".
- **Prices:** the model never computes or invents a price. On-road prices come from `src/lib/price-engine.ts` / the admin tables, the used-car band from `src/lib/price-band.ts` (manager only); the model may only explain those numbers.
- **Privacy (DPDP):** buyer free text goes to a third-party processor. Only first name and the enquiry content are sent: no phone, email or full registration number. **Owner action:** add the processor to `/legal/privacy` before the first live AI feature ships.
- **Plan:** phases P0-P6 (foundation, lead summaries, chatbot, date triggers, garage and service records, Lead Desk Agent, digests).

## ADR addendum: Gemini (free AI Studio key) instead of Claude

- **Date:** 2026-11-08
- **Decision:** the first live model is Google Gemini through a free AI Studio key (`AI_PROVIDER=google`). Claude remains supported (`AI_PROVIDER=anthropic`); nothing else in the AI layer is vendor-specific.
- **Consequences:** free keys have small per-minute and per-day quotas, so the runner pauses model calls after a 429 (`rate-gate.ts`), supports a per-minute ceiling, fails fast instead of retrying, and limits chat tool steps. The site never depends on the model: every feature has a rule-based path.
- **Data:** the owner chose to run the free tier in production. On that tier Google may use prompts and responses to improve its products and reviewers may read them. Mitigations: `redactPii()` removes phone numbers, emails, registration numbers and ID numbers from every text sent; only the first name and the enquiry content go out; the privacy page (section 6) and the chat box disclose it; the key can be removed at any time. **Owner/legal action:** approve the wording of privacy section 6 and the chat notice before launch. A paid-tier key (no training on prompts) is a one-line change if this decision is revisited.

## ADR addendum: no model-driven tool calls while on a free Gemini key

- **Date:** 2026-11-08
- **Context:** the first real smoke tests on the free key showed Gemini 2.5 retired for new keys, Gemini 3 flash models overloaded or very slow, Pro models without free quota, and Gemini 3 tool calls failing with a missing thought_signature error under the AI library version in use.
- **Decision:** the chatbot and the Lead Desk Agent make **one** request each; the server gathers the facts (catalog, prices, server-computed EMI, open slots, workload) first. The tool-calling code was removed, not kept as a dead path. Models are chosen by trying them (`pnpm ai:smoke`), and a circuit breaker pauses calls after two failures in a row. Model-driven tool calling is recorded as future scope in `docs/AI.md`.

---

## ADR: Colour tokens use `color-mix` so opacity shades render

- **Date:** 2026-11-09
- **Context:** Tailwind v3 colours defined as bare CSS variables ignore `/NN` opacity shades, so `bg-ink/5` rendered nothing.
- **Decision:** theme colours are `color-mix(in srgb, var(--x) calc(<alpha-value> * 100%), transparent)`. Shades now render everywhere.

## ADR: Guarded migration runner with two targets

- **Date:** 2026-11-09
- **Decision:** `scripts/db-push.mjs` pushes to DEV (default) or PRODUCTION (`--target prod`, with `--dry-run`). Project refs are hard-coded, arguments are allow-listed, the linked project must match the target, `.env.local` must hold DEV values only, and anything unexpected blocks (fail-closed). Production passwords exist only in the operator's shell. Production moved to a fresh project (`zdasktnbdjkjtoncojsy`); the earlier prod (`ajumkjokagqfdikfguti`) and a deleted legacy project are on the forbidden list.

## ADR: Email first, WhatsApp by switch

- **Date:** 2026-11-08
- **Context:** WhatsApp Cloud API keys were not obtainable yet.
- **Decision:** `NOTIFY_CHANNEL` (default `email`) chooses the channel for replies and reminders. The WhatsApp adapter, templates and webhook code stay unchanged; setting `NOTIFY_CHANNEL=whatsapp` with keys switches over with no code change. SMS was removed.

## ADR: Demo data is one generated migration; demo login has no passcode

- **Date:** 2026-11-09
- **Decision:** `scripts/build-demo-migration.ts` generates `0042_demo_data.sql` (catalogue, nine demo accounts, activity, slots, and `private.refresh_demo_activity()`). `supabase/remove-demo-data.sql` undoes it. Demo mode (`DEMO_LOGIN` plus `NEXT_PUBLIC_DEMO_LOGIN`) shows one-click persona sign-in with no passcode, by the owner's explicit choice for a short demo; it is off by default, and `ALLOW_DEV_LOGIN` stays forbidden in production. Demo addresses (`isDemoAddress`) are never emailed: the outbox skips them.

## ADR: Business dates use the Indian calendar

- **Date:** 2026-11-09
- **Decision:** day-based rules (digests, reminders, "today" in bookings) use `istDateString` (Asia/Kolkata), not UTC, so evening events do not land on the wrong day.

## ADR: Retention for chats, AI logs and tasks

- **Date:** 2026-11-09
- **Decision:** a daily job (`/api/cron/data-retention`, 02:00 IST) deletes data past its retention period. Periods are in `docs/DATA_MODEL.md`. Chat transcripts, `ai_logs` and `lead_tasks` are included so personal data does not outlive its purpose.

## ADR: Free-tier AI limits and price-promise guard

- **Date:** 2026-11-09
- **Decision:** limits per feature: `AI_MAX_RPM=8`, `AI_DAILY_CALL_CAP=100`, fast calls time out at `AI_TIMEOUT_FAST_MS=30000` (routes allow 60 s). Past the cap or timeout the rule-based fallback answers. Beyond the discount word list, `findPriceConcessionPhrase` blocks promises such as "best price", "negotiable" or "I can reduce the price" in drafts, chat and staff replies.

