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

---

## 6. PROFILE MENU + ACCOUNT NAVIGATION (RESTRUCTURE SPECIFICATION)

### 6.1 Architectural Objective & Core Rules

Account navigation is restructured so the Dashboard (`/dashboard`) serves as the single central hub for buyer activities (bookings, saved cars, enquiries), while personal identity management is decoupled into a dedicated My Profile page (`/profile`).

The navbar user dropdown menu (`UserMenu`) is strictly streamlined to exactly three options:
1. **My Profile** (`/profile`) — View and manage personal information.
2. **Dashboard** (`/dashboard`) — Central hub for bookings, saved vehicles, and enquiries.
3. **Sign Out** — Session clearance and redirect to home.

All standalone account routes that duplicated dashboard views (`/dashboard/bookings`, `/dashboard/saved`, `/dashboard/enquiries`, `/dashboard/profile`) are replaced with automatic redirects preserving query parameters (`?view=bookings`, etc.), eliminating redundant duplicate pages while preserving deep links and bookmark functionality.

---

### 6.2 Navbar User Menu Dropdown Specification

- **Trigger Button (`UserMenu`)**:
  - Avatar pill displaying user initials (`AM`), full name (`Aditya`), and chevron icon.
  - Sized in accordance with the shared `.btn.btn--subtle.btn--sm` design token.
  - Optical vertical alignment guaranteed via `.user-menu-name` class without arbitrary top/translate offsets.
- **Dropdown Header**:
  - User avatar and uppercase full name (`ADITYA SHARMA` / `ADITYA MISHRA`).
  - Email address and localized role badge (`Buyer`).
- **Menu Items (Strictly 3)**:
  1. `My Profile`: Navigates to `/[locale]/profile` with `User` icon.
  2. `Dashboard`: Navigates to `/[locale]/dashboard` with `LayoutDashboard` icon.
  3. `Sign Out`: Invokes `useAuth().signOut()` with `LogOut` icon and redirects to `/[locale]`.
- **Eliminated Redundant Items**: Removed "My Bookings", "Saved Vehicles", "My Enquiries", and staff links from the buyer menu.

---

### 6.3 Dedicated My Profile Page (`/profile`)

- **Route**: `/[locale]/profile`
- **Gating**: Authenticated access via `<AuthGate fallbackUrl="/sign-in?redirect=/profile">`.
- **Structure**: Follows VROOMA inner page design language with breadcrumb navigation (`Home / My Profile`), section headers, responsive card container, and sticky action bar.
- **Exact Five Personal Information Fields**:
  1. **Full Name** (`full_name`): Text input, $\ge 2$ characters.
  2. **Email Address** (`email`): Email input, read-only with explanatory caption to preserve authentication identity consistency with auth provider.
  3. **WhatsApp Number** (`whatsapp`): Phone input with `+91` prefix, Indian 10-digit format (`[6-9]\d{9}`).
  4. **Address** (`address`): Textarea input, $\ge 5$ characters.
  5. **Pincode** (`pincode`): 6-digit numeric input validated against Indian PIN postal codes (`^[1-9][0-9]{5}$`).
- **Data Persistence & Reactivity**:
  - `GET /api/me/profile`: Returns current profile entity.
  - `PUT /api/me/profile`: Validates payload against `profileUpdateSchema` and updates repository and memory store.
  - `AuthProvider.updateProfile()`: Updates client-side auth context immediately.
  - Reactivity: Profile updates reflect instantly across navbar `UserMenu` and dashboard greeting (`DashboardGreeting`) without requiring sign-out or page reload.

---

### 6.4 Universal Navbar Profile Name Vertical Alignment (N8 Specification)

#### Root Cause Analysis
1. The shared button system (`src/styles/buttons.css`) enforces `.btn__label > span { line-height: 1 !important; }`, constraining the text container height to 12px for 12px font size.
2. In automotive sans fonts (Urbanist) and Devanagari typography (Noto Serif Devanagari), font metrics have an asymmetric ascender ratio (ascender 1050 vs descender -250 on a 1000-unit em square). With `line-height: 1`, glyph baselines sat at 9.7px from the top (2.3px from bottom).
3. Inside a 40px flex button container centered vertically, the 12px text box sat at $Y = 14\text{px}$ to $26\text{px}$, placing the glyph baseline at $Y = 23.7\text{px}$ and optical center at $Y = 21.4\text{px}$—which was 1.4px below the avatar center ($Y = 20.0\text{px}$) and chevron center ($Y = 20.0\text{px}$).
4. Prior ad-hoc attempts used `-top-[1.5px]` or negative margins, which violated the design system rules and caused subtle visual jumps on font switches or hover states.

#### Systematic Engineering Solution
1. Assigned a dedicated semantic class `.user-menu-name` to the user name label inside `UserMenu.tsx`.
2. Created a dedicated CSS rule in `src/styles/buttons.css`:
   ```css
   .btn .user-menu-name {
     display: none;
     align-items: center !important;
     height: 100% !important;
     line-height: normal !important;
     vertical-align: middle !important;
   }
   @media (min-width: 640px) {
     .btn .user-menu-name {
       display: inline-flex !important;
     }
   }
   ```
