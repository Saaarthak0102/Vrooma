# VROOMA — CONTEXT & ARCHITECTURAL SPECIFICATION

> **Source of truth for humans and AI coding agents.**
> All agents and developers must read this document in full before proposing or applying code changes.

---

## 1. THE BRIEF (VERBATIM)

```
Client
Company A, Lucknow. Authorised dealer for one passenger car brand (called Brand X here) with 3 showrooms, 2 service workshops and a certified used-car yard. 340 staff, revenue ₹550–650 crore a year, about 6,000 new and 900 used cars sold a year.

Today
The website is a basic template with an enquiry form. Leads from the site, car portals, social ads and walk-ins are tracked in Excel; billing runs in the brand's dealer management system (DMS). Test drives and service bookings are fixed by phone. Used-car stock is shared as WhatsApp photos.

The problem
Assumptions: 4,500 online leads a month. 30% (1,350) are not called within 24 hours and convert at 2% instead of 6%: 1,350 × 4% = 54 cars lost a month × ₹25,000 dealer contribution = ₹13.5 lakh a month, ₹1.62 crore a year. Of 3,000 service calls a month, 20% (600) go unanswered and half of those owners (300) go elsewhere: 300 × ₹4,500 average bill × 30% margin = ₹4.05 lakh a month, ₹48.6 lakh a year. Total ₹2.11 crore a year.

Users
Car buyers and owners (mostly mobile), sales consultants and the lead desk, and service advisors. The Dealer Principal signs the deal.

The ask
Our website looks like every other dealer's and does nothing. I want buyers to browse new and used cars with real prices, see the on-road price and EMI, and book a test drive in a real slot without calling. Owners should book a service in a minute. Every enquiry should reach a named consultant within five minutes.

Must have
- Model and variant pages: photos, specs, colours, ex-showroom and on-road price by city (road tax, insurance, accessories) from an admin price table
- Certified used-car listings with filters, photos, inspection report and price
- Test-drive booking by showroom and demo car, and service booking by workshop bay capacity
- EMI calculator and trade-in request form
- Lead inbox for web enquiries and portal CSV imports, auto-assigned by showroom and model, with a response timer and status
- Admin CMS for models, prices, offers, used stock, banners and user roles

Core build
Software Engineering candidates must ship this slice end to end, in about 6 to 8 screens: model and used-car pages with on-road price, test-drive booking, lead inbox with auto-assignment, and admin for cars and prices. Roles: buyer and sales consultant. AI: buyer summary and first-reply draft. Hard part: on-road price breakup by city from admin tables. Mock payments, messages and outside systems, and seed from the sample data. The rest of MUST HAVE is optional depth.

Out of scope
- Online payment of booking amounts
- DMS integration (a daily CSV export instead)
- Spare parts e-commerce

Ai or automation
Leads are assigned and acknowledged automatically by WhatsApp or SMS template. AI summarises each buyer's needs, drafts a first reply, and suggests a price band for used cars from past sales of the same model, year and kilometres. When it is wrong: drafts are edited before sending and never quote discounts; the used-car manager sets every final price and is the only one who sees the suggestion; consultants can re-assign leads; on-road prices always come from the admin table.

Constraints
On-road prices must show the breakup, a validity date and a note that prices may change. Used-car listings show year, owners and kilometres but mask the full registration number. Buyer data is personal data under the DPDP Act 2023: consent checkbox and opt-out. English only (the owner dropped the original Hindi requirement; see docs/DECISIONS.md). Pages must load in under 2.5 seconds on 4G, and every model and used car needs its own indexable page for search.

Design
The client values good, minimal design: clean layouts, white space, a restrained palette and clear type, with nothing on screen that lacks a purpose. Design counts as much as features. The site should feel like a premium showroom: large car photography, generous spacing, one accent colour, and a price and a clear next step on every car page.

Budget and time
₹9 lakh, 8 weeks. Success: 90% of web leads called within 5 minutes; 400 online test-drive bookings a month within 6 months; unanswered service calls from 20% to under 5%.

Sample data
Stock ID | Type | Model | Variant | Fuel | Year | Km | Price ₹ | Status
NEW-H-02 | New | Model H | ZX automatic | Petrol | 2026 | 0 | 1245000 ex-showroom | Available
UC-1182 | Used | Model C | VX | Diesel | 2022 | 41200 | 845000 | Available
UC-1190 | Used | Model S | LX | Petrol | 2021 | 58600 | 512000 | Booked
```

