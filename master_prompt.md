# VROOMA: MASTER SCAFFOLD PROMPT (Phase 1: structure + all frontend pages)

> Paste everything below into your coding agent (Claude Code / Cursor) in an empty folder.
> This phase creates the full folder structure, `context.md`, docs, schema files, and **every frontend page and layout** (with mock data).
> The landing page's scroll animations are NOT part of this phase (a separate prompt follows); only a plain placeholder landing is built now.

---

## 0. ROLE AND WORKING RULES

You are a senior full-stack engineer scaffolding **Vrooma**, a premium car-dealer website (Next.js + TypeScript + Supabase), for a 4-5 day internship assignment.

1. Read this whole prompt first, then work in the **phases in section 18**, running `pnpm typecheck && pnpm lint` after each phase.
2. **Every file listed must exist** and contain real starter content (not empty). Unfinished logic gets a `// TODO(day-N): ...` comment and a typed stub, never a blank file.
3. **Dead-button policy (important):** today some buttons are not wired to a backend yet. That is allowed ONLY through the helper `notWired("Label")` (section 15). Never use `href="#"`, empty `onClick`, or buttons that silently do nothing. Every placeholder must be registered in `docs/WIRING.md`. By the final day the count must be **zero**.
4. All pages must look finished and work on mock data: real filtering, real EMI math, real price breakup, and real form validation. Only persistence and external services are stubbed.
5. Mobile first. Keyboard accessible. Every page has `loading.tsx`, an error state, and an empty state where relevant.
6. Do not build the animated landing page (no GSAP scenes, no Lenis scroll scenes). Build the placeholder described in section 5.
7. Do not invent features outside this document. Do not add libraries not listed in section 3 without noting why in `docs/DECISIONS.md`.
8. At the end, output the report described in section 19.

---

## 1. PROJECT SNAPSHOT

- **Company (mock):** Vrooma, an authorised dealer for one passenger car brand ("Brand X") in Lucknow. 3 showrooms, 2 service workshops, 1 certified used-car yard. 340 staff, about 6,000 new and 900 used cars a year.
- **Today's problem:** Excel leads, phone-only test drives and service bookings, WhatsApp-photo used stock. Roughly ₹2.11 crore a year is lost to slow lead response (₹1.62 cr) and unanswered service calls (₹48.6 lakh).
- **Goal:** Buyers browse new and used cars with real on-road prices, EMI, and book a test drive or service in a real slot. Every enquiry reaches a named consultant within 5 minutes.
- **Users:** Buyer/owner (mobile), Sales consultant (lead desk), Used-car manager, Admin (the Dealer Principal signs the deal and sees the dashboard).
- **Success metrics:** 90% of web leads called within 5 min · 400 online test-drive bookings/month within 6 months · unanswered service calls 20% → under 5%.

---

## 2. THE BRIEF (paste verbatim into `docs/BRIEF.md`, and into context.md §1)

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

## 3. STACK AND SETUP

**Package manager:** pnpm. **Node:** 20+. Use a `src/` directory and the `@/*` path alias.

| Concern | Choice |
|---|---|
| Framework | Next.js (latest stable, App Router), React, TypeScript `strict: true` |
| Styling | Tailwind CSS + CSS variables for tokens; `clsx` + `tailwind-merge` → `cn()` |
| UI primitives | Radix UI primitives wrapped in `components/ui/*` (shadcn-style). EasyUI-style pieces, if copied later, go in `components/ui/easyui/` |
| Fonts | `next/font/google`: **Urbanist** (sans, UI) + **Instrument Serif** italic (accent word in headlines) |
| Icons | `lucide-react` |
| Motion | `motion` (Framer Motion) for UI micro-interactions only now. **Install `gsap` and `lenis` but do not use them yet** |
| Forms/validation | `react-hook-form` + `zod` + `@hookform/resolvers` |
| URL state (filters) | `nuqs` |
| i18n | `next-intl` (English default, Hindi `hi`, `localePrefix: "as-needed"`) |
| Toasts | `sonner` |
| Dates | `date-fns` |
| CSV | `papaparse` |
| Backend (later) | `@supabase/supabase-js`, `@supabase/ssr` |
| Email (later) | `resend` |
| AI (later) | `ai` (Vercel AI SDK) + one provider package |
| Tests | `vitest` (price engine, EMI, masking, SLA must have tests now) |
| Quality | ESLint, Prettier, `husky` + `lint-staged` (optional), `tsc --noEmit` |

**Scripts** in `package.json`: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `format`, `check:wiring` (runs `scripts/check-wiring.mjs`), `db:types` (placeholder echo for Supabase type generation).

