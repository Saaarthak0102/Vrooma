# VROOMA — DASHBOARD ARCHITECTURE & SPECIFICATION

## 1. Overview

The Vrooma buyer dashboard (`/dashboard`) redesign adopts a modern automotive bento grid layout engineered for desktop viewports ($\ge 1100\text{px}$ wide AND $\ge 620\text{px}$ tall) with zero page scrolling (`100svh`, `overflow: hidden`). In-place expansion via an animated Web Animations API stage replaces full-page navigation for the primary overview panels ("View all"), while deep links to `/dashboard/bookings`, `/dashboard/saved`, and `/dashboard/enquiries` remain active as accessible fallback routes.

---

## 2. Block Inventory & Data Sources

| Block | Data Source | File | Status |
|---|---|---|---|
| **4.1 Greeting** | `useAuth()` (`user.full_name`) + i18n (`messages/{locale}.json:dashboard.greeting`) | `src/components/dashboard/DashboardGreeting.tsx` | Implemented & Verified |
| **4.2 Count Strip** | `listBookings()` / `memoryStore.bookings`<br>`useSavedCars()` / `memoryStore.savedCarIds`<br>`listLeads()` / `memoryStore.leads`<br>`listShowrooms()` | `src/components/dashboard/DashboardCountStrip.tsx` | Implemented & Verified |
| **4.3 Next Appointment** | `listBookings()` / `memoryStore.bookings` (sorted ascending by `starts_at >= now`) | `src/components/dashboard/NextAppointmentCard.tsx` | Implemented & Verified |
| **4.4 Saved Vehicles** | `memoryStore.models`, `memoryStore.usedCars` via `savedCarIds` (latest 2) | `src/components/dashboard/SavedVehiclesCard.tsx` | Implemented & Verified |
| **4.5 Action Tiles** | Direct action triggers (Dark: Test Drive `/book/test-drive`; Light: Service `/book/service`) | `src/components/dashboard/DashboardActionTile.tsx` | Implemented & Verified |
| **4.6 Recent Enquiries** | `listLeads()` / `memoryStore.leads` (latest 2 inquiries) | `src/components/dashboard/RecentEnquiriesPanel.tsx` | Implemented & Verified |
| **5.0 In-Place "View All" Stage** | Aggregated data for Bookings (upcoming & past), Saved items (models & used), Enquiries (with status filters) | `src/components/dashboard/DashboardViewAllPanel.tsx` | Implemented & Verified |
| **Footnote** | Static DPDP & legal routes (`/legal/privacy`, `/legal/data-rights`, `/legal/terms`) | `src/components/dashboard/DashboardFootnote.tsx` | Implemented & Verified |

---

## 3. Desktop Bento Grid Geometry (12 columns × 4 rows)

Placement coordinates on desktop ($\ge 1100\text{px} \times \ge 620\text{px}$):

```
Grid: 12 cols × 4 rows | gap: 12px (14px when height >= 900px)
+------------------------------------+--------------------------+--------------------+
|                                    | Saved vehicles           | Tile: Test drive   |
|                                    | (Cols 6-9, Rows 1-2)     | (Cols 10-12, Row 1)|
| Next appointment                   +--------------------------+--------------------+
| (Cols 1-5, Rows 1-4)               |                          | Tile: Service      |
|                                    |                          | (Cols 10-12, Row 2)|
|                                    +--------------------------+--------------------+
|                                    | Recent enquiries                              |
|                                    | (Cols 6-12, Rows 3-4)                         |
+------------------------------------+-----------------------------------------------+
```

---

## 4. Density Modes & Viewport Constraints

- **Roomy (`min-height: 900px`):** Padding 24px, greeting title 44px, gap 14px.
- **Default:** Padding 20px, greeting title 40px, gap 12px.
- **Compact (`max-height: 760px`):** Padding 16px, greeting title 32px, subtitle visually hidden, numerals smaller (28px).
- **Ultra-compact (`max-height: 700px`):** Tile sub-lines hidden, saved thumbnails 52px, enquiry messages clamped to 2 lines.
- **Text floors:** Labels 12px, body 14px, never smaller.

---

## 5. FOLLOW-UP SPECIFICATION & CHANGE LOG

| File | Change | Why |
|---|---|---|
| `src/styles/dashboard.css` | 1. Change `.dashboard-desktop-shell` `padding-top` from `calc(var(--header-bottom) + 16px)` to `16px` (20px on `min-height: 900px`).<br>2. Set height to `calc(100svh - var(--header-bottom))` with `overflow: hidden; padding-bottom: 16px;`.<br>3. Remove `.site-footer` display:none override. | Eliminates ~96px excess gap under the sticky header so greeting sits at `var(--header-bottom) + 16px`. Allows desktop dashboard to fit exactly 1 viewport while page scrolls to reveal the standard `SiteFooter`. |
| `src/components/dashboard/DashboardClientShell.tsx` | 1. Change `<Container>` to default width without `max-w-[1440px]`.<br>2. Remove `DashboardFootnote` and render `SiteFooter` at the page root.<br>3. Pass 2 upcoming bookings to `NextAppointmentCard`. | Aligns dashboard horizontally with the exact container margins of inner pages (x 109–1791 at 1920px). Restores the full site footer with wordmark reveal across all breakpoints. |
| `src/components/layout/SiteHeader.tsx` & `src/styles/buttons.css` | 1. Change `hidden sm:block` and `hidden lg:block` to `hidden sm:flex items-center` and `hidden lg:flex items-center` in `SiteHeader`.<br>2. Enforce `display: inline-flex; align-items: center; vertical-align: middle; margin: 0; line-height: 1;` on `.btn`, `.btn__surface`, and `.btn__label`. | Fixes UserMenu trigger sitting 16px lower at rest than adjacent language toggle and CTA buttons, ensuring consistent vertical centering across rest and hover states. |
| `src/components/dashboard/NextAppointmentCard.tsx` | 1. Rename label to "Upcoming appointments" (`dashboard.upcomingAppointments`).<br>2. Structure grid as `auto 1fr 1fr auto` for header, two equal sub-cards, and "Add new booking" button.<br>3. Implement roomy, medium, and dense height tiers.<br>4. Embed Reschedule and Cancel buttons per sub-card.<br>5. Add bottom "Add new booking" button opening origin-aware dropdown (`side="top"`). | Satisfies N4 requirement to display up to two upcoming appointments with granular actions, empty states, and upward dropdown booking trigger. |
| `src/server/store.ts` | Add second upcoming demo service booking (`starts_at` on round slot grid) for `usr-buyer-1`. | Provides realistic data so both appointment sub-cards render in the overview. |
| `messages/en.json` & `messages/hi.json` | Add i18n keys for `upcomingAppointments`, `addNewBooking`, `noOtherUpcoming`, `noUpcomingBookings`, `noUpcomingHint`. | Full bilingual localization in authentic Hindi and English. |

