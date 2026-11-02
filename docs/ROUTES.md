# VROOMA — APPLICATION ROUTE TABLE

All routes support locale prefixing (`/en` or `/hi`). Default locale is `/en` (locale prefix `as-needed`).

| Route Path | Group | Gating / Role | Page Description & Key Features |
|---|---|---|---|
| `/` | `(public)` | Anonymous / Public | Dealership homepage with hero, car strips, trust pillars, and leakage counter. |
| `/cars` | `(public)` | Anonymous / Public | New car model catalog with live multi-facet filtering (body, price, fuel, transmission). |
| `/cars/[modelSlug]` | `(public)` | Anonymous (Gated Breakup) | Model deep dive: 360 photo gallery, variant selector, specs table, on-road price modal. |
| `/used-cars` | `(public)` | Anonymous (Masked Reg) | Certified pre-owned inventory with inspection badges, km/year/price filters. |
| `/used-cars/[stockId]` | `(public)` | Anonymous (Gated Report) | Dossier for used vehicle with photo slider, masked plate, 140-pt digital report gate, EMI widget. |
| `/book/test-drive` | `(buyer)` | Anonymous / Auto-guest | 5-step test drive booking stepper (Showroom → Demo Car → Date/Bay Slot → License & DPDP → Docket). |
| `/book/service` | `(buyer)` | Anonymous / Auto-guest | 4-step workshop service booking stepper with workshop bay capacity checks. |
| `/emi-calculator` | `(public)` | Anonymous / Public | Loan calculation engine with real-time sliders and amortisation breakdown. |
| `/trade-in` | `(public)` | Anonymous / Public | Instant used-car trade-in intake form with AI price estimation band. |
| `/offers` | `(public)` | Anonymous / Public | Active dealer promotions, festive benefits, and corporate discounts. |
| `/showrooms` | `(public)` | Anonymous / Public | Showrooms, workshops, and pre-owned yard directory with maps and click-to-call. |
| `/about` | `(public)` | Anonymous / Public | Dealership history, 340-member team profile, and Brand X partnership credentials. |
| `/contact` | `(public)` | Anonymous / Public | Customer care, enquiry forms, and showroom emergency service hotlines. |
| `/legal/privacy` | `(public)` | Anonymous / Public | DPDP Act 2023 compliant privacy disclosure and cookie declaration. |
| `/legal/terms` | `(public)` | Anonymous / Public | Terms and conditions of test drives, vehicle booking tokens, and quotation validity. |
| `/legal/data-rights` | `(public)` | Anonymous / Public | Data rights declaration with self-service personal data export and erasure request. |
| `/sign-in` | `(auth)` | Anonymous / Public | Authentication portal with dev 1-click role switcher (Buyer, Staff, Manager, Admin). |
| `/dashboard` | `(buyer)` | Buyer (Role) | Customer overview with active test drives, service bookings, and saved cars. |
| `/dashboard/bookings` | `(buyer)` | Buyer (Role) | Historical and upcoming test drive and workshop appointments. |
| `/dashboard/saved` | `(buyer)` | Buyer (Role) | Saved models and shortlisted certified used cars. |
| `/dashboard/enquiries` | `(buyer)` | Buyer (Role) | Open price quotation requests and assigned consultant contacts. |
| `/dashboard/profile` | `(buyer)` | Buyer (Role) | Personal profile, driver license storage, and DPDP consent management. |
| `/staff` | `(staff)` | Sales Staff / Manager | Sales console dashboard with SLA performance overview. |
| `/staff/leads` | `(staff)` | Sales Staff / Manager | Lead desk with color-coded 5-minute SLA countdown clocks and filter by showroom. |
| `/staff/leads/[id]` | `(staff)` | Sales Staff / Manager | Lead dossier with AI buyer briefing card, discount-blocked reply draft editor, reassign dialog. |
| `/staff/leads/import` | `(staff)` | Sales Staff / Manager | CSV bulk lead importer with column mapping, deduplication, and showroom assignment. |
| `/staff/bookings` | `(staff)` | Sales Staff / Manager | Calendar view of all booked showroom demo cars and workshop bays. |
| `/admin` | `(admin)` | Dealer Principal / Admin | Executive ₹2.11 cr leakage audit, live conversion gauges, and dealership health. |
| `/admin/models` | `(admin)` | Dealer Principal / Admin | Vehicle catalog CMS: add/edit models, variants, specifications, and photo URLs. |
| `/admin/models/[id]` | `(admin)` | Dealer Principal / Admin | Detail editor for specific vehicle model specifications and variants. |
| `/admin/prices` | `(admin)` | Dealer Principal / Admin | City RTO, insurance rules, handling fee, and accessories matrix editor with live simulator. |
| `/admin/used-cars` | `(admin)` | Used-Car Manager / Admin | Used car stock inventory manager with inspection report editor and AI price recommendation. |
| `/admin/used-cars/[id]` | `(admin)` | Used-Car Manager / Admin | Stock detail editor with full 140-point checklist toggle and pricing override. |
| `/admin/showrooms` | `(admin)` | Dealer Principal / Admin | Facility manager for showrooms, workshops, bay capacities, and demo car fleet. |
| `/admin/slots` | `(admin)` | Dealer Principal / Admin | Slot capacity manager: blackout dates, hourly limits, and emergency holds. |
| `/admin/offers` | `(admin)` | Dealer Principal / Admin | Promotional banner and offer card manager with validity periods. |
| `/admin/banners` | `(admin)` | Dealer Principal / Admin | Homepage and catalog announcement banner configuration. |
| `/admin/assignment` | `(admin)` | Dealer Principal / Admin | Lead routing rules: round-robin, showroom auto-assignment, model affinity. |
| `/admin/users` | `(admin)` | Dealer Principal / Admin | Staff permissions, role assignment (Buyer, Staff, Manager, Admin), and showroom linkage. |
| `/admin/ai-logs` | `(admin)` | Dealer Principal / Admin | Compliance audit table logging AI draft generation, consultant modifications, and sent messages. |

