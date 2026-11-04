# PHASE 0: FRONTEND-TO-BACKEND AUDIT REPORT

**Date:** 2026-11-04  
**Project:** Vrooma (Brand X Dealership Platform, Lucknow & Kanpur)  
**Scope:** Exhaustive audit of frontend routes, forms, UI components, mock stores, domain types, database migrations, and DPDP compliance.  
**Rule Adherence:** Documentation only. No source code modified during Phase 0.

---

## 1. Executive Summary

This audit establishes the exact contract required between the Vrooma frontend application and the upcoming Supabase backend across Phases 1 through 6. Every public route, authenticated dashboard screen, staff lead desk view, admin console, API stub, and data mutation was inspected directly in the source code.

### Core Metrics at a Glance
- **Total Screens / Routes Audited:** 41 distinct Next.js pages (across public, buyer, staff, admin, and auth groups) plus 4 persistent interactive slide-over/modal widgets (`DashboardMobileSheet`, `SignInSheet`, `ChatWidget`, `SiteFooter` newsletter).
- **Total API Route Stubs Audited:** 17 route handlers under `src/app/api/**`.
- **Total Forms & Write Triggers Audited:** 27 interactive write pathways (forms, modals, status buttons, and admin actions).
- **Active Mock Wiring Placeholders:** 28 `notWired()` calls across 15 files; 36 files directly importing and reading from `memoryStore`.
- **Repository Methods Awaiting Live Backend:** 23 functions across 10 repository files currently throwing `TODO(day-3)` and `TODO(day-4)` errors.
- **Top 5 Critical Risks Discovered:**
  1. **Unauthenticated PII Exposure:** `/api/leads` and `/api/export/daily-csv` currently expose all customer names, phone numbers, and notes without authentication.
  2. **Gating Bypass via Client-Side Leaks:** Gated data (140-point inspection checklists and on-road statutory price breakups) are pre-fetched on the server or computed client-side, making them accessible in DOM/React state regardless of the visual `AuthGate`. Additionally, `GET /api/price` returns full breakups to anonymous callers.
  3. **Concurrency and Double-Booking Vulnerability:** The `slots` database table lacks a `booked_count` column, and booking creation has no transaction isolation or row locking, creating race conditions during peak slot reservations.
  4. **Polymorphic and Unenforced Foreign Keys:** `saved_items` has polymorphic text/UUID columns without referential integrity; `assignment_rules.consultant_ids` is a raw `UUID[]` without foreign keys; and `profiles` lacks showroom membership relations.
  5. **DPDP Non-Compliance in Form Defaults:** Forms currently initialize `consent: true` in `useForm` / `useState` default states, violating the statutory DPDP 2023 requirement for affirmative, un-checked consent. Furthermore, address and PIN code are requested at sign-up without feature justification.

---

## 2. Comprehensive Inventories

### 2.1 Screen Inventory
*Note: Both locales (`/en` and `/hi`) share the identical route implementation and data requirements.*