---

## 2. PROJECT IDENTITY

- **Dealer Brand:** Vrooma (Authorised Dealer for passenger car brand "Brand X").
- **Territory:** Lucknow & Kanpur (Uttar Pradesh, India).
- **Physical Footprint:**
  - 3 New Car Showrooms (Hazratganj, Gomti Nagar, Kanpur Road).
  - 2 Service Workshops (Transport Nagar, Indira Nagar).
  - 1 Certified Used-Car Yard (Vrooma Pre-Owned Hub, Shaheed Path).
- **Organization Scale:** 340 staff; ~6,000 new cars sold/yr; ~900 certified used cars sold/yr; ₹550–650 crore annual revenue.
- **Business Problem:** Annual operational leak of **₹2.11 crore**:
  - **₹1.62 crore/year** lost from 1,350 delayed lead calls/month converting at 2% instead of 6% (54 lost sales × ₹25,000 dealer contribution).
  - **₹48.6 lakh/year** lost from 600 dropped service calls/month, losing 300 customers to outside shops (300 × ₹4,500 average bill × 30% margin).
- **Target User Personas:**
  1. *Car Buyer / Owner (Mobile primary):* Wants transparent on-road prices without dealership games, instant EMI breakdown, self-service test drive slot booking, and fast 60-second service booking.
  2. *Sales Consultant / Lead Desk (Desktop/Mobile):* Requires immediate auto-assignment of web and portal leads, real-time SLA countdown timers (<5 min target), AI buyer summarisation, and quick first-reply drafting.
  3. *Used-Car Manager:* Needs quick trade-in intake, AI-suggested historical valuation bands, 140-point digital inspection reports, and inventory management.
  4. *Dealer Principal / Admin:* Needs bird's eye view of the ₹2.11 cr leakage metric, auto-assignment rules, staff performance SLAs, and live city price tables.
- **Key Target Metrics:**
  - 90% of web leads called within 5 minutes.
  - 400+ online test drive bookings per month within 6 months.
  - Unanswered service calls dropped from 20% to < 5%.

---

## 3. HARD RULES FROM THE BRIEF

1. **Dynamic On-Road Price Engine:**
   - On-road prices are calculated dynamically from admin price rule tables for each city (Lucknow RTO, Kanpur RTO, etc.).
   - Breakup MUST itemize: Ex-Showroom, Road Tax (RTO), Registration / Smart Card fees, Insurance (1-year Comprehensive + 3-year Third Party), Dealer Logistics/Handling, Optional Accessories package, and TCS (1% on ex-showroom > ₹10,00,000).
   - Must display a validity timestamp (e.g., "Valid until 30 Nov 2026") and a disclaimer: *"Government taxes and insurance premiums are indicative and subject to change."*
2. **DPDP Act 2023 Compliance & Data Masking:**
   - All vehicle registration numbers on used cars MUST be masked: e.g., `UP32 ** **** 1234`. Full registration numbers are NEVER exposed to unauthenticated users or public pages.
   - Buyer data is personal data: all forms require an un-checked, explicit consent checkbox linking to Privacy Policy and Data Rights.
   - Dedicated `/legal/data-rights` page with self-serve data download and account erasure request workflows (`/api/me/delete`).