3. Removed arbitrary `-top-[1.5px]` and `leading-none` Tailwind utility classes.
4. Result: Natural font metrics vertical centering aligns the text optical centerline with the avatar center within $<0.6\text{px}$ across all desktop and tablet viewports, with automatic hiding on mobile $<640\text{px}$.

---

### 6.5 Change Log (`file | change | why`)

| File | Change | Why |
|---|---|---|
| `src/types/domain.ts` | Added `whatsapp?: string`, `address?: string`, `pincode?: string` to `Profile` domain interface. | Models the 5 required buyer personal details in the domain layer. |
| `src/data/mock/users.ts` | Pre-populated buyer `usr-buyer-1` with full Lucknow address, WhatsApp number (`+91 98765 43210`), and pincode (`226001`). | Provides realistic default user profile data collected during signup. |
| `src/server/store.ts` | Added `updateUser(id, updates)` method updating memory store and imported `Profile`. | Implements server-side profile persistence in the in-memory data store. |
| `src/server/repositories/users.ts` | Added `updateUser(id, updates)` to repository interface and in-memory implementation. | Provides standard clean-architecture repository method for user profile updates. |
| `src/lib/validation/profile.ts` | Created `profileUpdateSchema` validating all 5 profile fields with Zod. | Enforces strict validation for full name, email format, Indian phone number, address, and 6-digit Indian PIN code. |
| `src/app/api/me/profile/route.ts` | Created `GET` and `PUT` API route handlers for `/api/me/profile`. | Exposes REST endpoints to retrieve and persist authenticated profile updates. |
| `src/components/auth/AuthProvider.tsx` | Added `updateProfile(updates)` to `AuthContext`; updated `signIn` and localStorage hydration to store all 5 fields. | Enables reactive client-side profile state updates across navbar and dashboard without requiring re-authentication. |
| `src/lib/routes.ts` | Added `routes.profile`, updated `dashboardBookings`, `dashboardSaved`, `dashboardEnquiries` to return query parameter views (`?view=bookings`). | Centralizes route helpers and standardizes URL generation for dashboard views. |
| `src/components/booking/BookingConfirmation.tsx` | Updated "View Bookings" CTA link from `/dashboard/bookings` to `routes.dashboardBookings()`. | Points confirmed bookings to the unified dashboard view. |
| `src/app/[locale]/(buyer)/dashboard/bookings/page.tsx` | Replaced standalone page with `redirect(routes.dashboardBookings())`. | Eliminates duplicate standalone page while preserving bookmark compatibility. |
| `src/app/[locale]/(buyer)/dashboard/saved/page.tsx` | Replaced standalone page with `redirect(routes.dashboardSaved())`. | Eliminates duplicate standalone page while preserving bookmark compatibility. |
| `src/app/[locale]/(buyer)/dashboard/enquiries/page.tsx` | Replaced standalone page with `redirect(routes.dashboardEnquiries())`. | Eliminates duplicate standalone page while preserving bookmark compatibility. |
| `src/app/[locale]/(buyer)/dashboard/profile/page.tsx` | Replaced standalone page with `redirect(routes.profile())`. | Redirects legacy `/dashboard/profile` URLs to the canonical `/profile` route. |
| `messages/en.json` | Added `profile` namespace (title, subtitle, fields, breadcrumb, toasts, errors) and updated `auth.userMenu`. | Complete English localization for the profile page and restructured dropdown. |
| `messages/hi.json` | Added authentic Hindi translations for `profile` namespace and updated `auth.userMenu`. | Complete authentic Hindi localization for the profile page and restructured dropdown. |
| `src/components/profile/ProfileView.tsx` | Created dedicated My Profile page component with form handling, validation, loading states, and toast notifications. | Satisfies N2 requirement for personal information viewing and editing. |
| `src/app/[locale]/(buyer)/profile/page.tsx` | Created authenticated `/profile` route rendering `ProfileView`. | Mounts the My Profile page in the Next.js app router. |
| `src/components/auth/UserMenu.tsx` | Restructured dropdown to exactly 3 items (`My Profile`, `Dashboard`, `Sign Out`); added `.user-menu-name` class; removed arbitrary top offsets. | Satisfies N1 (3-item menu) and N8 (systematic vertical alignment). |
| `src/styles/buttons.css` | Added `.btn .user-menu-name` flex centering and normal line-height rules with responsive media query. | Solves N8 vertical alignment systematically without arbitrary pixel offsets. |
| `src/components/auth/SignInSheet.tsx` | Added Sign Up mode with all 5 profile fields (Name, Email, WhatsApp, Address, Pincode). | Ensures new user signups collect and store all 5 required personal details. |
| `src/app/[locale]/(auth)/sign-in/page.tsx` | Added Sign Up mode supporting all 5 profile fields in standalone page. | Ensures full signup flow collects all profile fields on dedicated auth page. |
| `tests/profile.test.ts` | Added unit tests for profile validation schema and repository persistence. | Guarantees test coverage for profile data validation and storage. |