**.env.example** (validated by `src/lib/env.ts` with zod; the app must still boot with `NEXT_PUBLIC_USE_MOCK=true`):
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_USE_MOCK=true
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
AI_PROVIDER_API_KEY=
CRON_SECRET=
```

---

## 4. FOLDER STRUCTURE (create all of it)

```
vrooma/
├─ context.md                      # source of truth for humans and AI agents (section 16)
├─ CLAUDE.md                       # one line: "Read context.md before doing anything." (+ same for AGENTS.md)
├─ README.md                       # setup, scripts, demo script, screenshots placeholder
├─ .env.example
├─ docs/
│  ├─ BRIEF.md                     # verbatim brief
│  ├─ ARCHITECTURE.md              # layers, data flow, mock→Supabase swap
│  ├─ ROUTES.md                    # route table (section 5)
│  ├─ DATA_MODEL.md                # tables, relations, enums
│  ├─ DESIGN_SYSTEM.md             # tokens, type, components, do/don't
│  ├─ MOTION.md                    # motion rules and budget
│  ├─ GATING.md                    # what is public vs sign-in
│  ├─ AI.md                        # agents, guardrails, logging
│  ├─ DPDP.md                      # consent, opt-out, deletion, retention
│  ├─ SEO.md                       # URLs, metadata, JSON-LD, sitemap
│  ├─ PERFORMANCE.md               # budgets, checklist, Lighthouse log
│  ├─ TESTING.md                   # what is tested, how
│  ├─ WIRING.md                    # every notWired() placeholder → owner day
│  ├─ DECISIONS.md                 # short ADRs
│  └─ ROADMAP.md                   # 5-day plan with checkboxes
├─ public/
│  ├─ images/placeholders/         # generated SVG car silhouettes (car-1..6.svg), avatar, logo mark
│  ├─ icons/  og/  fonts/(empty, .gitkeep)
├─ messages/
│  ├─ en.json
│  └─ hi.json                      # same keys, Hindi values (real translations, not copies)
├─ scripts/
│  ├─ check-wiring.mjs             # greps notWired( and reports count; exits 1 if > 0 when --strict
│  ├─ gen-placeholders.mjs         # writes SVG placeholders
│  └─ seed-csv-sample.csv          # sample portal leads CSV for import testing
├─ supabase/
│  ├─ config.toml                  # minimal
│  ├─ migrations/
│  │  ├─ 0001_enums_and_core.sql
│  │  ├─ 0002_catalog_and_pricing.sql
│  │  ├─ 0003_used_cars.sql
│  │  ├─ 0004_booking_slots.sql
│  │  ├─ 0005_leads_and_assignment.sql
│  │  ├─ 0006_ai_consent_audit.sql
│  │  └─ 0007_rls_policies.sql     # RLS enabled + policy outlines as commented TODOs
│  ├─ seed.sql                     # sample data (section 14)
│  └─ functions/ (.gitkeep)
├─ tests/
│  ├─ price-engine.test.ts
│  ├─ emi.test.ts
│  ├─ masking.test.ts
│  ├─ money.test.ts
│  └─ sla.test.ts
└─ src/
   ├─ middleware.ts                # next-intl + (later) Supabase session refresh
   ├─ i18n/ (routing.ts, request.ts, navigation.ts)
   ├─ app/
   │  ├─ [locale]/
   │  │  ├─ layout.tsx             # fonts, providers, header, footer, chat widget, toaster
   │  │  ├─ not-found.tsx  error.tsx  loading.tsx
   │  │  ├─ (public)/
   │  │  │  ├─ page.tsx                       # placeholder landing (section 5)
   │  │  │  ├─ cars/page.tsx                  # listing: search/sort/filter
   │  │  │  ├─ cars/[modelSlug]/page.tsx      # model + variant page
   │  │  │  ├─ used-cars/page.tsx
   │  │  │  ├─ used-cars/[stockId]/page.tsx
   │  │  │  ├─ offers/page.tsx
   │  │  │  ├─ emi-calculator/page.tsx
   │  │  │  ├─ showrooms/page.tsx
   │  │  │  ├─ about/page.tsx
   │  │  │  ├─ contact/page.tsx
   │  │  │  └─ legal/{privacy,terms,data-rights}/page.tsx
   │  │  ├─ (auth)/sign-in/page.tsx           # full-page fallback of the sign-in sheet
   │  │  ├─ (buyer)/                          # requires sign-in
   │  │  │  ├─ dashboard/page.tsx             # overview
   │  │  │  ├─ dashboard/bookings/page.tsx
   │  │  │  ├─ dashboard/saved/page.tsx
   │  │  │  ├─ dashboard/enquiries/page.tsx
   │  │  │  ├─ dashboard/profile/page.tsx
   │  │  │  ├─ book/test-drive/page.tsx
   │  │  │  ├─ book/service/page.tsx
   │  │  │  └─ trade-in/page.tsx
   │  │  ├─ (staff)/staff/                    # consultant, manager, admin
   │  │  │  ├─ layout.tsx                     # sidebar shell
   │  │  │  ├─ page.tsx                       # SLA overview
   │  │  │  ├─ leads/page.tsx  leads/[id]/page.tsx  leads/import/page.tsx
   │  │  │  └─ bookings/page.tsx
   │  │  └─ (admin)/admin/                    # admin (some pages manager)
   │  │     ├─ layout.tsx
   │  │     ├─ page.tsx                       # "₹2.11 crore leak" dashboard
   │  │     ├─ models/page.tsx  models/[id]/page.tsx
   │  │     ├─ prices/page.tsx                # price_rules table editor
   │  │     ├─ used-cars/page.tsx  used-cars/[id]/page.tsx   # manager-only AI price band
   │  │     ├─ showrooms/page.tsx             # showrooms, workshops, bays, demo cars
   │  │     ├─ slots/page.tsx
   │  │     ├─ offers/page.tsx  banners/page.tsx
   │  │     ├─ assignment/page.tsx            # assignment rules
   │  │     ├─ users/page.tsx                 # roles
   │  │     └─ ai-logs/page.tsx
   │  ├─ api/                                # route handlers (typed stubs, section 13)
   │  ├─ auth/callback/route.ts
   │  ├─ sitemap.ts  robots.ts  manifest.ts
   │  └─ globals.css                         # tokens + base + utilities
   ├─ components/
   │  ├─ ui/            # primitives (below)
   │  ├─ layout/        # SiteHeader, MobileNav, SiteFooter, LocaleSwitcher, Breadcrumbs, PageShell, StaffSidebar, AdminSidebar
   │  ├─ cars/          # CarCard, CarGrid, FilterBar, FilterSheet, SearchBox, SortSelect, VariantSelector, ColorSwatches, CitySelect, Gallery, SpecTable, PriceBreakup, PriceSummaryBar, SimilarCars
   │  ├─ used/          # UsedCarCard, UsedFilters, InspectionReport, MaskedReg, OwnerKmYearBadges
   │  ├─ emi/           # EmiCalculator, EmiSlider
   │  ├─ booking/       # BookingStepper, ShowroomPicker, DemoCarPicker, DatePicker, SlotPicker, ServicePicker, BookingSummary, BookingConfirmation
   │  ├─ forms/         # ConsentCheckbox, PhoneField, TradeInForm, EnquiryForm, FormField
   │  ├─ auth/          # AuthProvider, SignInSheet, AuthGate, UserMenu, useRequireAuth
   │  ├─ dashboard/     # StatCard, BookingCard, SavedCarCard, EnquiryRow, ProfileForm, DataRightsPanel
   │  ├─ staff/         # LeadTable, LeadRow, SlaTimer, StatusPill, LeadDrawer, AiSummaryCard, ReplyDraftEditor, ReassignDialog, CsvImportDialog, OutboxPreview
   │  ├─ admin/         # DataTable, ModelForm, VariantForm, PriceRuleForm, UsedCarForm, BannerForm, OfferForm, UserRoleSelect, LeakCard, PriceSuggestionCard
   │  ├─ chat/          # ChatWidget, ChatPanel, ChatMessage (UI only now)
   │  ├─ seo/           # JsonLd, VehicleJsonLd, BreadcrumbJsonLd, OrganizationJsonLd
   │  ├─ landing/       # stub sections for next phase (section 5)
   │  └─ dev/           # NotWired.tsx + notWired() helper
   ├─ lib/
   │  ├─ utils.ts (cn)  env.ts  constants.ts  routes.ts (single route registry)
   │  ├─ money.ts        # formatINR (Indian grouping), formatLakh, parse
   │  ├─ price-engine.ts # pure on-road price calc (section 9)
   │  ├─ emi.ts          # pure EMI + amortisation
   │  ├─ masking.ts      # maskRegNo, maskPhone
   │  ├─ sla.ts          # sla colour/state from timestamps
   │  ├─ slug.ts  seo.ts  analytics.ts (stub)
   │  ├─ validation/     # zod schemas: lead, booking, trade-in, consent, price-rule, car, csv-row
   │  └─ supabase/       # client.ts server.ts admin.ts middleware.ts (typed stubs, no logic yet)
   ├─ server/
   │  ├─ repositories/   # data-access layer (section 8): one file per aggregate
   │  ├─ services/       # business logic: lead-assignment.ts, slot-engine.ts, csv-import.ts, outbox.ts, price-suggestion.ts (stubs)
   │  └─ ai/             # lead-copilot.ts, chat-tools.ts, prompts/ (stubs with guardrail text)
   ├─ data/mock/         # typed mock data used when NEXT_PUBLIC_USE_MOCK=true
   ├─ hooks/             # useDebounce, useMediaQuery, useCity, useSavedCars, useCountdown
   ├─ types/             # domain.ts, db.ts (hand-written until generated), api.ts
   └─ styles/            # (optional) tokens.css
