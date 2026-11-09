# VROOMA — PROJECT GUIDE (CLAUDE.md)

> **Source of truth for humans and AI coding agents.**
> All agents and developers must read this document in full before proposing or applying code changes. Doc index: section 9.

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

## 4b. FLIP LISTING CARDS

Interactive 3D flip cards are deployed exclusively on the three main catalog routes (`/cars`, `/used-cars`, `/offers`). Details are in `docs/FRONTEND.md` (listing cards section).

## 5. GATING TABLE, ROUTE MAP & DATA MODEL (full detail: `docs/ROUTES.md`, `docs/DATA_MODEL.md`)

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
- `/admin` — Overview (admin): live success metrics and the ₹2.11 cr leakage monitor; tabs for AI activity (every model call: chat, briefings, next steps, digests, price notes, with filters, usage meters and a detail drawer; a second view compares AI drafts with sent replies) and system health.
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
  --bg: #EEF0F3;            /* Cool grey page background */
  --surface: #FFFFFF;       /* Cards, sheets */
  --surface-glass: rgba(255, 255, 255, 0.78);
  --border: rgba(15, 23, 32, 0.08);
  --ink: #0F1720;          /* Primary text */
  --ink-soft: #4B5563;     /* Secondary text */
  --ink-mute: #8A94A3;     /* Placeholders, tertiary */
  --dark: #121A24;         /* Dark buttons and bars */
  --accent: #1FBF75;       /* The one accent colour: Vrooma green */
  --accent-ink: #0B8F56;   /* Accent text on light surfaces */
  --accent-soft: #E3F7EE;  /* Pills, selected backgrounds */
  --ok: #1FBF75; --warn: #F5A524; --danger: #E5484D;
  --radius-sm: 10px; --radius-md: 16px; --radius-lg: 24px; --radius-pill: 999px;
}
```

Source of truth: `src/app/globals.css`; Tailwind maps these in `tailwind.config.ts` with `color-mix` so `/NN` opacity shades render. Full design reference: `docs/FRONTEND.md`.

- **Typography:**
  - Sans UI: **Urbanist** (clean, geometric, ultra-legible automotive typography).
  - Accent Serif: **Instrument Serif Italic** (editorial luxury emphasis for headline keywords, e.g. *Precision*, *Heritage*, *Luxury*).
- **Rule:** Never use more than ONE accent word per headline.
- **Rule:** Mobile tap targets must be $\ge 44 \times 44$ px.

---

## 7. DEFINITION OF DONE PER SCREEN

| Screen / Area | Definition of Done |
|---|---|
| **Public Homepage** | Hero with editorial italic accent, Quick search bar, Featured models strip, Certified used carousel, Trust pillars, ₹2.11 cr revenue impact badge, interactive FAQ. |
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

## 8. CURRENT STATUS & OPEN ITEMS

**Built (code complete, verified):**
- Next.js app with 63 pages; Supabase backend with 42 migrations (`0001`-`0042`), RLS everywhere, RPCs, pg_cron + HTTP cron routes, storage, Realtime.
- Public site (landing, catalogue, on-road price engine, EMI, trade-in, test-drive and service booking, offers, showrooms, legal/DPDP), buyer dashboard (bookings, enquiries, saved cars, "My cars" garage, data rights, account-deletion cancel).
- Consoles: Lead Desk, Bookings, Chats, Used Stock (staff); Overview + AI activity, Catalog, Team (admin). Console rules in `docs/WIRING.md` and `docs/ROUTES.md`.
- AI layer P0-P6 (Gemini free key by default; Claude supported): lead briefing, buyer profile, first-reply draft, buyer chatbot with server-built facts, Lead Desk "Next steps", automations, daily digests, manager price-band note, saved-car emails. Everything degrades to rule-based text when no key is set. See `docs/AI.md`.
- Email-first messaging: `NOTIFY_CHANNEL=email` (default) sends all replies and reminders by email; the WhatsApp (Meta) adapter stays in place and takes over when `NOTIFY_CHANNEL=whatsapp` and keys exist. No SMS.
- Demo: migration `0042_demo_data.sql` loads catalogue, nine demo accounts and activity; `DEMO_LOGIN=true` gives one-click persona sign-in with no passcode (demo only, switch off afterwards). See `docs/backend/PROD_DEMO.md`.
- Guarded migration runner `pnpm db:push` for DEV and PRODUCTION (fail-closed, project refs hard-coded). See `docs/backend/ENVIRONMENTS.md`.

**Environments:** DEV project `eobtzcwinjmimzisypca`; PROD project `zdasktnbdjkjtoncojsy` (Seoul), domain `vroomacars.vercel.app`. Retired: `ajumkjokagqfdikfguti`, `gmyrehlrmifxckszrdje`. Never run migrations, seeds or tests against production from an agent; the operator does it in their own shell.

**Open items (owner steps):**
- Apply migrations to PROD (`pnpm db:push --target prod --i-am-targeting-production --dry-run`, then apply with `--confirm-production=zdasktnbdjkjtoncojsy`) and the Vault secrets (`app_url`, `cron_secret`), then `select private.ensure_cron_jobs()`.
- Vercel env: `NEXT_PUBLIC_SITE_URL`, Supabase keys, `AI_*` (incl. `AI_MAX_RPM=8`, `AI_DAILY_CALL_CAP=100`, `AI_TIMEOUT_FAST_MS=30000`), `DEMO_LOGIN`/`NEXT_PUBLIC_DEMO_LOGIN` for the demo, `CRON_SECRET`.
- Supabase prod Auth URL config; custom SMTP (Resend) before real users.
- Rotate the Gemini key and the database password that were pasted in chat; re-link the CLI to DEV after prod work.
- WhatsApp Cloud API keys and templates (later); telephony vendor for `/api/webhooks/calls` (none yet).
- Turn `DEMO_LOGIN` off after the demo; remove demo data with `supabase/remove-demo-data.sql` before real launch.

**Future scope (not built):** online payments, DMS integration (daily CSV export only), spare-parts shop, AI tool-calling agents (chat and agent make one request each), marketing messages beyond consent-gated saved-car emails.

---

## 9. COMMANDS & DOC INDEX

**Commands:** `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (90 files, 1,033 tests, no network), `pnpm db:lint`, `pnpm db:push` (DEV) / `pnpm db:push --target prod ...` (see ENVIRONMENTS.md), `pnpm db:types`, `pnpm check:env|wiring|buttons|layout|cron`, `pnpm ai:smoke`, `pnpm seed:ai-demo` (DEV only), `pnpm email:smoke`, `pnpm whatsapp:smoke`, `pnpm e2e:console`, `pnpm layout:console`, `pnpm charts:console`.

