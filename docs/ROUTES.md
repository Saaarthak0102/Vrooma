# VROOMA — APPLICATION ROUTE TABLE

The app is English only. Old `/en/...` and `/hi/...` URLs permanently redirect to the unprefixed page.

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
| `/sign-in` | `(auth)` | Anonymous / Public | Email-code sign-in with a dev-only persona switcher (a real sign-in through `/api/auth/dev-login`). Staff always land in their console afterwards. |
| `/dashboard` | `(buyer)` | Buyer (Role) | Customer overview with active test drives, service bookings, and saved cars. |
| `/dashboard/bookings` | `(buyer)` | Buyer (Role) | Historical and upcoming test drive and workshop appointments. |
| `/dashboard/saved` | `(buyer)` | Buyer (Role) | Saved models and shortlisted certified used cars. |
| `/dashboard/enquiries` | `(buyer)` | Buyer (Role) | Open price quotation requests and assigned consultant contacts. |
| `/dashboard/profile` | `(buyer)` | Buyer (Role) | Personal profile, driver license storage, and DPDP consent management. |
| `/staff` | `(staff)` | Consultant / Manager / Admin | **Lead Desk.** KPI strip, spreadsheet of leads with live SLA timers and inline stage, side panel (AI summary, discount-guarded reply, reassign, activity). CSV import dialog. Consultants see only their own leads. Deep links: `?lead=<id>`, `?import=1`. |
| `/staff/bookings` | `(staff)` | Consultant / Manager / Admin | Test drives and service in one grid, attended / no-show, workshop bay load for the next 7 days. |
| `/staff/stock` | `(staff)` | **Manager / Admin only** | **Used Stock.** Stock grid, final price, manager-only price band from past sales, inspection scorecard, audited registration reveal, vehicle intake. Trade-ins tab with signed-URL photos. |
| `/admin` | `(admin)` | Admin only | **Overview.** Live success metrics and the ₹2.11 cr leakage monitor. Tabs: AI reply log, System health. |
| `/admin/catalog` | `(admin)` | Admin only | Tabs `?tab=models` (with `&model=<id>` detail), `prices`, `offers`, `banners`. |
| `/admin/team` | `(admin)` | Admin only | Tabs `?tab=users`, `network` (showrooms, workshops, bays, demo cars), `routing`, `slots`. |

## Redirects from the old console URLs

| Old | New |
|---|---|
| `/staff/leads`, `/staff/leads/[id]`, `/staff/leads/import` | `/staff`, `/staff?lead=<id>`, `/staff?import=1` |
| `/admin/models`, `/admin/models/[id]`, `/admin/prices`, `/admin/offers`, `/admin/banners` | `/admin/catalog?tab=…` |
| `/admin/users`, `/admin/showrooms`, `/admin/assignment`, `/admin/slots` | `/admin/team?tab=…` |
| `/admin/ai-logs`, `/admin/system` | `/admin?tab=ai`, `/admin?tab=system` |
| `/admin/used-cars`, `/admin/used-cars/[id]` | `/staff/stock` |

Each console screen starts with an interactive Overview (charts that filter the table below; see `docs/WIRING.md`).

Console routes render no public header, footer, chat widget or smooth-scroll; the console bar (`ConsoleShell`) is the only navigation.