```

---

## 5. ROUTE MAP (write this table into `docs/ROUTES.md`; centralise paths in `lib/routes.ts`)

| Route | Access | What it does now (mock-backed) |
|---|---|---|
| `/` | Public | **Placeholder landing:** header, simple hero (headline with one italic-serif accent word, subline, two CTAs: Browse cars, Book test drive), quick search bar, featured models strip, used-car strip, trust row, footer. Plus empty stub section components in `components/landing/` named: `HeroScene`, `WhyVrooma`, `ShowroomsOrbit`, `TransparentPricing`, `InspectedUsed`, `BookingSteps`, `Reviews`, `FinalCta` (each renders a titled placeholder box). These are replaced in the landing phase |
| `/cars` | Public | Search + filters (body type, fuel, transmission, budget range, city) + sort (price low/high, newest). Filter state in URL via `nuqs`. Grid of `CarCard`. Mobile: filter bottom-sheet. Empty and loading states |
| `/cars/[modelSlug]` | Public (price breakup gated) | Gallery, colour swatches (swap image), variant selector, specs, city selector, ex-showroom price (free), **on-road breakup behind `AuthGate`** (teaser "On-road from ₹X" free), basic EMI (free), sticky action bar: Book test drive (gated), Get best offer (gated), Save (gated). `generateStaticParams` + metadata + JSON-LD |
| `/used-cars` | Public | Filters (model, year, km, fuel, price, owners), sort, `UsedCarCard` grid, "Booked" cars shown but not bookable |
| `/used-cars/[stockId]` | Public (inspection report gated) | Photos, year/owners/km, **masked reg number**, price, certification badge, inspection summary free + full report gated, Book viewing and Trade-in (gated), EMI |
| `/offers` | Public | Active offers cards from mock |
| `/emi-calculator` | Public | Full standalone calculator (amount, down payment, rate, tenure), breakup donut/bars, amortisation table |
| `/showrooms` | Public | 3 showrooms + 2 workshops with address, hours, call/directions links (real `tel:` and map URLs) |
| `/about` `/contact` | Public | Company brief, numbers, contact form (consent checkbox, creates a lead, mock) |
| `/legal/privacy` `/legal/terms` `/legal/data-rights` | Public | DPDP-aligned text; data-rights page has opt-out and "delete my data" request form |
| `/sign-in` | Public | Magic-link + Google UI (mock session now), consent notice; also rendered as `SignInSheet` |
| `/dashboard` | Buyer | Welcome, next booking, saved cars, recent enquiries, quick actions |
| `/dashboard/bookings` | Buyer | Upcoming/past test drives and services, cancel/reschedule UI |
| `/dashboard/saved` | Buyer | Saved new and used cars |
| `/dashboard/enquiries` | Buyer | My leads with status and assigned consultant name |
| `/dashboard/profile` | Buyer | Name, phone, city, language, consent toggles, delete account |
| `/book/test-drive` | Buyer | Stepper: showroom → demo car → date → real slots (mock availability, taken slots disabled) → details + consent → confirmation (shows consultant and an in-app message preview) |
| `/book/service` | Buyer | Workshop → service type → date → slot with bay capacity → vehicle details + consent → confirmation |
| `/trade-in` | Buyer | Trade-in form (make, model, year, km, condition, photos UI) |
| `/staff` | Consultant+ | My SLA summary: due now, breached, today's bookings |
| `/staff/leads` | Consultant+ | Live table, `SlaTimer` (green → amber → red), status pills, source, filters, search |
| `/staff/leads/[id]` | Consultant+ | `LeadDrawer` as a page: contact info, timeline, `AiSummaryCard`, `ReplyDraftEditor` (editable, "Send" via outbox), re-assign |
| `/staff/leads/import` | Consultant+ | CSV upload, row preview, errors, dedupe by phone (PapaParse, works on mock) |
| `/staff/bookings` | Consultant+ | Today's and upcoming test drives and services |
| `/admin` | Admin/Manager | "Leak" dashboard: % leads answered in 5 min, bookings, service answered rate, using the brief's maths |
| `/admin/models` `/[id]` | Admin | CRUD UI for models, variants, colours, images |
| `/admin/prices` | Admin | Price-rule table editor (city, fuel/variant, road tax %, registration, insurance, handling, accessories, TCS, valid from/until) with live "preview on-road price" |
| `/admin/used-cars` `/[id]` | Admin/Manager | Stock CRUD, inspection JSON editor, **manager-only AI price band card**, final price field |
| `/admin/showrooms` `/slots` | Admin | Showrooms, workshops, service bays, demo cars, slot generation |
| `/admin/offers` `/banners` | Admin | CRUD UI |
| `/admin/assignment` | Admin | Rules: showroom + model → consultant pool |
| `/admin/users` | Admin | Role assignment (buyer, consultant, manager, admin) |
| `/admin/ai-logs` | Admin | Draft vs final-sent comparison list |

**Global components on every page:** `SiteHeader` (glass pill nav: Cars, Used cars, Offers, Showrooms, EMI; locale toggle; Sign in / `UserMenu`), `SiteFooter` (newsletter field wired through consent, link columns, giant faded "Vrooma" wordmark), `ChatWidget` (floating button + panel UI), `Toaster`.

---

## 6. DESIGN SYSTEM (write the tokens into `globals.css` and `docs/DESIGN_SYSTEM.md`)

Premium, minimal, one accent. Light "showroom" look.

```css
:root {
  --bg: #EEF0F3;            /* light grey base */
  --bg-sheen: linear-gradient(135deg,#F6F7F9 0%,#E7EAEE 45%,#F3F4F6 100%);
  --surface: #FFFFFF;       --surface-glass: rgba(255,255,255,.72);
  --border: rgba(15,23,32,.08);
  --ink: #0F1720;           --ink-soft: #4B5563;   --ink-mute: #8A94A3;
  --dark: #121A24;          /* dark pills, dark cards */
  --accent: #1FBF75;        --accent-ink: #0B8F56;  /* use accent-ink for text on light */
  --accent-soft: #E3F7EE;
  --danger: #E5484D;  --warn: #F5A524;  --ok: var(--accent);
  --radius-sm: 10px; --radius-md: 16px; --radius-lg: 24px; --radius-pill: 999px;
  --shadow-card: 0 1px 2px rgba(15,23,32,.04), 0 8px 24px rgba(15,23,32,.06);
  --space-section: clamp(72px, 10vw, 140px);
}
```
Dark mode: not required. Keep tokens ready but do not build it.

**Typography:** Urbanist for UI; Instrument Serif italic only for the single accent word in a headline, via `<Accent>` component. Fluid headings (`clamp`). Body 16px+, line-height 1.6.

**Rules (copy into DESIGN_SYSTEM.md):**
- One accent colour everywhere (`--accent`). SLA colours (green/amber/red) are the only extra colours, and only inside the staff area.
- Cards: soft white glass, 1px border, `--radius-lg`, `--shadow-card`. No gradients on cards other than the page sheen.
- Dark pill buttons for primary CTAs; ghost/outline for secondary. Max one primary per view.
- Hover/focus: subtle border-colour + shadow change, never a zoom-scale. Focus rings always visible.
- Every car view shows price + one clear next step.
- Generous spacing (`--space-section`), max content width 1240px, 12-col grid.
- No decoration without a purpose.

**`components/ui` primitives to create:** Button, IconButton, Card, GlassCard, Badge, Input, Textarea, Select, Checkbox, Switch, Slider, RangeSlider, Tabs, Dialog, Sheet (bottom on mobile, side on desktop), Popover, Tooltip, DropdownMenu, Accordion, Skeleton, Table, Pagination, EmptyState, Spinner, Stepper, Avatar, Separator, Accent (serif italic word), Container, Section.

---

## 7. COMPONENT BEHAVIOUR NOTES

- **FilterBar/FilterSheet:** same filter schema, URL-synced, debounced search, active-filter chips, "Clear all", result count, no full reload.
- **CarCard / UsedCarCard:** image, name, variant, key spec chips, price (ex-showroom for new, price for used), city-aware "On-road from", clear CTA. Booked used cars show a "Booked" badge and no booking CTA.
- **PriceBreakup:** table of every component, total, "Valid until {date}", "Prices may change" note. If no valid rule for the city → "Contact showroom", never a guess.
- **SlotPicker:** day strip + slot chips; taken slots disabled with tooltip; "just taken" conflict handled with a toast and a refresh.
- **SlaTimer:** counts down from `sla_due_at`; green >2 min, amber ≤2 min, red when breached; stops when `first_contacted_at` is set.
- **ReplyDraftEditor:** the draft is editable, "Send" is explicit, and a warning blocks sending if the text contains discount words (`discount`, `off`, `% off`, `छूट`) with a "remove before sending" message.
- **AuthGate:** wraps any action; if not signed in, opens `SignInSheet` and resumes the action after sign-in (state preserved).
- **ChatWidget:** floating button, panel with message list, input, suggested prompts. Responds with a clearly marked scripted reply now; wired in the AI phase.
- **MaskedReg:** always renders `UP32 ** **** 1234` style; the full number never enters a public type.

---

## 8. DATA LAYER (swap mock → Supabase with no UI changes)

- `types/domain.ts`: `City, Showroom, Workshop, Model, Variant, VariantColor, PriceRule, OnRoadBreakup, UsedCar, Inspection, DemoCar, Slot, Booking, Lead, LeadStatus, LeadSource, Profile, Role, Offer, Banner, TradeInRequest, OutboxMessage, AiLog`. Money is **integer rupees**.
- `server/repositories/*.ts` expose async functions, e.g. `listModels(filters)`, `getModelBySlug`, `listUsedCars(filters)`, `getUsedCar(stockId)`, `getPriceRule(variantId, cityId, date)`, `listSlots({showroomId, demoCarId, date})`, `createBooking`, `createLead`, `listLeads`, `updateLeadStatus`, `reassignLead`, etc.
- Each repository checks `env.NEXT_PUBLIC_USE_MOCK` and reads `data/mock/*`, otherwise calls Supabase (leave `throw new Error("TODO(day-N)")` for the real branch).
- Mock mutations live in an in-memory store (module-level) so booking, lead creation, and status changes visibly work within a session.
- Server Components fetch via repositories; client components use route handlers or server actions (typed stubs).

---

## 9. PURE LOGIC TO IMPLEMENT FULLY NOW (with tests)

1. **`money.ts`:** `formatINR(1245000) → "₹12,45,000"`, `formatLakh(1245000) → "₹12.45 lakh"`.
2. **`price-engine.ts`:** `computeOnRoad({ variant, rule, includeAccessories })` → `{ lines: [{key,label,amount}], total, validUntil, source: "price_rules" }`. Components: ex-showroom + road tax (% of ex-showroom) + registration + insurance + handling + accessories (optional) + TCS (only if rule has it). Integer rounding with a documented rule. Returns `null` when no rule is valid for the date, and the UI shows "Contact showroom". Never hardcode rates.
3. **`emi.ts`:** `emi(principal, annualRatePct, months)`, plus an amortisation schedule helper. Handles a 0% rate.
4. **`masking.ts`:** `maskRegNo("UP32AB1234") → "UP32 ** **** 1234"`, `maskPhone`.
5. **`sla.ts`:** `slaState(dueAt, firstContactedAt, now) → "met" | "ok" | "warn" | "breached"` and remaining seconds.
6. Tests: the three sample cars, a no-rule case, an expired rule, an edge-rounding case, a 0% EMI, and SLA boundaries.

---

## 10. AUTH AND GATING (scaffold only)

- `AuthProvider` + `useAuth()` exposing `{ user, role, signIn, signOut, status }`. **Mock mode:** sign-in sheet accepts any email, stores a fake session in `localStorage` (dev only, behind `NEXT_PUBLIC_USE_MOCK`), with a role switcher in dev (buyer / consultant / manager / admin) so every area can be viewed.
- `useRequireAuth(action)` and `<AuthGate>` implement "open sheet → resume".
- Route-group guards: `(buyer)` requires any user; `(staff)` requires consultant+; `(admin)` requires admin (manager for used-cars price band). Redirect to `/sign-in?next=...`.
- `docs/GATING.md` table (copy from section 5 "Access" column plus the rule: **free = browse, search, filter, images, colours, specs, ex-showroom price, basic EMI; sign-in = on-road breakup, test drive, service, trade-in, save, enquiry, full inspection report**).
- Real Supabase Auth (email magic link + Google) is wired on a later day. Leave typed stubs in `lib/supabase/*`.

---

## 11. i18n

- `messages/en.json` and `messages/hi.json` with identical key trees, namespaced (`nav`, `home`, `cars`, `used`, `booking`, `auth`, `dashboard`, `staff`, `admin`, `legal`, `common`, `errors`, `seo`).
- **No hardcoded user-visible strings in components.** Use `useTranslations` / `getTranslations`. Hindi values must be real translations.
- `LocaleSwitcher` in header and footer. `hreflang` alternates in metadata.

---

## 12. SEO AND PERFORMANCE SCAFFOLD

- `generateMetadata` on every public page (title, description, canonical, OG, hreflang).
- `JsonLd` helpers: `Vehicle` + `Offer` for model and used-car pages, `Organization`/`AutoDealer`, `BreadcrumbList`.
- `sitemap.ts` lists static pages + all model slugs + all used-car stock IDs in both locales. `robots.ts` blocks `/dashboard`, `/staff`, `/admin`, `/api`.
- `generateStaticParams` + ISR (`revalidate`) for car pages.
- `next/image` everywhere with explicit `sizes`, `priority` only for the above-the-fold image, and placeholder blur. One font family pair, `display: swap`. Dynamic imports for heavy client components (charts, CSV dialog, chat panel).
- `docs/PERFORMANCE.md` has the budget: LCP < 2.5s on 4G, JS per route target, CLS < 0.1.

---

## 13. API ROUTE STUBS (typed with zod, return mock-backed JSON or `501` with a TODO message)

```
POST /api/leads            create lead (consent required)      GET /api/leads (staff)
PATCH /api/leads/[id]      status, reassign, first-contact
POST /api/leads/import     CSV rows → leads (dedupe by phone)
POST /api/bookings         test drive / service                 GET /api/bookings (me | staff)
GET  /api/slots            ?kind&showroomId|workshopId&demoCarId&date
GET  /api/price            ?variantId&cityId&accessories=1 → breakup | null
GET  /api/cars/search      ?q&filters&sort
POST /api/trade-in         
POST /api/consent          grant / revoke
POST /api/me/delete        data deletion request
POST /api/chat             assistant (stub)
POST /api/ai/lead-copilot  summary + draft (stub, guardrails in prompt file)
POST /api/outbox/send      mock send → writes messages_outbox
GET  /api/cron/sla         flag breaches (requires CRON_SECRET)
GET  /api/export/daily-csv daily CSV for DMS (admin)
```
Every handler: parse with zod, check role, return `{ ok, data | error }`, and never leak the full registration number.

---

## 14. SUPABASE SCHEMA (write full DDL in migrations; seed minimal data)

**Enums:** `role (buyer, consultant, manager, admin)`, `lead_status (new, contacted, test_drive_booked, negotiating, won, lost)`, `lead_source (web, portal, social, walkin, chat, trade_in)`, `booking_kind (test_drive, service)`, `booking_status (confirmed, cancelled, completed, no_show)`, `car_status (available, booked, sold)`, `fuel (petrol, diesel, cng, ev, hybrid)`, `transmission (manual, automatic)`.

**Tables (money columns are `integer` rupees, all have `created_at`, `updated_at`, PK `uuid`):**
- `cities(id, name, state, slug)` · `showrooms(id, city_id, name, address, phone, hours jsonb, lat, lng)` · `workshops(id, city_id, name, address, phone, bays int, hours jsonb)`
- `models(id, slug UNIQUE, name, body_type, tagline, hero_image, gallery jsonb, is_active)`
- `variants(id, model_id, name, fuel, transmission, ex_showroom int, specs jsonb, features jsonb)` · `variant_colors(id, variant_id, name, hex, image_url)`
- `price_rules(id, city_id, model_id nullable, variant_id nullable, fuel nullable, road_tax_pct numeric, registration int, insurance int, handling int, accessories int, tcs_pct numeric nullable, valid_from date, valid_until date, notes)` + a check that `model_id` or `variant_id` is set, and an index on `(city_id, valid_from, valid_until)`
- `used_cars(id, stock_id UNIQUE, model_id, variant_name, fuel, year, km, owners, price int, status, reg_no_private text, reg_no_masked text GENERATED/maintained, showroom_id, inspection jsonb, certified bool, images jsonb)`
- `used_car_sales_history(id, model_id, year, km, sold_price, sold_at)` (for the price band)
- `used_car_price_suggestions(id, used_car_id, low, high, rationale, created_at)` (manager-only)
- `demo_cars(id, showroom_id, variant_id, reg_label, active)`
- `slots(id, kind, showroom_id nullable, workshop_id nullable, demo_car_id nullable, starts_at, ends_at, capacity int default 1)` with **UNIQUE (kind, COALESCE(demo_car_id, workshop_id), starts_at)**
- `bookings(id, user_id, slot_id, kind, status, vehicle_info jsonb, notes, consent_id)` + a capacity-check function/trigger stub (TODO)
- `profiles(id → auth.users, full_name, phone, city_id, role default 'buyer', locale)` · `consents(id, user_id, purpose, granted bool, version, granted_at, revoked_at)` · `saved_items(id, user_id, target_type, target_id)`
- `leads(id, source, user_id nullable, name, phone, email, showroom_id, model_id, used_car_id nullable, message, status, assigned_to → profiles, sla_due_at, first_contacted_at, ai_summary, ai_draft, consent_id, created_at)` with UNIQUE-ish dedupe index on `(phone, model_id, date(created_at))`
- `lead_events(id, lead_id, type, payload jsonb, actor_id)` · `assignment_rules(id, showroom_id, model_id nullable, consultant_ids uuid[], priority)`
- `trade_in_requests(id, user_id, lead_id, make, model, year, km, condition, notes, images jsonb)`
- `offers(id, title, body, model_id nullable, valid_until, active)` · `banners(id, title, image_url, href, sort, active)`
- `messages_outbox(id, channel, to_phone_or_email, template, body, lead_id, status, created_at)`
- `ai_logs(id, kind, lead_id nullable, prompt_hash, draft, final_sent, edited bool, model, created_at)`
- `audit_log(id, actor_id, action, entity, entity_id, diff jsonb)` · `csv_imports(id, uploaded_by, filename, total, created, skipped, errors jsonb)`

`0007_rls_policies.sql`: enable RLS on every table and write each policy as a **commented outline** (buyers see only their own rows; leads visible to the assigned consultant and managers; price suggestions manager-only; `reg_no_private` never selectable by `anon`/`authenticated`). Real policies come on the backend day.

**`seed.sql`:** 2 cities (Lucknow, Kanpur), 3 showrooms, 2 workshops, 5 models (include Model H, C, S), about 10 variants (include **NEW-H-02 Model H ZX automatic petrol ₹12,45,000**), about 8 used cars (include **UC-1182** and **UC-1190 Booked**), demo cars, 6 consultants, placeholder price rules labelled `seed values`, 3 offers, 2 banners. Mirror the same data in `data/mock/*.ts`.

---

## 15. DEAD-BUTTON SYSTEM

- `components/dev/NotWired.tsx` and `notWired(label: string, day: number)` returns a click handler that shows a sonner toast ("{label} is being wired up, due day {n}") and `console.info`s it.
- Every placeholder action uses it. Register each in `docs/WIRING.md` as `| file | label | owner day | status |`.
- `scripts/check-wiring.mjs` counts `notWired(` occurrences, prints a table, and exits `1` with `--strict` if any remain. Add `pnpm check:wiring` and `pnpm check:wiring --strict` to the README checklist. **The final-day gate: strict mode passes.**

---

## 16. `context.md` (write it fully; it is the project's source of truth)

Sections, in order:
1. **Brief (verbatim)**: the full text from section 2, unchanged.
2. **Project identity**: Vrooma, Brand X, Lucknow, roles, success metrics.
3. **Hard rules from the brief (verbatim restatements)**: on-road prices show breakup, validity date and "prices may change"; prices always from `price_rules` (admin table); reg numbers always masked in public output; consent checkbox + opt-out (DPDP Act 2023) on every personal-data form; Hindi and English; under 2.5s on 4G; indexable page per model and per used car; one accent colour; a price and a clear next step on every car page; **AI**: drafts always edited before sending, never quote discounts, used-car manager alone sees the price suggestion and sets final prices, consultants can re-assign leads. Out of scope: online payments, DMS integration, spare parts.
4. **Added rules**: stack (section 3); folder conventions; money = integer rupees, Indian grouping; no hardcoded strings (i18n); repositories are the only data access; `notWired()` policy; gating table; every route has loading/error/empty states; no hover-zoom; motion budget (transform/opacity only, reduced-motion respected, GSAP/Lenis lazy-loaded); naming conventions (kebab-case files, PascalCase components); commit message style.
5. **Gating table**, **route map** (link to docs/ROUTES.md), **data model summary** (link to docs/DATA_MODEL.md).
6. **Design tokens** (section 6).
7. **Definition of done per screen**: responsive 360/768/1280, keyboard accessible, i18n complete, loading/empty/error, metadata + JSON-LD where public, no `notWired`, Lighthouse perf ≥ 90 on mobile, a unit test if it holds logic.
8. **Current status and next steps** (updated each day).

---

## 17. DOCS CONTENT EXPECTATIONS

Each `docs/*.md` must have real starter content, not just headings: ARCHITECTURE (layer diagram in text, mock/real swap), DATA_MODEL (table list + relations), DESIGN_SYSTEM (tokens + component list), MOTION (budget + rules + "landing scenes: TBD next phase"), GATING, AI (3 agents, guardrails, logging, "when AI is wrong" rules), DPDP (consent text, purposes, retention, deletion flow), SEO, PERFORMANCE, TESTING, WIRING (initial table), DECISIONS (Supabase over Firebase/AWS, nuqs for filters, repositories pattern, free-tier messaging via email + click-to-chat), ROADMAP (5-day plan with checkboxes: D1 foundation + all pages, D2 landing, D3 backend schema + catalog + price engine live, D4 booking + leads + SLA + admin, D5 AI + i18n/SEO/perf + wiring-zero).

---

## 18. EXECUTION PHASES (checkpoint after each)

1. **Setup:** init Next.js + TS + Tailwind, install deps, env, ESLint/Prettier, scripts, `tsconfig` paths, folder skeleton with `.gitkeep`s.
2. **Foundations:** tokens, fonts, `globals.css`, `ui/` primitives, `lib/*` pure logic + tests, i18n wiring + both message files, routes registry.
3. **Data layer:** types, mock data, repositories, validation schemas, in-memory store.
4. **Layout shell:** header, mobile nav, footer, locale switcher, chat widget UI, auth provider + sign-in sheet + AuthGate, staff and admin sidebars, role guards.
5. **Public pages:** everything under `(public)` including `/cars` filtering, model page with variant/colour/city/price/EMI, used pages, EMI page, showrooms, legal pages, SEO files.
6. **Buyer area:** dashboard pages, booking flows with the slot picker, trade-in.
7. **Staff and admin:** lead inbox with SLA timer, lead detail with AI summary/draft panels (static mock content), CSV import, all admin screens.
8. **Backend skeleton:** Supabase migrations, seed, API route stubs, `lib/supabase/*` stubs.
9. **Docs and context.md**, README, `check-wiring` script, `docs/WIRING.md` populated.
10. **Verify:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build`. Manually walk every route in both locales and 3 viewport sizes.

---

## 19. DO NOT / FINAL REPORT

**Do not:** build GSAP/Lenis scroll scenes, write full RLS policies or real Supabase calls, integrate real WhatsApp/SMS/payments, use `href="#"`, hardcode prices or strings, add dark mode, add extra accent colours, use hover-zoom effects, or leave any file empty.

**Final report (print at the end):**
1. File tree (depth 3).
2. Route checklist: route → built / mock-backed / needs backend.
3. `pnpm check:wiring` output (count of `notWired` placeholders and which day owns each).
4. Test results and the build size summary.
5. Known gaps and the first 5 things to do next.