**Working rules for agents:** keep money as integer rupees; never add a button that does nothing; run typecheck, lint and tests before finishing; do not commit unless asked; production credentials stay in the operator's shell and `.env.local` holds DEV values only.

| Question | File |
|---|---|
| Why was X decided? | `docs/DECISIONS.md` |
| AI features, guards, limits | `docs/AI.md` |
| Layers, modules, data flow | `docs/ARCHITECTURE.md` |
| Tables, columns, retention | `docs/DATA_MODEL.md` |
| Routes and who can open them | `docs/ROUTES.md` |
| Design system, motion, landing, cards, SEO, performance | `docs/FRONTEND.md` |
| Privacy and data rights | `docs/DPDP.md` |
| How to test | `docs/TESTING.md` |
| Unwired placeholders, console rules | `docs/WIRING.md` |
| DEV/PROD setup, promotion, runner | `docs/backend/ENVIRONMENTS.md` |
| Cron, export, backups, runbook | `docs/backend/OPERATIONS.md` |
| Production demo | `docs/backend/PROD_DEMO.md` |
| Security model | `docs/backend/SECURITY.md` |
| Roles and sign-up | `docs/backend/ROLE_MATRIX.md` |
| RPCs and call paths | `docs/backend/RPC_CALL_PATHS.md` |
| Discount wording rules | `docs/backend/DISCOUNT_RULES.md` |
| Go-live and manual checklist | `docs/backend/RELEASE.md` |