3. **English only (supersedes the brief's bilingual requirement):**
   - The whole app is English. There is no language switcher, no locale in URLs, no Hindi catalogue and no per-user language setting. `messages/en.json` is the single text catalogue; `next-intl` is used only to read it.
   - Old `/en/...` and `/hi/...` URLs permanently redirect to the unprefixed page.
   - The Hindi words in the discount filter (`छूट`, `डिस्काउंट`, `कम`) stay: they police what staff type to buyers, they are not UI language.
4. **Performance & SEO:**
   - Under 2.5 seconds First Contentful Paint / LCP on 4G network profiles.
   - Every car model (`/cars/[modelSlug]`) and used car (`/used-cars/[stockId]`) has an indexable, server-rendered page with dynamic OpenGraph tags, JSON-LD Schema (`Car`, `Vehicle`, `BreadcrumbList`, `AutoDealer`), and XML sitemaps.
5. **AI Safety & Guardrails:**
   - First-reply drafts generated by AI can NEVER mention discounts, price cuts, or waivers. The words `discount`, `price cut`, `off`, `waiver`, and the Hindi words `छूट`, `कम` are hard-blocked in the draft editor.
   - Used-car valuation suggestions are strictly restricted to the Used-Car Manager role and hidden from public views.
   - Final prices on used inventory are always set by the Used-Car Manager; on-road prices always originate from admin tables.

---

## 4. ADDED ARCHITECTURAL RULES

1. **Tech Stack & Architecture:**
   - Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind CSS v3 with CSS custom properties.
   - Radix UI primitives with custom styling tokens.
   - State management via URL params (`nuqs`) for all filter bars, tabs, and pagination.
   - Forms validated by `react-hook-form` + `zod` schemas.
   - Backend parity: Client code imports only repository interfaces from `src/server/repositories/*`. Data access is Supabase-backed (the in-memory mock store and `NEXT_PUBLIC_USE_MOCK` were removed in backend Phase 3); mock data now only seeds `supabase/seed.sql` and unit tests.
2. **Integer Rupees Convention:**
   - All monetary values in database schema, TypeScript types, and repository APIs are stored as integer rupees (e.g., `1245000` for ₹12.45 Lakh). Never floating-point decimals.
   - Display formatting strictly follows Indian numbering format (e.g., `₹12,45,000` or `₹12.45 Lakh`) via `formatINR()` and `formatLakh()`.
3. **Strict Dead-Button Policy:**
   - NO `href="#"`, empty callbacks, or buttons that silently do nothing.
   - All interactions that await future phase implementation must call `notWired(label, day)` from `@/components/dev/NotWired`.
   - Every un-wired placeholder is logged to the console, displays a contextual toast to the user, and is catalogued in `docs/WIRING.md`. Target count by Day 5 is **0**.
4. **Gating Architecture:**
   - Public users can view specs, photo galleries, base ex-showroom prices, and general information.
   - Viewing the detailed RTO/insurance on-road price breakup and the full 140-point inspection report requires entering phone/email (or 1-click test auth in dev).
   - Unauthenticated test-drive bookings auto-create a guest session without breaking the booking flow.
5. **UI States & Accessibility:**
   - Every route directory must supply `loading.tsx` (skeleton loaders) and `error.tsx`.
   - Empty states use `@/components/ui/EmptyState` with a clear recovery CTA.
   - Full keyboard navigability: all modals, sheets, and popovers trap focus and dismiss on `Escape`.
6. **Motion & Interaction Budget:**
   - UI micro-interactions use `motion` (Framer Motion) with a strict limit: maximum 250ms duration, subtle spring curves (`easeOut`).
   - Rule exception: "No hover zoom" still holds EXCEPT listing-card media on `/cars`, `/used-cars` and `/offers`: image scale <= 1.05 and pointer parallax <= 8px, transform only, pointer-fine devices only. Cards themselves never scale.
   - Landing page GSAP/Lenis canvas animations are isolated to Phase 2. Phase 1 provides clean placeholder sections.
7. **Frontend Verification & Definition of Done (EVERY frontend change):**
   - Standing rule: verify across standard viewports: 360×740, 390×844, 768×1024, 1024×768, 1280×720, 1536×864, 1920×1080, landscape phone 667×375, touch device (no hover), `prefers-reduced-motion`, and 200% browser zoom.
   - Hover effects are strictly chosen with `@media (hover:hover) and (pointer:fine)`, never by screen width.

---

## 5. FLIP LISTING CARDS ARCHITECTURE

Interactive 3D flip cards are deployed exclusively on the three main catalog routes (`/cars`, `/used-cars`, `/offers`). Detailed architecture, component mapping, and accessibility guarantees are documented in [docs/LISTING_CARDS.md](file:///d:/Vrooma/docs/LISTING_CARDS.md).

## 5. GATING TABLE, ROUTE MAP & DATA MODEL

### Gating Matrix

| Route / Action | Public / Anonymous | Authenticated Buyer | Sales Staff | Admin / Manager |
|---|---|---|---|---|
| Browse New Models (`/cars`) | Full access | Full access | Full access | Full access |
| Model Specs & Ex-Showroom | Full access | Full access | Full access | Full access |
| On-Road Price Breakup | Lead Gate (Name/Phone) | Full access | Full access | Full access |
| Browse Used Cars (`/used-cars`) | Full access (masked reg) | Full access (masked reg) | Full access | Full access |
| Used Car 140-pt Inspection | Lead Gate (Name/Phone) | Full access | Full access | Full access |
| Book Test Drive / Service | Auto-creates Lead | Full access | Assisted Booking | Full access |
| Buyer Dashboard (`/dashboard`) | Redirect to Sign-in | Full access | Full access | Full access |
| Lead Desk (`/staff`), Bookings (`/staff/bookings`) and Chats (`/staff/chats`) | 403 Forbidden | 403 Forbidden | Assigned leads (consultant) / all (manager, admin) | All leads |
| Used Stock (`/staff/stock`) | 403 Forbidden | 403 Forbidden | 403 for consultants; managers and admins only | Full access |
| Admin console (`/admin`, `/admin/catalog`, `/admin/team`) | 403 Forbidden | 403 Forbidden | 403 Forbidden | Admin only |
| AI Used Price Suggestion | Hidden | Hidden | Hidden | Used-Car Manager only |

### Master Route Table

- `/` — Modern homepage with car carousel, trust pillars, and leakage counter.
- `/cars` — New car catalog with budget, fuel, body, transmission filters.
- `/cars/[modelSlug]` — Car model deep-dive: 360 gallery, color swatches, variant selector, specs, gated on-road price breakup.
- `/used-cars` — Certified pre-owned inventory with inspection badge, km/year/fuel filters, masked reg numbers.
- `/used-cars/[stockId]` — Used car inspection dossier, photo gallery, gated 140-pt report, EMI widget.
- `/book/test-drive` — 5-step test drive booking wizard (Showroom → Demo Car → Date & Bay Slot → Driver details + DPDP consent → Instant confirmation).
- `/book/service` — 4-step workshop service booking wizard by workshop bay capacity.
- `/emi-calculator` — Loan calculator with real-time sliders, amortisation schedule, and direct variant pre-population.
- `/trade-in` — Instant valuation form with AI price band estimation.
- `/offers` — Active festive and retail promotions with claim CTA.
- `/showrooms` — Interactive showroom and workshop locator with maps, hours, and direct call/WhatsApp triggers.
- `/about` & `/contact` — Dealership credentials, history, and contact matrix.
- `/legal/privacy`, `/legal/terms`, `/legal/data-rights` — DPDP compliance, cookie policy, and data erasure request portal.
- `/dashboard/*` — Buyer account portal: booked drives, service status, saved vehicles, enquiries, DPDP profile download.
- `/staff` — Lead Desk (all staff): KPI strip, spreadsheet of leads with live SLA timers and inline stage, side panel with AI summary, discount-guarded reply, reassign and activity; CSV import dialog.
- `/staff/bookings` — test drives and service in one grid, plus workshop bay load for the next 7 days (all staff).
- `/staff/chats` — support chats the buyer chatbot handed to a consultant: status KPIs, grid, side panel with the AI brief, live transcript and a discount-guarded reply box (all staff; consultants see only their own).
- `/staff/stock` — Used Stock (manager and admin): stock grid, final price, manager-only price band from past sales, inspection scorecard, audited registration reveal, vehicle intake, and the Trade-ins tab.
- `/admin` — Overview (admin): live success metrics and the ₹2.11 cr leakage monitor; tabs for the AI reply log and system health.
- `/admin/catalog` — Models and variants, on-road price rules, offers, banners (tabs).
- `/admin/team` — People and roles, showrooms and bay capacity, lead routing rules, slot calendar (tabs).
- Old `/staff/leads*` and `/admin/*` deep links redirect to these screens. Each non-buyer role has at most 4 screens: consultant 3, manager 4, admin 3 of its own.

### Core Data Model Entities

- `models` & `variants`: Vehicle specifications, fuel types, transmission, ex-showroom pricing, photo assets, color palettes.
- `price_rules`: City RTO percentages, flat registration fees, insurance brackets, handling charges, accessory kits.
- `used_cars`: Certified stock items, condition ratings, inspection JSON dockets, masked registration plates.
- `leads`: Customer contact, source, interest, qualification score, SLA countdown, assigned consultant.
- `bookings`: Test drive demo cars and workshop service bay bookings with real calendar slots.
- `slots`: Configurable capacity slots by showroom/workshop bay.
- `users`: Consultants, managers, admins, and verified buyers with role-based policies.
- `ai_logs`: Audit trail of AI-generated summaries, reply drafts, consultant edits, and final transmissions.

---

## 6. DESIGN TOKENS & VISUAL SYSTEM

```css
:root {
  --bg: #FAFAF9;              /* Warm stone background */
  --bg-sheen: #F5F5F4;        /* Subtle gradient sheen */
  --surface: #FFFFFF;         /* Card background */
  --surface-glass: rgba(255, 255, 255, 0.85); /* Blurred glass modal/header */
  --ink: #1C1917;             /* Primary text */
  --ink-secondary: #78716C;   /* Muted text */
  --ink-tertiary: #A8A29E;    /* Subtle borders & placeholders */
  --border: #E7E5E4;          /* Card and divider lines */
  --dark: #0C0A09;            /* Deep black for contrast buttons/bars */
  --dark-surface: #1C1917;    /* Dark cards */
  --accent: #E11D48;          /* Vrooma Crimson accent */
  --accent-ink: #FFFFFF;      /* Text on accent */
  --accent-subtle: #FFE4E6;   /* Pill backgrounds */
  --success: #15803D;         /* Success green */
  --warning: #B45309;         /* SLA warning amber */
  --error: #DC2626;           /* SLA breach red */
  --radius-pill: 9999px;      /* Interactive chips and badges */
  --radius-card: 16px;        /* Modern automotive cards */
  --shadow-card: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
  --shadow-elevated: 0 20px 40px -15px rgba(0, 0, 0, 0.1);
}
```

- **Typography:**
  - Sans UI: **Urbanist** (clean, geometric, ultra-legible automotive typography).
  - Accent Serif: **Instrument Serif Italic** (editorial luxury emphasis for headline keywords, e.g. *Precision*, *Heritage*, *Luxury*).
- **Rule:** Never use more than ONE accent word per headline.
- **Rule:** Mobile tap targets must be $\ge 44 \times 44$ px.

---

## 7. DEFINITION OF DONE PER SCREEN

| Screen / Area | Definition of Done |
|---|---|
| **Public Homepage** | Hero with editorial italic accent, Quick search bar, Featured models strip, Certified used carousel, Trust pillars, ₹2.11 cr revenue impact badge, interactive FAQ, bilingual toggle. |
| **Model Catalog (`/cars`)** | Grid view with responsive filters (body style, price range, fuel, transmission). Sticky quick-sort. Skeleton loading state. Empty search state. |
| **Model Detail (`/cars/[slug]`)** | Photo gallery with color switcher, variant picker updating specs in real time, gated on-road price modal with complete RTO/Insurance/TCS breakdown, sticky bottom booking bar, SEO schema. |
| **Used Catalog (`/used-cars`)** | Multi-faceted filter sheet (price, km, fuel, year). Grid with masked number plates (`UP32 ** **** 1234`), 140-pt certified badge, EMI estimates. |
| **Used Detail (`/used-cars/[id]`)** | Vehicle history timeline, photo viewer, inspection category scorecards, gated deep-inspection modal, instant test-drive booking trigger. |
| **Test Drive Booking** | 5-step wizard with real showroom selection, demo car availability, date picker with capacity-checked slots, driver license & DPDP consent, instant confirmation docket. |
| **Service Booking** | Workshop bay selection, scheduled maintenance vs repair toggle, time slot allocation, vehicle registration input, booking reference code. |
| **EMI Calculator** | Real-time interactive sliders for loan amount, tenure (1–7 yrs), interest rate (7–15%). Down-payment slider. Monthly EMI calculation, total interest, and full amortisation breakdown table. |
| **Trade-In Estimator** | Vehicle valuation intake (brand, model, year, km, condition). Instant AI valuation range calculation based on historical Lucknow used car transactions. |
| **Buyer Dashboard** | Summary cards for active bookings and test drives, saved vehicles wishlist, enquiry status, DPDP personal data download and erasure options. |
| **Staff Lead Desk** | Real-time inbox table with color-coded SLA countdown clocks (<5m target, ok, warning, breached). Filter by showroom and status. |
| **Staff Lead Dossier** | Complete buyer interest profile, AI buyer summary card, auto-drafted reply composer with hard discount word blocking, lead re-assignment dialog. |
| **Staff CSV Lead Import** | Drag-and-drop CSV importer (PapaParse), live column preview, duplicate phone detector, showroom auto-assignment engine. |
| **Admin Executive Console** | Real-time ₹2.11 cr leakage audit card showing live response rates, car catalog CRUD, city price rule simulator, used car manager AI price suggestion view, staff assignment rules, AI draft audit log. |

---

## 8. CURRENT STATUS & NEXT STEPS

- **Phase 1 (Complete):**
  - Full project structure, configuration files, and dependencies installed.
  - Complete domain schemas, database migrations, and seed datasets created.
  - Pure arithmetic price calculation and loan amortisation engines written with 100% unit test coverage.
  - All 28 frontend pages, staff portals, admin consoles, and buyer dashboards built with responsive UI, skeleton loaders, and mock data.
  - Strict dead-button audit implemented with zero silent buttons.
  - Complete bilingual translations (`en` and `hi`) in place.
- **Phase 2 (Complete - High-Performance Landing Page & Motion Architecture):**
  - High-performance GSAP 3.12+ (ScrollTrigger, DrawSVGPlugin, MotionPathPlugin) + Lenis smooth momentum scroll.
  - Zero Three.js / WebGL overhead: pure CSS and SVG transforms, respecting reduced motion and mobile battery constraints.
  - CSS-only hero intro (`@keyframes hero-word-rise`) ensuring instant paint (LCP < 700ms).
  - Complete scene suite: HeroScene (450vh), WhyVrooma (160vh), ShowroomsOrbit (260vh), TransparentPricing (280vh), InspectedUsed (260vh), FeaturedStrip (P1), BookingSteps (220vh with real EMI calculator), Reviews (sample customer cards), FinalCta (140vh route drawing), and scrubbed wordmark footer.
  - Dynamic `getLandingData` server repository aggregator with zero hardcoded prices or showroom names.
  - DPDP Act 2023 compliance: used car plate masking (`UP32 ** **** 4120`) and newsletter subscription table (migration 0008) with unticked explicit consent.
  - Full test coverage (30 tests) passing with 0 ESLint warnings.
- **Backend Phases 0–6 (Complete):**
  - Real Supabase auth, onboarding and role guards; production schema with RLS, RPCs, cron and storage (migrations `0001`–`0019`); mock store removed.
  - Slots, test-drive and service bookings, lead auto-assignment with SLA flagging, CSV import/export, outbox; profile, consent, data rights and newsletter; security hardening, CI and release checklist.
  - Status and deferrals: `docs/backend/STATUS.md`.
- **Console consolidation (Complete):**
  - Staff and admin use 2-3 spreadsheet-style screens per role with side panels (consultant 2, manager 3, admin 3); one top bar, no public header, footer or chat on console routes; native scrolling there.
  - Staff always land in their console after any sign-in (`postSignInPath`); the dev persona switch is a real sign-in.
  - Each console screen opens with an interactive Overview (funnel, donuts, bars, trends; click to filter the table). Aggregation is in `src/lib/analytics.ts`; verified by `pnpm charts:console`. See `docs/WIRING.md`.
  - Every console feature is verified against Supabase by `pnpm e2e:console` (42 checks) and every screen's layout by `pnpm layout:console`. See `docs/backend/STATUS.md` section 10 for fixed bugs and known limits.
- **Support chat handoff (Complete, migration `0028`):**
  - The buyer chat box (`ChatWidget`) is answered by a rule-based bot (`src/server/ai/support-bot.ts`) that ends each answer with "Is your query solved, or would you like to connect with a Vrooma consultant?" (quick replies: solved / connect). Guests can chat too (guest token).
  - "Connect" creates a real lead (source `chat`) through `create_lead`, so showroom routing, the 5-minute SLA and the lead timeline apply; guests give name, mobile and DPDP consent inside the chat box. The AI brief (`chat_conversations.ai_context`) is shown to the consultant in `/staff/chats` and stored on the lead.
  - Consultant replies are blocked by the same discount filter; messages travel by Supabase Realtime (consultant side) and a 4 s poll (buyer side).
- **Remaining-items pass (code complete, 2026-11-07):** account-deletion cancel (`/restore-account`, migration `0033`), generated DB types as the single source, WhatsApp (Meta) adapter (SMS/MSG91 removed 2026-11-08: all messaging is WhatsApp + email), service-call tracking (`call_logs`, `/api/webhooks/calls`, migration `0034`), `pnpm check:cron`, `pnpm email:smoke`. See `docs/backend/STATUS.md` section 13.
- **Still upcoming (owner steps):**
  - Apply `0033`/`0034` on DEV, then promote `0028`-`0034` to PROD (`docs/backend/PROD_PROMOTION.md`).
  - Add the Vault secrets (`app_url`, `cron_secret`) so the HTTP cron jobs are scheduled (`docs/backend/CRON_SETUP.md`, verify with `pnpm check:cron`).
  - Accounts and keys: Resend (domain + `RESEND_API_KEY`), WhatsApp Cloud API (in progress), telephony vendor for `/api/webhooks/calls` (secret set, no vendor yet; the admin System page shows "not connected").
  - AI layer in progress (ADR 2026-11-08 in `docs/DECISIONS.md`, `docs/AI.md` section 5): P0 foundation is code complete (`src/server/ai/` runner, guards, audit log, migration `0035`, `@ai-sdk/anthropic`). Apply `0035`-`0041` on DEV (set `ALERT_EMAIL`; submit the two reminder WhatsApp templates), set `AI_PROVIDER_API_KEY`. P1 is code complete too (real lead briefing, buyer profile, first-reply draft, handoff brief; migration `0036`; works rule-based until a key is set). P2 is code complete (buyer chatbot answers through read-only catalog tools with grounding and link guards; rule-based bot remains the fallback). P3 is code complete (`/api/cron/automations`, migration `0037`: reminders, missing booking outcomes, escalations, price-rule/offer/DPDP expiry alerts to `ALERT_EMAIL`; consent gate still to build before any marketing-type message). P4 is code complete (migration `0039`: owner garage `owner_vehicles` + `service_records`, staff "attended" dialog records odometer and next service, buyer "My cars" card on the Profile page with an unticked reminder opt-in, consent-gated service-due and insurance/PUC/warranty reminders, `my_garage` chatbot tool, DPDP export and erasure). P5 is code complete (migration `0040` `lead_tasks`; Lead Desk Agent "Next steps" card in the lead drawer that only proposes, consultant approves; stale-lead, post-test-drive and no-show follow-up tasks). P6 is code complete (migration `0041`: daily staff digests at 08:30 IST, manager-only price-band explanation, opt-in saved-car emails with a send-time marketing consent gate). The AI plan P0-P6 is code complete; remaining work is owner steps: apply `0035`-`0041`, add the keys, and verify on DEV.
