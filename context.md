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
On-road prices must show the breakup, a validity date and a note that prices may change. Used-car listings show year, owners and kilometres but mask the full registration number. Buyer data is personal data under the DPDP Act 2023: consent checkbox and opt-out. Hindi and English. Pages must load in under 2.5 seconds on 4G, and every model and used car needs its own indexable page for search.

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
3. **Bilingual Requirement (English & Authentic Hindi):**
   - Every public and buyer string must support English (`en`) and Hindi (`hi`).
   - Hindi strings must be natural, authentic automotive terms (e.g., "ऑन-रोड कीमत", "टेस्ट ड्राइव बुक करें", "सत्यापित प्रयुक्त कारें"), not machine gibberish.
4. **Performance & SEO:**
   - Under 2.5 seconds First Contentful Paint / LCP on 4G network profiles.
   - Every car model (`/cars/[modelSlug]`) and used car (`/used-cars/[stockId]`) has an indexable, server-rendered page with dynamic OpenGraph tags, JSON-LD Schema (`Car`, `Vehicle`, `BreadcrumbList`, `AutoDealer`), and XML sitemaps.
5. **AI Safety & Guardrails:**
   - First-reply drafts generated by AI can NEVER mention discounts, price cuts, or waivers. The words `discount`, `price cut`, `off`, `waiver`, and Hindi `छूट`, `कम` are hard-blocked in the draft editor.
   - Used-car valuation suggestions are strictly restricted to the Used-Car Manager role and hidden from public views.
   - Final prices on used inventory are always set by the Used-Car Manager; on-road prices always originate from admin tables.

---

## 4. ADDED ARCHITECTURAL RULES

1. **Tech Stack & Architecture:**
   - Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind CSS v3 with CSS custom properties.
   - Radix UI primitives with custom styling tokens.
   - State management via URL params (`nuqs`) for all filter bars, tabs, and pagination.
   - Forms validated by `react-hook-form` + `zod` schemas.
   - Backend parity: Client code imports only repository interfaces from `src/server/repositories/*`. When `NEXT_PUBLIC_USE_MOCK=true`, in-memory store is used; switching to Supabase requires changing zero UI files.
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
   - Landing page GSAP/Lenis canvas animations are isolated to Phase 2. Phase 1 provides clean placeholder sections.

---

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
| Staff Inbox (`/staff/leads`) | 403 Forbidden | 403 Forbidden | Assigned leads | All leads |
| Admin CMS (`/admin/*`) | 403 Forbidden | 403 Forbidden | 403 Forbidden | Full access |
| AI Used Price Suggestion | Hidden | Hidden | Hidden | Used-Car Manager only |

### Master Route Table

- `/[locale]` — Modern homepage with car carousel, trust pillars, and leakage counter.
- `/[locale]/cars` — New car catalog with budget, fuel, body, transmission filters.
- `/[locale]/cars/[modelSlug]` — Car model deep-dive: 360 gallery, color swatches, variant selector, specs, gated on-road price breakup.
- `/[locale]/used-cars` — Certified pre-owned inventory with inspection badge, km/year/fuel filters, masked reg numbers.
- `/[locale]/used-cars/[stockId]` — Used car inspection dossier, photo gallery, gated 140-pt report, EMI widget.
- `/[locale]/book/test-drive` — 5-step test drive booking wizard (Showroom → Demo Car → Date & Bay Slot → Driver details + DPDP consent → Instant confirmation).
- `/[locale]/book/service` — 4-step workshop service booking wizard by workshop bay capacity.
- `/[locale]/emi-calculator` — Loan calculator with real-time sliders, amortisation schedule, and direct variant pre-population.
- `/[locale]/trade-in` — Instant valuation form with AI price band estimation.
- `/[locale]/offers` — Active festive and retail promotions with claim CTA.
- `/[locale]/showrooms` — Interactive showroom and workshop locator with maps, hours, and direct call/WhatsApp triggers.
- `/[locale]/about` & `/[locale]/contact` — Dealership credentials, history, and contact matrix.
- `/[locale]/legal/privacy`, `/legal/terms`, `/legal/data-rights` — DPDP compliance, cookie policy, and data erasure request portal.
- `/[locale]/dashboard/*` — Buyer account portal: booked drives, service status, saved vehicles, enquiries, DPDP profile download.
- `/[locale]/staff/*` — Sales consultant console: 5-minute SLA countdown desk, AI buyer briefing, discount-guarded reply composer, CSV lead importer.
- `/[locale]/admin/*` — Dealer Principal dashboard: ₹2.11 cr leakage monitor, model catalog CMS, city price rule manager, used inventory editor, staff auto-assignment matrix, AI draft audit logs.

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
- **Phase 2 (Upcoming):**
  - High-performance GSAP 3D car scene and Lenis smooth scroll orchestration on the public homepage.
  - Full Supabase SSR client integration swapping in-memory repositories with live PostgreSQL tables.
  - Resend email notifications for customer confirmations.
  - Production Vercel AI SDK integration for live LLM streaming in lead copilots.