| Route Path | Group | Allowed Role(s) | Data READ (Tables / Entities, Filters, Sort, Pagination) | Data WRITTEN | Auth Needed? | Caching Strategy | Loading / Empty / Error Handled? | Architectural Notes & Discrepancies |
|---|---|---|---|---|---|---|---|---|
| `/[locale]` | `(public)` | Anonymous / Public | `models` (active, featured), `used_cars` (sample 140-pt inspected), `showrooms`, `workshops`, `offers`, `testimonials` | None | No | ISR (`revalidate: 3600`) | Root `loading.tsx`, `error.tsx` | Landing aggregator `getLandingData()` currently pulls from `memoryStore`. Masked reg plates displayed. |
| `/[locale]/cars` | `(public)` | Anonymous / Public | `models` (all active), `variants` (prices), `offers`. Filters: body type, fuel, budget, transmission. Sort: price, name. | None | No | ISR (`revalidate: 3600`) | Dedicated `cars/loading.tsx`, Empty state in grid | 3D Flip cards rendered. Filters managed via `nuqs` URL parameters. |
| `/[locale]/cars/[modelSlug]` | `(public)` | Anonymous (Gated Breakup) | `models` (by slug), `variants` (by model_id), `variant_colors`, `price_rules` (city RTO, insurance, accessories) | None (Reads only) | Lead Gate (for line-by-line breakup) | ISR (`generateStaticParams`, `revalidate: 86400`) | Root fallback | **Security Gap:** Price breakup calculated client-side; total on-road price shown un-gated; `/api/price` leaks full tax lines to unauthenticated callers. |
| `/[locale]/used-cars` | `(public)` | Anonymous (Masked Reg) | `used_cars` (status = 'available' or 'booked'), `models` (names). Filters: budget, km, year, fuel. Sort: price, year, km. | None | No | ISR (`revalidate: 600`) | Dedicated `used-cars/loading.tsx`, Empty state | Reg numbers masked (`UP32 ** **** 4120`). 140-pt badge displayed. |
| `/[locale]/used-cars/[stockId]` | `(public)` | Anonymous (Gated Report) | `used_cars` (by stock_id), `models` (specs), `used_cars.inspection` JSON | None | Lead Gate (for full 140 checklist) | ISR (`generateStaticParams`, `revalidate: 600`) | Root fallback, `notFound()` | **Leak Risk:** All 140 checklist items passed in SSR props and rendered inside client `AuthGate`; page source contains raw inspection notes. |
| `/[locale]/book/test-drive` | `(buyer)` | Anonymous / Guest / Buyer | `showrooms` (active), `demo_cars` (active by showroom), `slots` (kind='test_drive', available capacity) | Creates `bookings` row, creates `leads` row | Auto-creates Guest or uses Auth | Dynamic (`force-dynamic`) | Stepper handles UI state | **Bypass Risk:** Form hardcodes `user_id: "usr-buyer-1"`. Consent initialized to `true` (DPDP breach). Direct mock imports. |
| `/[locale]/book/service` | `(buyer)` | Anonymous / Guest / Buyer | `workshops` (active), `slots` (kind='service', bay capacity) | Creates `bookings` row | Auto-creates Guest or uses Auth | Dynamic (`force-dynamic`) | Stepper handles UI state | Stores vehicle registration number (`UP32AB1234`). Hardcodes `user_id: "usr-buyer-1"`. No idempotency key. |
| `/[locale]/emi-calculator` | `(public)` | Anonymous / Public | `variants` (pre-population if query params present), default interest rates | None | No | Static | Interactive client calculator | Pure arithmetic calculation via `calcEmi()`. No sensitive data. |
| `/[locale]/trade-in` | `(public)` | Anonymous / Public | Historical sales reference / AI price band estimation | Creates `trade_in_requests` row | No | Static shell | Client form state | **Data Drop Bug:** Form captures name, phone, consent, but `createTradeInRequest` discards them and never creates a lead row. |
| `/[locale]/offers` | `(public)` | Anonymous / Public | `offers` (active, valid_until >= today) | None | No | ISR (`revalidate: 3600`) | Root fallback | Festive promotion banners and claim buttons. |
| `/[locale]/showrooms` | `(public)` | Anonymous / Public | `showrooms`, `workshops`, `cities` (geo lat/lng, phone, hours) | None | No | Static / ISR | Root fallback | Facility locator with click-to-call and map anchors. |
| `/[locale]/about` | `(public)` | Anonymous / Public | Dealership profile, leadership credentials | None | No | Static | Root fallback | Pure marketing credentials page. |
| `/[locale]/contact` | `(public)` | Anonymous / Public | `showrooms` (contact matrix) | Creates `leads` row via `EnquiryForm` | No | Static shell | Root fallback | Direct web enquiry form. Auto-assignment trigger. |
| `/[locale]/legal/privacy` | `(public)` | Anonymous / Public | Static legal privacy disclosures under DPDP Act 2023 | None | No | Static | Root fallback | Privacy policy, DPO contact details, lawful basis notices. |
| `/[locale]/legal/terms` | `(public)` | Anonymous / Public | Static booking terms & quotation validity rules | None | No | Static | Root fallback | Booking token policy, quotation validity terms. |
| `/[locale]/legal/data-rights` | `(public)` | Anonymous / Public | User profile consent status | Posts to `/api/me/delete` | Any signed-in or guest | Dynamic | Client toggle state | **Mock Leak:** Form simulates purge via `setTimeout` instead of calling `/api/me/delete`. |
| `/[locale]/sign-in` | `(auth)` | Anonymous / Public | None (Client form) | Auth session token, profile sync | No | Dynamic (`force-dynamic`) | Inline submit status | Mode switcher between signin & signup. Dev 1-click role switcher present. |
| `/[locale]/dashboard` | `(buyer)` | Authenticated Buyer | `bookings` (by user_id), `saved_items` (by user_id), `leads` (by user_id) | Cancels booking, removes saved item | Yes (`buyer`) | Dynamic (`force-dynamic`) | Tabbed empty states | **Critical Bug:** Server component calls `listBookings()`, `listLeads()`, `listSavedVehicles()` with NO `user_id`, sending all dealership leads to client! |
| `/[locale]/dashboard/bookings`| `(buyer)` | Authenticated Buyer | `bookings` (history and upcoming) | Reschedule, Cancel | Yes (`buyer`) | Dynamic (`force-dynamic`) | `EmptyState` present | Shows booking reference (`VR-XXXXXX`), specialist name. |
| `/[locale]/dashboard/saved` | `(buyer)` | Authenticated Buyer | `saved_items` (models & used cars) | Delete saved vehicle | Yes (`buyer`) | Dynamic (`force-dynamic`) | `EmptyState` present | Vehicle cards with direct removal action. |
| `/[locale]/dashboard/enquiries`| `(buyer)` | Authenticated Buyer | `leads` (submitted by user) | None | Yes (`buyer`) | Dynamic (`force-dynamic`) | `EmptyState` present | Lists open inquiries and assigned sales consultant name. |
| `/[locale]/dashboard/profile` | `(buyer)` | Authenticated Buyer | None (Redirects to `/profile`) | None | Yes (`buyer`) | Dynamic | N/A | Redirect wrapper. |
| `/[locale]/profile` | `(buyer)` | Authenticated Buyer | `profiles` (full_name, email, phone, whatsapp, address, pincode) | Updates `profiles` row via `PUT /api/me/profile` | Yes (`buyer`) | Dynamic | `AuthGate` fallback | Full profile management. Validates Indian PIN and phone. |
| `/[locale]/staff` | `(staff)` | Consultant / Manager | `leads` (assigned or showroom), `slots` (today), SLA breach counters | None | Yes (`consultant`+) | Dynamic (`force-dynamic`) | Metric skeleton fallback | **Gating Hole:** Layout has NO server auth check; anyone can access `/staff`. |
| `/[locale]/staff/leads` | `(staff)` | Consultant / Manager | `leads` (filtered by showroom, status, search), `profiles` (consultant names) | Lead status update | Yes (`consultant`+) | Dynamic (`force-dynamic`) | `DataTable` empty state | 5-minute SLA countdown timer on each row. Direct `memoryStore` import. |
| `/[locale]/staff/leads/[id]` | `(staff)` | Consultant / Manager | `leads` (by ID), `profiles` (all consultants for reassignment), `ai_logs` | Updates status to 'contacted', dispatches WhatsApp | Yes (`consultant`+) | Dynamic (`force-dynamic`) | "Lead Not Found" fallback | AI buyer summary card, AI reply composer with discount blocker. Direct `memoryStore` import. |
| `/[locale]/staff/leads/import`| `(staff)` | Consultant / Manager | Portal CSV template | Bulk creates `leads` rows | Yes (`consultant`+) | Dynamic (`force-dynamic`) | Parsing error table | **Architecture Bug:** Client component calls `processLeadCsv` directly instead of API endpoint. |
| `/[locale]/staff/bookings` | `(staff)` | Consultant / Manager | `bookings` (all showroom demo and service bay appointments) | Updates booking status to 'completed' | Yes (`consultant`+) | Dynamic (`force-dynamic`) | Table layout | Mark booking attended button calls `notWired()`. |
| `/[locale]/admin` | `(admin)` | Admin / Dealer Principal | Dealership leak metrics (₹2.11 cr calculator), SLA breach counts, conversion rate | None | Yes (`admin`) | Dynamic (`force-dynamic`) | LeakCard metric display | **Gating Hole:** Layout has NO role check; anyone can navigate to `/admin`. Direct `memoryStore` import. |
| `/[locale]/admin/models` | `(admin)` | Admin / Dealer Principal | `models` (all catalog vehicles, active status) | Creates model (`notWired`) | Yes (`admin`) | Dynamic (`force-dynamic`) | DataTable empty state | Catalog CMS listing. |
| `/[locale]/admin/models/[id]` | `(admin)` | Admin / Dealer Principal | `models` (by ID), `variants` (specifications, colors, ex-showroom) | Updates model details, adds variants | Yes (`admin`) | Dynamic (`force-dynamic`) | Form layout | Variant manager with fake `setTimeout` save. |
| `/[locale]/admin/prices` | `(admin)` | Admin / Dealer Principal | `price_rules` (all cities and variants), live simulator preview | Creates price rule (`notWired`) | Yes (`admin`) | Dynamic (`force-dynamic`) | Interactive simulator | City RTO, tax, and handling charges manager. Direct `memoryStore` import. |
| `/[locale]/admin/used-cars` | `(admin)` | Manager / Admin | `used_cars` (full inventory including private reg plates) | Intake used car (`notWired`) | Yes (`manager`+) | Dynamic (`force-dynamic`) | DataTable empty state | Certified inventory manager. |
| `/[locale]/admin/used-cars/[id]`| `(admin)` | Manager / Admin | `used_cars` (by ID), `used_car_price_suggestions` (AI price band) | Updates km, status, inspection JSON | Yes (`manager`+) | Dynamic (`force-dynamic`) | Form layout | AI price suggestion card visible to manager only. Fake `setTimeout` save. |
| `/[locale]/admin/showrooms` | `(admin)` | Admin / Dealer Principal | `showrooms`, `workshops`, `demo_cars` fleet | Adds facility (`notWired`) | Yes (`admin`) | Dynamic (`force-dynamic`) | Tabbed view | Facility and demo vehicle fleet configuration. |
| `/[locale]/admin/slots` | `(admin)` | Admin / Dealer Principal | `slots` (next 30 days capacity and booked counts) | Regenerate slots (`notWired`) | Yes (`admin`) | Dynamic (`force-dynamic`) | Slot grid view | Slot capacity generator trigger. Direct `memoryStore` import. |
| `/[locale]/admin/offers` | `(admin)` | Admin / Dealer Principal | `offers` (promotions, banners, expiry dates) | Creates offer (`notWired`) | Yes (`admin`) | Dynamic (`force-dynamic`) | DataTable view | Festive discount and corporate offer CMS. |
| `/[locale]/admin/banners` | `(admin)` | Admin / Dealer Principal | `banners` (homepage carousel banners, sort order) | Uploads banner (`notWired`) | Yes (`admin`) | Dynamic (`force-dynamic`) | Banner grid | Banner CMS. |
| `/[locale]/admin/assignment` | `(admin)` | Admin / Dealer Principal | `assignment_rules`, `showrooms`, `models`, `profiles` | Adds routing rule (`notWired`) | Yes (`admin`) | Dynamic (`force-dynamic`) | Rules table | Round-robin and showroom affinity configuration. |
| `/[locale]/admin/users` | `(admin)` | Admin / Dealer Principal | `profiles` (all staff, roles, cities) | Invites staff user (`notWired`) | Yes (`admin`) | Dynamic (`force-dynamic`) | DataTable view | Staff permission and role assignment manager. |
| `/[locale]/admin/ai-logs` | `(admin)` | Admin / Dealer Principal | `ai_logs` (prompt_hash, draft, final_sent, edited, model) | None (Audit review) | Yes (`admin`) | Dynamic (`force-dynamic`) | Audit table | Full audit trail of AI drafts and consultant modifications. |

#### In-Place Interactive Panels & Widgets
| Component / Widget | Mounting Location | Actor | Data READ | Data WRITTEN | Auth Needed? | Notes |
|---|---|---|---|---|---|---|
| `DashboardMobileSheet` | Buyer Dashboard (Mobile Viewport) | Authenticated Buyer | `bookings`, `saved_items`, `leads` (user's records) | Cancel booking, remove saved item | Yes (`buyer`) | Bottom slide-up sheet (Radix Dialog) mirroring desktop panel tabs. |
| `SignInSheet` | Global Header / `AuthGate` Fallbacks | Anonymous Public | None | Writes mock auth session to `localStorage` | No | Slides in from right. Mode toggle between signin and signup. Contains dev role switcher. |
| `ChatWidget` | Global Floating Bottom-Right | Anonymous Public | None (Hardcoded quick prompts) | None | No | **Mock Leftover:** Responses simulated via client `setTimeout`; does not invoke `/api/chat`. |
| Newsletter Widget | `SiteFooter` on all pages | Anonymous Public | None | Calls `POST /api/newsletter` | No | Unticked DPDP consent checkbox required before submission. |

#### API Route Stubs (`src/app/api/**`)
| API Route | HTTP Method | Expected Actor | Query / Body Parameters | Tables / Entities Read | Tables / Entities Written | Current Implementation Status & Critical Bugs |
|---|---|---|---|---|---|---|
| `/api/ai/lead-copilot` | POST | Staff / Consultant | Body: `{ leadId: string }` | `leads` | `ai_logs` | Calls `generateLeadCopilot(lead)`; returns drafted reply and summary. |
| `/api/bookings` | GET | Authenticated Buyer / Staff | Query: `?userId=...` | `bookings` | None | **Critical Leak:** If `userId` omitted, returns ALL bookings across all customers! |
| `/api/bookings` | POST | Buyer / Guest | Body: `CreateBookingInput` | `slots` (capacity) | `bookings`, `slots.booked_count` | Hardcodes `user_id: "usr-buyer-1"`. No idempotency key support. |
| `/api/cars/search` | GET | Anonymous Public | Query: `?q=...&body_type=...&fuel=...` | `models` | None | Filters models by query parameters. |
| `/api/chat` | POST | Anonymous Public | Body: `{ message: string }` | None | None | Stub returning generic mock assistant text. |
| `/api/consent` | POST | Public / Buyer | Body: `ConsentInput` | None | `consents` | Logs audit to console; does not write to database. |
| `/api/cron/sla` | GET | Automated Cron (Vercel) | Headers: `Authorization: Bearer <secret>` | `leads` | `leads.status` (breached) | Checks `sla_due_at < NOW()`. Validates `CRON_SECRET`. |
| `/api/export/daily-csv` | GET | Admin / DMS Sync | None | `leads` | None | **Critical Leak:** Unauthenticated endpoint exports all customer leads as CSV! |
| `/api/leads` | GET | Sales Staff / Admin | Query: `?status=...&source=...&search=...` | `leads` | None | **Critical Leak:** Unauthenticated endpoint returns all customer leads and phones! |
| `/api/leads` | POST | Anonymous Public | Body: `CreateLeadInput` | `assignment_rules` | `leads`, `messages_outbox` | Validates input with Zod. Invokes auto-assignment engine. |
| `/api/leads/[id]` | GET | Sales Staff | Param: `id` | `leads` | None | Unauthenticated lead lookup by ID. |
| `/api/leads/[id]` | PATCH | Sales Staff / Manager | Param: `id`, Body: `{ status?, assigned_to? }` | None | `leads`, `lead_events` | **Critical Hole:** Unauthenticated status updates and consultant reassignment. |
| `/api/leads/import` | POST | Sales Staff / Manager | Body: `{ csv: string }` | None | `leads`, `csv_imports` | Parses CSV and bulk inserts leads with deduplication. |
| `/api/me/delete` | POST | Authenticated Buyer | Body: `{ email, phone, confirmText }` | `profiles` | `profiles`, `consents` | Validates "DELETE MY DATA". Currently logs to console without DB deletion. |
| `/api/me/profile` | GET | Authenticated Buyer | Query: `?id=...` | `profiles` | None | Fetches profile by ID (defaults to "usr-buyer-1"). |
| `/api/me/profile` | PUT | Authenticated Buyer | Body: `ProfileUpdateInput` | None | `profiles` | Updates full name, email, WhatsApp, address, PIN code in store. |
| `/api/newsletter` | POST | Anonymous Public | Body: `{ email, consent: true }` | `newsletter_subscribers` | `newsletter_subscribers` | Validates Zod schema. Has working mock and Supabase fallback branches. |
| `/api/outbox/send` | POST | Internal Worker | Body: `OutboxMessage` | None | `messages_outbox` | Stub dispatching message via mock console log. |
| `/api/price` | GET | Anonymous Public | Query: `?variantId=...&cityId=...` | `variants`, `price_rules` | None | **Gating Hole:** Unauthenticated endpoint returns full on-road statutory tax lines! |
| `/api/slots` | GET | Anonymous Public | Query: `?kind=...&showroom_id=...&next=1` | `slots`, `showrooms` | None | Fetches available appointment slots. Handles `?next=1` for earliest slot. |
| `/api/trade-in` | POST | Anonymous Public | Body: `TradeInInput` | None | `trade_in_requests` | Validates Zod schema. Inserts trade-in record. |

---

### 2.2 Form Inventory

| Form / Action Name | Source File | Fields (Name, Type, Required, Validation Rules) | Consent Checkbox Present? | Actor | Resulting DB Rows / Mutations | Auth Gate Present? | Idempotency Risk & Mitigation |
|---|---|---|---|---|---|---|---|
| **Direct Web Enquiry** | `src/components/forms/EnquiryForm.tsx` | `name` (text, min 2)<br>`phone` (tel, Indian mobile `^[6-9]\d{9}$`)<br>`email` (email, optional)<br>`showroom_id` (select, required)<br>`message` (textarea, max 500)<br>`model_id` / `used_car_id` (hidden) | Yes (`ConsentCheckbox`), **BUG: pre-checked true in form state** | Anonymous Buyer | `leads` (1 row), `messages_outbox` (1 auto-ack row) | No (Public capture) | High. Rapid double-clicks create duplicate leads. Needs client UUID idempotency key. |
| **Get Best Offer (Modal Enquiry)** | `src/components/cars/PriceSummaryBar.tsx` | Pre-populates variant/model into `EnquiryForm` | Yes | Anonymous Buyer | `leads` (1 row) | No | High. Same as EnquiryForm. |
| **Used Car Trade-In Valuation** | `src/components/forms/TradeInForm.tsx` | `make` (text, min 2)<br>`model` (text, min 1)<br>`year` (number, 2005–2027)<br>`km` (number, min 0)<br>`condition` (select: excellent/good/fair)<br>`name` (text, min 2)<br>`phone` (tel, `^[6-9]\d{9}$`)<br>`notes` (textarea, optional) | Yes (`ConsentCheckbox`), **BUG: pre-checked true** | Anonymous Buyer | `trade_in_requests` (1 row). **BUG: Discards name/phone, creates no lead.** | No (Public capture) | High. Re-submission creates duplicate trade-in records without contact linkage. |
| **Test Drive Booking Wizard** | `src/app/[locale]/(buyer)/book/test-drive/page.tsx` | `showroom_id` (select)<br>`demo_car_id` (select)<br>`slot_id` (picker, required)<br>`name` (text, required)<br>`phone` (tel, min 10 digits)<br>`consent` (boolean, required) | Yes (`ConsentCheckbox`), **BUG: initialized true in useState** | Guest / Buyer | `bookings` (1 row, hardcoded `usr-buyer-1`), `leads` (1 row), increments `slots.booked_count` | No (Auto-guest flow) | Extreme. Double-submit books 2 demo slots. Needs transactional idempotency key. |
| **Workshop Service Booking** | `src/app/[locale]/(buyer)/book/service/page.tsx` | `workshop_id` (select)<br>`service_type` (select)<br>`slot_id` (picker, required)<br>`model_name` (text, required)<br>`reg_no` (text, e.g. UP32AB1234)<br>`name` (text, required)<br>`phone` (tel, min 10 digits)<br>`consent` (boolean, required) | Yes (`ConsentCheckbox`), **BUG: initialized true in useState** | Guest / Buyer | `bookings` (1 row, hardcoded `usr-buyer-1`), increments `slots.booked_count` | No (Auto-guest flow) | Extreme. Double-submit reserves multiple bay slots. |
| **Footer Newsletter Subscription** | `src/components/layout/SiteFooter.tsx` | `email` (email, valid format)<br>`consent` (checkbox, required) | Yes (Unchecked standard Checkbox) | Anonymous Public | `newsletter_subscribers` (1 row) | No | Medium. Deduplicated by unique email constraint in database. |
| **Dashboard Profile Settings** | `src/components/dashboard/ProfileForm.tsx` | `name` (text, required)<br>`phone` (tel, optional)<br>`email` (text, disabled) | No (Account profile) | Authenticated Buyer | Updates `profiles` row | `AuthGate` | Low. Idempotent profile update. |
| **Full Profile Management** | `src/components/profile/ProfileView.tsx` | `fullName` (text, min 2)<br>`email` (email, valid format)<br>`whatsapp` (tel, Indian mobile `^[6-9]\d{9}$`)<br>`address` (text, min 5)<br>`pincode` (text, 6-digit `^[1-9][0-9]{5}$`) | No (Implicit account profile) | Authenticated Buyer | Updates `profiles` row via `PUT /api/me/profile` | `AuthGate` | Low. Idempotent profile update. |
| **Sign-In / Sign-Up Form** | `src/app/[locale]/(auth)/sign-in/page.tsx` & `SignInSheet.tsx` | `email` (email, required)<br>If Sign-up: `fullName` (text), `whatsapp` (tel), `address` (text), `pincode` (6-digit) | No (Missing terms & privacy checkboxes) | Anonymous Visitor | Currently writes to `localStorage` mock session | No | Low (Auth flow). In Phase 1 must create `auth.users` + `profiles` transaction. |
| **DPDP Marketing Opt-Out** | `src/components/dashboard/DataRightsPanel.tsx` | `optOutMarketing` (switch toggle) | N/A (Consent toggle) | Authenticated Buyer | Updates `consents` row | No | Low. Idempotent toggle. Currently only toasts. |
| **Right to Erasure Purge Request** | `src/components/dashboard/DataRightsPanel.tsx` | `deleteInput` (text, must match "DELETE MY DATA") | N/A (Statutory right) | Authenticated Buyer | `POST /api/me/delete` | No | Critical. Currently simulated via `setTimeout`; must execute soft-delete & PII scrub. |
| **Staff CSV Lead Ingestion** | `src/app/[locale]/(staff)/staff/leads/import/page.tsx` | `csvContent` (raw file or pasted CSV text) | No (Portal import) | Sales Staff / Manager | Bulk inserts `leads` (N rows), logs `csv_imports` (1 row) | Staff layout | High. Retrying imports could duplicate rows if phone dedupe index is absent. |
| **Staff Lead Reassignment** | `src/components/staff/ReassignDialog.tsx` | `selectedConsultant` (select, consultant UUID) | No (Internal staff) | Sales Staff / Manager | Updates `leads.assigned_to`, creates `lead_events` | Staff layout | Low. Idempotent update. |
| **Staff AI Reply & WhatsApp Send** | `src/components/staff/ReplyDraftEditor.tsx` | `draft` (textarea, blocks discount words) | No (Consultant communication) | Sales Consultant | Creates `messages_outbox` (1 row), updates `leads.status` = 'contacted' | Staff layout | High. Fast clicking can dispatch multiple WhatsApp messages. |
| **Mark Booking Attended** | `src/app/[locale]/(staff)/staff/bookings/page.tsx` | Attended button (`notWired`) | No (Internal staff) | Sales Staff / Workshop Lead | Updates `bookings.status` = 'completed' | Staff layout | Low. Idempotent state transition. |
| **Reschedule Booking** | `BookingCard.tsx`, `BookingDetailsDialog.tsx` | Reschedule button (`notWired`) | No | Authenticated Buyer | Updates `bookings.slot_id` | `AuthGate` | High. Concurrency race on new slot capacity. |
| **Cancel Booking** | `BookingCard.tsx`, `BookingDetailsDialog.tsx` | Cancel button (`notWired`) | No | Authenticated Buyer | Updates `bookings.status` = 'cancelled', decrements slot booked count | `AuthGate` | Low. Idempotent cancellation. |
| **Remove Saved Vehicle** | `SavedCarCard.tsx`, `SavedVehiclesCard.tsx` | Remove button (`notWired`) | No | Authenticated Buyer | Deletes row from `saved_items` | `AuthGate` | Low. Idempotent deletion. |
| **Save / Bookmark Car** | `src/app/[locale]/(public)/cars/[modelSlug]/ModelDetailView.tsx` | Save button toggle | No | Authenticated Buyer | Inserts row into `saved_items` | `requireAuth` | Low. DB unique constraint `(user_id, model_id)` prevents duplicates. |
| **Admin Model Create / Edit** | `admin/models/page.tsx` & `admin/models/[id]/page.tsx` | `name`, `tagline`, `bodyType`, `isActive` | No | Admin | Inserts/Updates `models` table | Admin layout | Medium. Model slug must be unique. |
| **Admin Add / Edit Variant** | `admin/models/[id]/page.tsx` | `name`, `fuel`, `transmission`, `ex_showroom`, `specs` | No | Admin | Inserts/Updates `variants` table | Admin layout | Low. Admin mutation. |
| **Admin Create Price Rule** | `admin/prices/page.tsx` | `city_id`, `road_tax_pct`, `registration`, `insurance`, `handling`, `accessories`, `valid_from`, `valid_until` | No | Admin | Inserts `price_rules` table | Admin layout | Critical. Must check date range overlap with GiST exclusion. |
| **Admin Used Car Intake & Edit** | `admin/used-cars/page.tsx` & `admin/used-cars/[id]/page.tsx` | `km`, `price`, `status`, `inspectionJson` | No | Used-Car Manager / Admin | Inserts/Updates `used_cars` table | Admin layout | Low. Admin inventory mutation. |
| **Admin Facility / Demo Car Manager**| `admin/showrooms/page.tsx` | `name`, `address`, `phone`, `bays`, `demo_cars` | No | Admin | Inserts/Updates `showrooms`, `workshops`, `demo_cars` | Admin layout | Low. Facility management. |
| **Admin Slot Regenerate** | `admin/slots/page.tsx` | Regenerate 30-day capacity button (`notWired`) | No | Admin | Inserts recurring `slots` rows | Admin layout | Critical. Must not overwrite or corrupt already-booked slots. |
| **Admin Offer / Banner CMS** | `admin/offers/page.tsx` & `admin/banners/page.tsx` | `title`, `body`, `valid_until`, `image_url` | No | Admin | Inserts `offers`, `banners` tables | Admin layout | Low. Promotional CMS. |
| **Admin Assignment Rule & Invite**| `admin/assignment/page.tsx` & `admin/users/page.tsx` | `showroom_id`, `model_id`, `consultant_ids`, `email`, `role` | No | Admin | Inserts `assignment_rules`, invites Supabase auth user | Admin layout | Low. Admin config. |

---

## 3. Profile and Sign-Up Fields Analysis

The product owner requires that buyer profile details be stored in the database and collected during the account registration/onboarding flow.

### 3.1 Field-by-Field Comparison Matrix

| Field Name | In UI? | In Type? (`Profile`) | In DB? (`profiles`) | Proposed Column | Required at Sign-Up? | Purpose in Vrooma | DPDP Act Minimisation Assessment | Frontend Validation Rule |
|---|---|---|---|---|---|---|---|---|
| **ID** | Yes | Yes (`id: string`) | Yes (`id UUID`) | `id UUID PRIMARY KEY REFERENCES auth.users(id)` | System (Auto) | Core account identity foreign key linking to Supabase Auth. | Necessary. | UUID string. |
| **Full Name** | Yes | Yes (`full_name`) | Yes (`full_name TEXT`) | `full_name TEXT NOT NULL` | **Yes (Required)** | Personalizing quotation dockets, booking dockets, and greeting. | Lawful. Basic personal identifier for service fulfilment. | `min(2)`, `max(100)`, trimmed string. |
| **Email Address** | Yes | Yes (`email`) | **No (Missing in `profiles`)** | `email TEXT NOT NULL` (or synced from `auth.users`) | **Yes (Required)** | Primary account login identifier, booking confirmation PDF delivery. | Lawful. Core contact and authentication channel. | Zod `email()` format. |
| **Mobile Number** | Yes | Yes (`phone`) | Yes (`phone TEXT`) | `phone TEXT NOT NULL CHECK (phone ~ '^\+91[6-9]\d{9}$')` | **Yes (Required)** | Primary Indian contact channel for 5-minute sales SLA calls and OTP. | Lawful & essential for test-drive and quotation fulfilment. | E.164: `+91` followed by 10 digits starting with 6–9. |
| **WhatsApp Number**| Yes | Yes (`whatsapp`) | **No (Missing in `profiles`)** | `whatsapp TEXT CHECK (whatsapp IS NULL OR whatsapp ~ '^\+91[6-9]\d{9}$')` | Optional (Ask later) | Dispatching AI first-reply drafts and automated booking vouchers. | Redundant at sign-up if identical to mobile. Default to mobile number. | E.164: `+91` followed by 10 digits. |
| **City** | Yes | Yes (`city_id`) | Yes (`city_id UUID`) | `city_id UUID REFERENCES cities(id) ON DELETE SET NULL` | **Yes (Required)** | Defaulting on-road RTO tax calculations (Lucknow vs Kanpur). | Lawful. Determines applicable state/district vehicle taxes. | Valid UUID referencing `cities.id`. |
| **Preferred Language** | Yes | Yes (`locale`) | Yes (`locale TEXT`) | `locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'hi'))` | **Yes (Required)** | Rendering UI and outbound SMS/WhatsApp messages in English or authentic Hindi. | Lawful. Communications preference. | Enum `'en'` \| `'hi'`. |
| **Role** | Yes | Yes (`role`) | Yes (`role role_type`) | `role role_type NOT NULL DEFAULT 'buyer'` | System (Default 'buyer') | Role-based authorization (buyer, consultant, manager, admin). | Necessary for access control. | Fixed enum. Never user-editable. |
| **Home / Delivery Address** | Yes | Yes (`address`) | **No (Missing in `profiles`)** | `address TEXT` | **No (Optional, Ask later)** | Needed ONLY if buyer requests a Home Test Drive or doorstep delivery. | **Minimisation Breach if asked at sign-up.** Not required to browse or quote. | `min(5)`, `max(255)`. Ask only when booking home drive. |
| **PIN Code** | Yes | Yes (`pincode`) | **No (Missing in `profiles`)** | `pincode TEXT CHECK (pincode IS NULL OR pincode ~ '^[1-9][0-9]{5}$')` | **No (Optional, Ask later)** | Verifying showroom service catchment and home test drive feasibility. | **Minimisation Breach if asked at sign-up.** Ask alongside physical address. | Indian 6-digit postal code `^[1-9][0-9]{5}$`. |
| **Terms & Privacy Consent** | No | No | **No (Implicit in `consents`)** | `terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` | **Yes (Required Checkbox)** | Verifiable legal consent under Section 6 of DPDP Act 2023. | Mandatory statutory requirement for processing personal data. | Un-checked checkbox, explicit affirmative action. |
| **Transactional Consent** | No | No | **No (Implicit in `consents`)** | `service_consent BOOLEAN NOT NULL DEFAULT TRUE` | **Yes (Required Checkbox)** | Consent to receive transactional booking updates via SMS/WhatsApp. | Lawful. Necessary for booking fulfilment. | Explicit checkbox or clearly stated in sign-up notice. |
| **Marketing Consent** | Yes (in settings)| No | **No (Implicit in `consents`)** | `marketing_consent BOOLEAN NOT NULL DEFAULT FALSE` | Optional (Unchecked) | Seasonal festival offers, price revision alerts. | Optional under DPDP. Cannot be bundled into mandatory terms. | Un-checked checkbox. User can toggle off in `/legal/data-rights`. |
| **Driver License Number** | No (Mentioned in docs) | No | No | `driver_license TEXT` | **No (Optional, Ask later)** | Verifying eligibility before handing over showroom demo vehicle. | Not needed for account creation. Ask in Step 4 of test-drive wizard. | Valid Indian Driving License format. |
| **Preferred Showroom** | No | No | No | `preferred_showroom_id UUID REFERENCES showrooms(id)` | **No (Optional, Ask later)** | Routing buyer enquiries to nearest facility. | Not needed at sign-up. Inferred from booking or city selection. | Valid showroom UUID. |

### 3.2 Current Sign-In & Sign-Up Status
- **Does a dedicated sign-up page exist?**  
  **No.** There is only `/sign-in`. While `/sign-in` and `SignInSheet.tsx` contain an in-place tab switcher (`mode === "signin" | "signup"`), it does not create a real account. In "signup" mode, it collects name, email, WhatsApp, address, and PIN code, and immediately saves them to `localStorage` under `vrooma_mock_user`.
- **Does an onboarding step exist?**  
  **No.** There is currently no onboarding flow, no mobile phone OTP verification screen, and no progressive profile completion wizard.
- **What does the sign-in sheet do today?**  
  It allows visitors to enter any mock email address or click one of the 4 Dev 1-Click Role Switcher buttons (`Buyer`, `Consultant`, `Manager`, `Admin`) to instantly switch active persona. This will be replaced in Phase 1 with authentic Supabase Auth (Magic Link, Phone OTP, Google OAuth) and a dedicated `/sign-up` + onboarding sequence.

---

## 4. Type and Schema Diff

Comparison between TypeScript definitions in `src/types/domain.ts` and SQL migrations in `supabase/migrations/`:

| Domain Type | Migration Table / Status | Missing Columns / Type Discrepancies | Severity | Action Required in Migration Rewrite |
|---|---|---|---|---|
| `Role` | `role_type` ENUM in `0001` | None. Matches `('buyer', 'consultant', 'manager', 'admin')`. | Low | Keep enum as is. |
| `City` | `cities` table in `0001` | None. Fields `id`, `name`, `state`, `slug` match 1:1. | Low | Matches. |
| `Showroom` | `showrooms` table in `0001` | Missing `demo_cars JSONB` in table (present in `DATA_MODEL.md`; `0004` has separate `demo_cars` table). | Low | Use normalized `demo_cars` table from migration `0004`. |
| `Workshop` | `workshops` table in `0001` | None. `bays INT`, `hours JSONB` match. | Low | Matches. |
| `VariantColor` | `variant_colors` table in `0002` | None. `variant_id`, `name`, `hex`, `image_url` match. | Low | Matches. |
| `Variant` | `variants` table in `0002` | `ex_showroom` is typed `INT` in DB instead of `BIGINT`. | Medium | Alter `ex_showroom` to `BIGINT` to prevent any integer rupee overflow. |
| `Model` | `models` table in `0002`, `0009` | `body_type` is raw `TEXT` in DB; type has `BodyType` union (`sedan`, `suv`, `hatchback`, `ev`, `mpv`). | Medium | Introduce `CREATE TYPE body_style AS ENUM (...)` in PostgreSQL. |
| `PriceRule` | `price_rules` table in `0002` | Money fields (`registration`, `insurance`, `handling`, `accessories`) are `INT` instead of `BIGINT`. Valid dates are `DATE` without timezone. | High | Change money columns to `BIGINT`. Implement GiST exclusion constraint to block overlapping date ranges. |
| `UsedCar` | `used_cars` table in `0003`, `0009` | **MISSING COLUMN:** `transmission transmission_type` is completely missing from `used_cars` in migration `0003`! Money `price` is `INT` instead of `BIGINT`. | **Critical** | Add `transmission transmission_type NOT NULL` to `used_cars`. Change `price` to `BIGINT`. |
| `Slot` | `slots` table in `0004` | **MISSING COLUMN:** `booked_count INT` is missing from `slots` in migration `0004`. | **Critical** | Add `booked_count INT NOT NULL DEFAULT 0 CHECK (booked_count <= capacity)`. |
| `Booking` | `bookings` table in `0004` | **MISSING COLUMN:** `booking_ref TEXT` is missing. The UI currently derives references on the fly via `bookingRef(id)`. | High | Add `booking_ref TEXT UNIQUE NOT NULL` (e.g. `VR-TD-202611-XXXX`). |
| `Lead` | `leads` table in `0005` | **MISSING COLUMN:** `lead_ref TEXT` is missing. Deduplication index uses `(phone, model_id, created_at::date)` which fails for used cars. | High | Add `lead_ref TEXT UNIQUE NOT NULL`. Improve dedupe index to include `used_car_id`. |
| `Profile` | `profiles` table in `0005` | **MISSING COLUMNS:** `email`, `whatsapp`, `address`, `pincode` are missing from `profiles` table. | **Critical** | Add `email TEXT`, `whatsapp TEXT`, `address TEXT`, `pincode TEXT` to `profiles`. |
| `TradeInRequest`| `trade_in_requests` table in `0006` | Missing valuation band columns (`estimated_min BIGINT`, `estimated_max BIGINT`). `condition` is `TEXT` instead of enum. | Medium | Add structured estimated range columns and use `vehicle_condition` enum. |
| `OutboxMessage` | `messages_outbox` table in `0006` | `channel` and `status` are typed `TEXT` instead of enums. | Low | Convert `channel` to `outbox_channel` enum and `status` to `outbox_status` enum. |

### 4.1 Detailed Analysis of Known Architectural Risks

#### (a) `assignment_rules.consultant_ids uuid[]` Has No Foreign Keys
- **Current State:** Migration `0005` defines `consultant_ids UUID[] NOT NULL DEFAULT '{}'`. PostgreSQL does not enforce foreign key referential integrity on elements inside arrays. If a consultant is removed from `profiles`, dangling UUIDs remain in the routing pool.
- **Proposed Solution:** Remove `consultant_ids` array. Create a normalized join table:
  ```sql
  CREATE TABLE assignment_rule_consultants (
    rule_id UUID REFERENCES assignment_rules(id) ON DELETE CASCADE,
    consultant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    priority INT NOT NULL DEFAULT 1,
    PRIMARY KEY (rule_id, consultant_id)
  );
  ```

#### (b) No Consultant-to-Showroom Membership Table
- **Current State:** `profiles` contains only `city_id UUID`. There is no table linking sales consultants or service advisors to their primary physical showroom or workshop facility.
- **Proposed Solution:** Introduce `staff_facilities`:
  ```sql
  CREATE TABLE staff_facilities (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    showroom_id UUID REFERENCES showrooms(id) ON DELETE CASCADE,
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_staff_facility CHECK (showroom_id IS NOT NULL OR workshop_id IS NOT NULL),
    PRIMARY KEY (user_id, COALESCE(showroom_id, workshop_id))
  );
  ```

#### (c) `saved_items` Polymorphic Integrity Flaw
- **Current State:** Migration `0006` defines `saved_items(target_type TEXT, target_id UUID)`. There is zero database-level referential integrity. Deleting a vehicle leaves orphan rows.
- **Proposed Solution:** Replace polymorphic target with explicit nullable foreign keys and a check constraint ensuring exactly one target is specified:
  ```sql
  CREATE TABLE saved_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    used_car_id UUID REFERENCES used_cars(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_saved_item_target CHECK (
      (model_id IS NOT NULL AND used_car_id IS NULL) OR
      (model_id IS NULL AND used_car_id IS NOT NULL)
    ),
    UNIQUE (user_id, model_id),
    UNIQUE (user_id, used_car_id)
  );
  ```

#### (d) Booking & Lead Reference Codes Derived on the Fly
- **Current State:** `bookingRef(id)` takes the first 6 characters of a raw ID string (e.g. `VR-BOOKSA`). For UUIDs, this causes collisions (e.g. `VR-C00000`) and provides no semantic order.
- **Proposed Solution:** Add dedicated columns populated by database sequences or trigger generators:
  - `bookings.booking_ref TEXT UNIQUE NOT NULL DEFAULT ('VR-BK-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(NEXTVAL('booking_ref_seq')::TEXT, 4, '0'))`
  - `leads.lead_ref TEXT UNIQUE NOT NULL DEFAULT ('VR-LD-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(NEXTVAL('lead_ref_seq')::TEXT, 4, '0'))`

#### (e) Buyer Exposure of Consultant Private Data
- **Current State:** Buyer bookings and appointments display consultant names (e.g. "Rohit Verma"). If queries join the full `profiles` table, email addresses, phone numbers, and internal staff roles leak to buyers.
- **Proposed Solution:** Create a security-restricted public view:
  ```sql
  CREATE VIEW public_consultants AS
    SELECT id, full_name, role, city_id
    FROM profiles
    WHERE role IN ('consultant', 'manager');
  ```
  RLS on `profiles` must block buyers from selecting consultant phone numbers or email addresses.

#### (f) `price_rules` Overlapping Validity Ranges
- **Current State:** `price_rules` has only a standard index on `(city_id, valid_from, valid_until)`. Nothing prevents an administrator from inserting two conflicting rules for Lucknow RTO active during the same month.
- **Proposed Solution:** Enforce GiST range exclusion:
  ```sql
  CREATE EXTENSION IF NOT EXISTS btree_gist;
  ALTER TABLE price_rules ADD CONSTRAINT no_overlapping_price_rules
    EXCLUDE USING gist (
      city_id WITH =,
      COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
      daterange(valid_from, valid_until, '[]') WITH &&
    );
  ```

#### (g) `slots` Capacity & Concurrency Control
- **Current State:** Slot availability is checked by filtering in-memory arrays. Migration `0004` lacks `booked_count`. In production, two simultaneous booking requests will both read available capacity and succeed, double-booking the demo vehicle or service bay.
- **Proposed Solution:**
  1. Add `booked_count INT NOT NULL DEFAULT 0 CHECK (booked_count <= capacity)`.
  2. Implement an atomic booking stored procedure using `SELECT ... FOR UPDATE` on `slots` with row locking:
     ```sql
     UPDATE slots
     SET booked_count = booked_count + 1
     WHERE id = p_slot_id AND booked_count < capacity;
     ```

#### (h) Money Columns and Phone Formats
- **Money Values:** Migrations `0002` and `0003` declare money amounts as standard 32-bit `INT`. To guarantee future-proofing for luxury vehicle trims and aggregate dealership turnover metrics, all money columns must be normalized to `BIGINT` representing integer rupees.
- **Phone Formats:** The code currently accepts spaces, dashes, and unformatted numbers. Convention 8 mandates E.164 format (`+91XXXXXXXXXX`). A database check constraint must enforce this across all tables:
  ```sql
  CHECK (phone ~ '^\+91[6-9]\d{9}$')
  ```

#### (i) Timezone Handling
- Convention 8 mandates: "All timestamps are `timestamptz`; display in Asia/Kolkata."
- In migration `0002`, `valid_from` and `valid_until` are stored as naive `DATE`. A date compared against UTC midnight causes rules to expire at 05:30 AM IST. All date bounds must be interpreted explicitly in `Asia/Kolkata` or stored as `TIMESTAMPTZ`.

---

## 5. Mock Leftovers Inventory

Exhaustive search of mock flags, hardcoded stores, and non-wired triggers across the repository:

### 5.1 Environment & Mock Flag
- `src/lib/env.ts:5`: `NEXT_PUBLIC_USE_MOCK: z.string().default("true").transform(...)`
- `src/lib/env.ts:19`: `NEXT_PUBLIC_USE_MOCK: process.env.NEXT_PUBLIC_USE_MOCK ?? "true"`
- `src/lib/env.ts:36`: Hardcoded fallback `NEXT_PUBLIC_USE_MOCK: true`
- *Replacement in Phase 3:* Set `NEXT_PUBLIC_USE_MOCK=false` in environment, update `env.ts` to require valid Supabase keys, and delete the fallback branch.

### 5.2 In-Memory Store (`memoryStore`) & Direct Imports
`src/server/store.ts` defines class `MemoryStore` initialized with seed datasets. It is currently imported and queried directly in **36 files**:
1. `src/server/store.ts:23`: Singleton store definition.
2. `src/app/api/cron/sla/route.ts:2`: Reads `memoryStore.leads`.
3. `src/app/api/export/daily-csv/route.ts:2`: Reads `memoryStore.leads`.
4. `src/app/api/me/profile/route.ts:4`: Updates user in `memoryStore`.
5. `src/app/api/newsletter/route.ts:4`: Reads/Writes `memoryStore.subscribers`.
6. `src/app/[locale]/(admin)/admin/assignment/page.tsx:4`: Reads rules and users from `memoryStore`.
7. `src/app/[locale]/(admin)/admin/banners/page.tsx:4`: Reads `memoryStore.banners`.
8. `src/app/[locale]/(admin)/admin/models/[id]/page.tsx:6`: Reads `memoryStore.models`.
9. `src/app/[locale]/(admin)/admin/models/page.tsx:5`: Reads `memoryStore.models`.
10. `src/app/[locale]/(admin)/admin/offers/page.tsx:4`: Reads `memoryStore.offers`.
11. `src/app/[locale]/(admin)/admin/prices/page.tsx:4`: Reads `memoryStore.priceRules`.
12. `src/app/[locale]/(admin)/admin/showrooms/page.tsx:4`: Reads `memoryStore.showrooms`.
13. `src/app/[locale]/(admin)/admin/slots/page.tsx:4`: Reads `memoryStore.slots`.
14. `src/app/[locale]/(admin)/admin/used-cars/[id]/page.tsx:6`: Reads `memoryStore.usedCars`.
15. `src/app/[locale]/(admin)/admin/used-cars/page.tsx:5`: Reads `memoryStore.usedCars`.
16. `src/app/[locale]/(admin)/admin/users/page.tsx:4`: Reads `memoryStore.users`.
17. `src/app/[locale]/(admin)/admin/page.tsx:4`: Reads leads and conversion stats from `memoryStore`.
18. `src/app/[locale]/(staff)/staff/bookings/page.tsx:4`: Reads `memoryStore.bookings`.
19. `src/app/[locale]/(staff)/staff/leads/[id]/page.tsx:6`: Reads `memoryStore.leads` and `memoryStore.users`.
20. `src/app/[locale]/(staff)/staff/leads/page.tsx:9`: Reads `memoryStore.leads`.
21. `src/app/[locale]/(staff)/staff/page.tsx:9`: Reads `memoryStore.leads`.
22. `src/server/repositories/bookings.ts:2`: Reads/Writes `memoryStore.bookings`.
23. `src/server/repositories/leads.ts:2`: Reads/Writes `memoryStore.leads`.
24. `src/server/repositories/models.ts:2`: Reads `memoryStore.models`.
25. `src/server/repositories/offers.ts:2`: Reads `memoryStore.offers`, `memoryStore.banners`.
26. `src/server/repositories/pricing.ts:2`: Reads `memoryStore.priceRules`.
27. `src/server/repositories/saved.ts:2`: Reads/Writes `memoryStore.savedCarIds`.
28. `src/server/repositories/showrooms.ts:2`: Reads `memoryStore.showrooms`, `memoryStore.workshops`.
29. `src/server/repositories/slots.ts:2`: Reads `memoryStore.slots`, `memoryStore.demoCars`.
30. `src/server/repositories/trade-in.ts:2`: Writes `memoryStore.tradeInRequests`.
31. `src/server/repositories/used-cars.ts:2`: Reads `memoryStore.usedCars`.
32. `src/server/repositories/users.ts:2`: Reads/Writes `memoryStore.users`.
33. `src/server/repositories/variants.ts:2`: Reads `memoryStore.variants`.
34. `src/server/services/csv-import.ts:4`: Reads `memoryStore.leads`.
35. `src/server/services/lead-assignment.ts:1`: Reads `memoryStore.users`.
36. `src/server/services/outbox.ts:1`: Writes `memoryStore.outbox`.
37. `src/server/services/slot-engine.ts:1`: Reads `memoryStore.slots`.
- *Replacement in Phases 3–5:* Replace all `memoryStore` queries with typed Supabase repository functions. Admin and staff pages must fetch through repository interfaces or Server Actions, never direct store imports.

### 5.3 LocalStorage Sessions & Dev Role Switcher
- `src/components/auth/AuthProvider.tsx:22`: `const STORAGE_KEY = "vrooma_mock_user"`
- `src/components/auth/AuthProvider.tsx:34`: `localStorage.getItem(STORAGE_KEY)`
- `src/components/auth/AuthProvider.tsx:81, 103, 124, 134`: `localStorage.setItem` / `removeItem`
- `src/app/[locale]/(auth)/sign-in/page.tsx:214-256`: Dev 1-Click Role Switcher buttons (Buyer, Consultant, Manager, Admin).
- `src/components/auth/SignInSheet.tsx:223-288`: Dev 1-Click Role Switcher buttons.
- `src/components/auth/AuthProvider.tsx:128`: `switchRole(newRole: Role)` synthesizing mock profiles.
- *Replacement in Phase 1:* Replace with Supabase SSR Auth cookies (`@supabase/ssr`). Remove mock localStorage serialization. Replace dev role buttons with real credentialed test accounts or dev-only seed logins guarded by `NODE_ENV === 'development'`.

### 5.4 Active `notWired()` Calls (28 Registered Locations)
- `src/app/[locale]/(admin)/admin/assignment/page.tsx:24`: `notWired("Add Routing Rule", 3)`
- `src/app/[locale]/(admin)/admin/assignment/page.tsx:63`: `notWired("Configure Pool for Showroom", 3)`
- `src/app/[locale]/(admin)/admin/banners/page.tsx:47`: `notWired("Upload New Banner", 3)`
- `src/app/[locale]/(admin)/admin/models/[id]/page.tsx:96`: `notWired("Add Variant", 3)`
- `src/app/[locale]/(admin)/admin/models/[id]/page.tsx:122`: `notWired("Edit Variant", 3)`
- `src/app/[locale]/(admin)/admin/models/page.tsx:82`: `notWired("Create New Model", 3)`
- `src/app/[locale]/(admin)/admin/offers/page.tsx:52`: `notWired("Create Showroom Offer", 3)`
- `src/app/[locale]/(admin)/admin/prices/page.tsx:104`: `notWired("Create Price Rule", 3)`
- `src/app/[locale]/(admin)/admin/showrooms/page.tsx:101`: `notWired("Add Showroom", 3)`
- `src/app/[locale]/(admin)/admin/showrooms/page.tsx:115`: `notWired("Add Workshop", 3)`
- `src/app/[locale]/(admin)/admin/showrooms/page.tsx:129`: `notWired("Add Demo Car", 3)`
- `src/app/[locale]/(admin)/admin/slots/page.tsx:69`: `notWired("Regenerate Next 30 Days Slots", 3)`
- `src/app/[locale]/(admin)/admin/used-cars/page.tsx:106`: `notWired("Intake Used Car", 3)`
- `src/app/[locale]/(admin)/admin/users/page.tsx:86`: `notWired("Invite Staff User", 3)`
- `src/app/[locale]/(auth)/sign-in/page.tsx:208`: `notWired("Google OAuth", 4)`
- `src/app/[locale]/(staff)/staff/bookings/page.tsx:82`: `notWired("Mark Booking Attended", 4)`
- `src/components/auth/SignInSheet.tsx:217`: `notWired("Google OAuth", 4)`
- `src/components/cars/PriceSummaryBar.tsx:39`: `notWired("Get Best Offer Enquiry", 4)`
- `src/components/dashboard/BookingCard.tsx:67`: `notWired("Reschedule Booking", 4)`
- `src/components/dashboard/BookingCard.tsx:75`: `notWired("Cancel Booking", 4)`
- `src/components/dashboard/BookingDetailsDialog.tsx:190`: `notWired("Reschedule Booking", 4)`
- `src/components/dashboard/BookingDetailsDialog.tsx:198`: `notWired("Cancel Booking", 4)`
- `src/components/dashboard/DashboardPanelContent.tsx:275`: `notWired("Reschedule Booking", 4)`
- `src/components/dashboard/DashboardPanelContent.tsx:283`: `notWired("Cancel Booking", 4)`
- `src/components/dashboard/DashboardPanelContent.tsx:428`: `notWired("Remove Saved", 4)`
- `src/components/dashboard/NextAppointmentCard.tsx:123`: `notWired("Cancel Booking", 4)`
- `src/components/dashboard/SavedCarCard.tsx:70`: `notWired("Remove Saved Car", 4)`
- `src/components/dashboard/SavedVehiclesCard.tsx:133`: `notWired("Remove Saved Vehicle", 4)`
- *Replacement in Phases 1–5:* Wire each button to its designated Server Action or Supabase mutation until count reaches exactly **0**.

### 5.5 Hardcoded Component Demo Data
- `src/app/[locale]/(buyer)/book/service/page.tsx:14, 15`: Directly imports `mockWorkshops` and `mockSlots`.
- `src/app/[locale]/(buyer)/book/test-drive/page.tsx:14, 15`: Directly imports `mockShowrooms`, `mockDemoCars`, `mockSlots`.
- `src/app/[locale]/(public)/cars/[modelSlug]/ModelDetailView.tsx:8`: Directly imports `mockPriceRules`.
- `src/app/[locale]/(public)/cars/page.tsx:10, 11`: Directly imports `mockModels` and `mockOffers`.
- `src/app/[locale]/(public)/used-cars/page.tsx:11`: Directly imports `mockUsedCars`.
- `src/app/sitemap.ts:2, 3`: Directly imports `mockModels` and `mockUsedCars`.
- `src/components/auth/AuthProvider.tsx:5`: Directly imports `mockUsers`.
- `src/components/chat/ChatWidget.tsx:72-86`: Hardcoded keyword-matching bot replies inside `setTimeout`.
- `src/components/dashboard/DataRightsPanel.tsx:34-42`: Simulated 500ms purge timer without calling `/api/me/delete`.
- `src/components/forms/TradeInForm.tsx:141`: Mocked photo upload UI comment.
- `src/components/landing/Reviews.tsx:6, 90`: Uses `sampleTestimonials` ("Sample reviews. Replace with real customer reviews before launch.").
- *Replacement in Phases 3–5:* Replace component mock imports with SSR repository props; connect `ChatWidget` to Vercel AI SDK; connect `DataRightsPanel` to real purge endpoint.

### 5.6 Repository Function Real-Branch TODOs (23 Methods)
- `src/server/repositories/bookings.ts`: `listBookings` (L12), `createBooking` (L24)
- `src/server/repositories/leads.ts`: `listLeads` (L42), `getLeadById` (L49), `createLead` (L108), `updateLeadStatus` (L119), `reassignLead` (L130)
- `src/server/repositories/models.ts`: `listModels` (L45), `getModelBySlug` (L62)
- `src/server/repositories/offers.ts`: `listOffers` (L12), `listBanners` (L43)
- `src/server/repositories/pricing.ts`: `getPriceRule` (L59), `listPriceRules` (L66)
- `src/server/repositories/saved.ts`: `listSavedVehicles` (L45), `removeSavedVehicle` (L62)
- `src/server/repositories/showrooms.ts`: `listShowrooms` (L12), `listWorkshops` (L22)
- `src/server/repositories/slots.ts`: `listSlots` (L36), `listDemoCars` (L46)
- `src/server/repositories/trade-in.ts`: `createTradeInRequest` (L16)
- `src/server/repositories/used-cars.ts`: `listUsedCars` (L68), `getUsedCarByStockId` (L82)
- `src/server/repositories/users.ts`: `listUsers` (L12), `getUserById` (L19), `updateUser` (L30)
- `src/server/repositories/variants.ts`: `listVariantsByModel` (L10), `getVariantById` (L18)
- *Replacement in Phases 3–5:* Implement real Supabase client queries for all 23 functions, mapping DB snake_case columns to domain camelCase interfaces.

---

## 6. Personal-Data Inventory (DPDP Act 2023 Compliance)

Under India's Digital Personal Data Protection Act 2023, Vrooma acts as a Data Fiduciary. Every piece of personal data collected is cataloged below with its statutory processing basis and lifecycle rules:

| Personal Data Item | Where Collected | Specific Purpose of Processing | Lawful Basis / Consent Notice | Authorized Visibility | Retention Schedule Proposal | Deletion / Erasure Behaviour |
|---|---|---|---|---|---|---|
| **Customer Full Name** | Enquiry form, test-drive booking, service booking, profile, sign-up | Lead identification, formal quotation generation, personalized greeting | Affirmative Consent (Section 6, DPDP 2023) | Assigned consultant, showroom manager, customer | Active lifecycle + 180 days after lead closure | Anonymized to `"Customer_Scrubbed"` on erasure request |
| **Mobile Phone Number** | All booking forms, trade-in, enquiry, sign-up | 5-minute sales SLA contact, appointment SMS, WhatsApp confirmation | Affirmative Consent (Mandatory for service delivery) | Assigned consultant, workshop supervisor, admin | 180 days post-transaction (or statutory tax audit duration) | Irreversibly scrubbed from leads & bookings tables |
| **Email Address** | Sign-up, enquiry form, profile, newsletter | Account identity, digital tax quotation dockets, newsletter broadcasts | Affirmative Consent (Explicit checkbox) | Dealership admin, customer | Active account duration; newsletter until un-subscribe | Purged from auth & profile tables |
| **Customer Home Address** | Profile settings, Home Test Drive request | Coordinating vehicle logistics for home test drive or car delivery | Specific consent at time of home drive request | Dispatch driver, assigned consultant | 30 days after test drive completion | Permanently deleted |
| **PIN Code** | Profile settings, sign-up | Validating regional showroom jurisdiction and service catchment | Consent | System logistics, sales consultant | Retained as aggregated non-PII postal district | Cleared from profile |
| **Full Vehicle Registration No. (Certified Used Cars)** | Used car yard intake (`used_cars.reg_no_private`) | RC verification, VAHAN history check, title transfer | Legitimate business purpose (Title clearance) | **Strictly internal:** Used-car manager & admin | Duration car is in inventory + 3 years post-sale (RTO audit) | Retained in audit archive; NEVER exposed to public web |
| **Customer Vehicle Reg No. (Workshop Service)** | Service booking form (`bookings.vehicle_info.reg_no`) | Identifying customer vehicle, workshop bay job card preparation | Contractual necessity for vehicle maintenance | Workshop service advisor, mechanic lead | 3 years (Service warranty & claims history) | Masked after 1 year to `UP32 ** **** 1234` |
| **Driver License Details** | Test drive booking wizard (Step 4) | Verifying legal authorization to drive demo car on public roads | Legal obligation under Motor Vehicles Act 1988 | Showroom manager, insurance auditor | Purged 48 hours after test drive conclusion | Hard delete from database storage |
| **Customer Enquiry Notes** | Web enquiry form, trade-in notes, WhatsApp chats | Capturing specific buyer preferences, trim queries, exchange needs | Consent | Assigned sales consultant, lead desk | 90 days after lead marked won/lost | Scrubbed on DPDP erasure |
| **Trade-In Vehicle Photos** | Trade-in valuation intake form | Inspecting vehicle exterior, paint condition, dent estimation | Consent | Used-car evaluation manager | 60 days post-quote | Deleted from Supabase Storage bucket |
| **IP Address & Consent Timestamp** | All form submissions (`consents` table) | Verifiable legal audit trail proving when and how consent was granted | Statutory compliance under DPDP Act 2023 | Data Protection Officer, legal auditor | 3 years (Statutory limitation period) | Retained as immutable proof of lawful processing |

---

## 7. Gaps, Security Holes & Architectural Decisions

### 7.1 Everything the Frontend Needs That Has No Table / Endpoint Yet
1. **Booking Rescheduling & Cancellation:**
   - Needs: Endpoint `/api/bookings/[id]/reschedule` and `/api/bookings/[id]/cancel`.
   - DB: Atomic transaction updating `bookings.status` and releasing `slots.booked_count`.
2. **Saved Vehicles Deletion:**
   - Needs: Endpoint `/api/me/saved` (`DELETE`).
   - DB: Mutation deleting from `saved_items`.
3. **Automated Slot Generation Engine:**
   - Needs: Cron / API endpoint `/api/slots/generate` capable of creating 30-day recurring showroom and workshop bay time slots based on facility capacities.
4. **Admin Facility Fleet & Variant CMS Endpoints:**
   - Needs: Full CRUD endpoints for models, variants, price rules, showrooms, demo cars, offers, and banners.
5. **Public Consultant Directory:**
   - Needs: Safe public query endpoint or view returning consultant name and facility without exposing private phone numbers or emails.
6. **Trade-In to Lead Conversion:**
   - Needs: Mutation creating both `trade_in_requests` and an associated `leads` row with SLA countdown timer.

### 7.2 Everything in the Database With No UI
1. **`used_car_sales_history` Table:** Seeded in migration `0003` to power AI valuation suggestions, but lacks any admin management UI or historical trend chart.
2. **`audit_log` Table:** Migration `0006` creates `audit_log`, but there is no viewer in `/admin` (only `/admin/ai-logs` exists for AI drafts).
3. **`lead_events` Table:** Migration `0005` creates `lead_events` for lifecycle tracking, but `LeadDetailPage` does not render an event history timeline.
4. **`variant_colors` CMS:** Variants can have color swatches, but there is no admin UI to upload or configure color hex codes and images.

### 7.3 Frontend Security Holes (Fix Before Launch)
1. **Public Leak of Full On-Road Price Rules (`GET /api/price`):**  
   The UI visually gates the detailed price breakup with `AuthGate`, but anyone can query `/api/price?variantId=...` anonymously to fetch the exact internal tax and margin calculation.  
   *Fix:* Restrict detailed breakdown response on `/api/price` to authenticated sessions or valid lead tokens.
2. **Public Leak of Dealership Leads (`GET /api/leads` and `/api/export/daily-csv`):**  
   Both endpoints currently have no auth checks and return customer names and mobile numbers.  
   *Fix:* Enforce server-side role check (`consultant`, `manager`, `admin`) via `supabase.auth.getClaims()`.
3. **Unauthenticated Lead Reassignment (`PATCH /api/leads/[id]`):**  
   Allows anyone knowing a UUID to reassign leads or mark them won/lost.  
   *Fix:* Restrict to authenticated staff with RLS.
4. **Client-Side Props Leakage in Gated Views:**  
   `ModelDetailView` and `VehicleConditionReport` receive the entire gated payload in SSR props and render it inside client-side `AuthGate`. The raw inspection checklist and calculation lines exist in the initial HTML and client React tree.  
   *Fix:* For unauthenticated requests, SSR should pass an abbreviated summary (e.g. score `138/140`), requiring a client fetch to unlock the full 140 checks once authenticated.
5. **Private Registration Numbers in Client Bundles:**  
   `AdminUsedCarDetailPage` passes `car.reg_no_private` to client inputs without verifying the active session role.  
   *Fix:* Server component must verify `manager` or `admin` claim before projecting `reg_no_private`.

### 7.4 Public Pages Calling `cookies()` (ISR Audit)
- **Search Result:** Zero public pages currently call `cookies()`.
- **Guarantee:** Public catalog pages (`/`, `/cars`, `/cars/[slug]`, `/used-cars`, `/used-cars/[id]`, `/offers`, `/showrooms`) remain compatible with Next.js ISR (Incremental Static Regeneration).
- **Architecture Mandate:** In Phase 3, public catalog queries must strictly use **Supabase Client (c) (Public Client with NO cookies)** to prevent accidental opt-out from Next.js static caching.

### 7.5 Next.js Version & Middleware Architecture
- **Next.js Version:** `15.1.7` (Next.js 15 App Router).
- **Request Interceptor File:** `src/middleware.ts` (Next.js 15 convention; `proxy.ts` is not applicable).
- **`next-intl` Version:** `3.26.3`.
- **Middleware Composition Challenge:**  
  Currently, `src/middleware.ts` directly exports `createMiddleware(routing)`. It does not perform Supabase auth token refreshing or route protection.  
  In Phase 1, `middleware.ts` must compose both engines in sequence:
  1. Initialize `next-intl` response to determine the locale.
  2. Execute Supabase `updateSession` on the request, passing through auth cookies to the response.
  3. Inspect `getClaims()` on protected route segments (`/dashboard/*`, `/staff/*`, `/admin/*`) and issue redirects (`/sign-in`) if unauthorized.

### 7.6 Open Questions for the Product Owner

| # | Question for Product Owner | Business Context | Recommended Default |
|---|---|---|---|
| **1** | **Should Address & PIN Code be removed from the sign-up form?** | DPDP data minimisation restricts asking for home addresses during basic exploration or online quotation. | **Yes.** Remove address and PIN from initial sign-up. Collect them only in `/profile` or Step 4 of a Home Test Drive booking. |
| **2** | **Should customer vehicle registration numbers be permanently stored after workshop service?** | Vehicle numbers can be linked to individuals via VAHAN registries. | **Mask after 90 days.** Store full registration for active job card processing; mask to `UP32 ** **** 1234` after 90 days in customer appointment history. |
| **3** | **How should anonymous test-drive bookings establish user accounts?** | Visitors booking a test drive do not have a password. | **Auto-create guest profile.** Auto-provision an anonymous Supabase user session associated with the verified phone number, setting a session cookie so the user immediately views their confirmed booking docket in `/dashboard`. |
| **4** | **Should the total on-road price estimate remain visible to anonymous visitors on car pages?** | `ModelDetailView` currently shows the total on-road price at the top while gating the breakdown table below. | **Keep total visible, gate line-item tax details.** Showing an estimated total maintains car shopper trust; gating the RTO/Insurance/TCS itemization provides strong lead capture incentive. |
| **5** | **Should trade-in requests automatically trigger a 5-minute sales SLA lead?** | Trade-in requests currently do not link to the lead desk or start an SLA timer. | **Yes.** Every trade-in submission should automatically create a lead with `source = 'trade_in'` assigned to the pre-owned manager. |

---

## 8. Implementation Sizing & Risk Assessment

| Phase | Description | Estimated Size | Primary Risk & Complexity Factors |
|---|---|:---:|---|
| **Phase 1** | Real Sign-In, Sign-Up, Onboarding, Sessions, Roles, Guards | **M** (Medium) | Composing Next.js 15 `next-intl` middleware with Supabase SSR cookie adapter; securing role claims without reading unverified `user_metadata`. |
| **Phase 2** | Production Schema, RLS Policies, Functions, Cron, Storage, Seed | **L** (Large) | Rewriting 9 migrations into a clean, unified schema; implementing GiST exclusion for price rules; atomic slot locking; strict RLS default-deny policies. |
| **Phase 3** | Data Layer Catalog: Mock Removal, Public ISR Client, Admin CRUD | **L** (Large) | Decoupling 36 files from `memoryStore`; implementing 23 Supabase repository methods; ensuring zero `cookies()` leaks in public ISR routes. |
| **Phase 4** | Booking Engine, Slots Concurrency, Leads SLA, CSV Import/Export | **L** (Large) | Concurrency race conditions on slot capacity; CSV bulk ingestion performance and deduplication; 5-minute SLA calculation across timezones. |
| **Phase 5** | Account Privacy: Profile, Saved, Enquiries, Trade-In, DPDP Rights | **M** (Medium) | DPDP Section 12 irreversible PII scrubbing workflow; cascading anonymization across bookings, leads, and outbox tables. |
| **Phase 6** | Hardening Release: Security Review, Pentest, Performance, Checklist | **M** (Medium) | End-to-end verification across 8 standard viewports (360×740 to 1920×1080), Hindi locale integrity, and zero secrets in git. |

---

## 9. Phase 0 Audit Sign-Off

The audit is complete. No source files were altered. All 41 routes, 17 API handlers, 27 forms/buttons, 9 database integrity risks, 36 mock store usages, and DPDP personal data workflows have been cataloged with exact file references.

The project is fully prepared to proceed to **Phase 1: Authentication, Onboarding & Route Protection** upon review of the report.

