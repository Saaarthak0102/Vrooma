# VROOMA BACKEND: ROLE-BASED ACCESS CONTROL (RBAC) MATRIX

**Document:** `docs/backend/ROLE_MATRIX.md`  
**Date:** 2026-11-05  
**Version:** 2026.1  
**Auditor:** Backend Architecture & Security Review  
**Status:** **ACTIVE / VERIFIED**

---

## 1. Persona Definitions

| Persona | Definition & Token Context | Principal Identifier |
|---|---|---|
| **Anon** | Unauthenticated public visitor browsing from internet. | No Supabase session token (`auth.uid() IS NULL`). |
| **Buyer** | Verified retail car buyer / owner. Complete or partial profile. | JWT with `role = 'buyer'` in `public.profiles`. |
| **Consultant** | Sales specialist or lead desk consultant handling enquiries. | JWT with `role = 'consultant'` in `public.profiles`. |
| **Manager** | Showroom floor manager or Used-Car Valuation Manager. | JWT with `role = 'manager'` in `public.profiles`. |
| **Admin** | Dealer Principal, IT administrator, or general manager. | JWT with `role = 'admin'` in `public.profiles`. |
| **System / Cron** | Automated background jobs, scheduled tasks, and webhooks. | Header `Authorization: Bearer <CRON_SECRET>`. |

---

## 2. Server Actions Authorisation Matrix

| Action Name | Source File | Anon | Buyer | Consultant | Manager | Admin | Enforcement Mechanism | Failure Response | Test Coverage |
|---|---|:---:|:---:|:---:|:---:|:---:|---|:---:|---|
| `saveModelAction` | `admin-catalog.ts` | ❌ | ❌ | ❌ | ❌ | ✅ | `requireRole("admin")` | 403 Forbidden | `tests/rls-matrix.test.ts` |
| `saveVariantAction` | `admin-catalog.ts` | ❌ | ❌ | ❌ | ❌ | ✅ | `requireRole("admin")` | 403 Forbidden | `tests/rls-matrix.test.ts` |
| `savePriceRuleAction` | `admin-catalog.ts` | ❌ | ❌ | ❌ | ❌ | ✅ | `requireRole("admin")` | 403 Forbidden | `tests/rls-matrix.test.ts` |
| `saveUsedCarAction` (patch semantics on update) | `admin-catalog.ts` | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole("manager", "admin")` | 403 Forbidden | `tests/rls-matrix.test.ts` |
| `saveShowroomAction` | `admin-catalog.ts` | ❌ | ❌ | ❌ | ❌ | ✅ | `requireRole("admin")` | 403 Forbidden | `tests/rls-matrix.test.ts` |
| `saveWorkshopAction` | `admin-catalog.ts` | ❌ | ❌ | ❌ | ❌ | ✅ | `requireRole("admin")` | 403 Forbidden | `tests/rls-matrix.test.ts` |
| `getLeakMetricsAction` | `admin-leak.ts` | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole("admin", "manager")` | 403 Forbidden | `tests/auth.test.ts` |
| `getTestDriveBookingDataAction` | `booking.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | Public Catalog Helper | 200 OK | `tests/booking-engine.test.ts` |
| `getServiceBookingDataAction` | `booking.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | Public Catalog Helper | 200 OK | `tests/booking-engine.test.ts` |
| `bookSlotAction` | `booking.ts` | ❌ | ✅ | ✅ | ✅ | ✅ | `requireCompleteProfile()` | 401 Redirect | `tests/booking-engine.test.ts` |
| `listUpcomingBookingsAction` | `booking.ts` | ❌ | ✅ | ✅ | ✅ | ✅ | `requireUser()` + RLS filter | 401 Unauthorized | `tests/booking-engine.test.ts` |
| `cancelBookingAction` | `booking.ts` | ❌ | ✅ (own) | ✅ (staff) | ✅ | ✅ | `requireUser()` + ownership check | 403 Forbidden | `tests/booking-engine.test.ts` |
| `rescheduleBookingAction` | `booking.ts` | ❌ | ✅ (own) | ✅ (staff) | ✅ | ✅ | `requireUser()` + ownership check | 403 Forbidden | `tests/booking-engine.test.ts` |
| `getBuyerDashboardDataAction` | `buyer-dashboard.ts` | ❌ | ✅ | ✅ | ✅ | ✅ | `requireUser()` + user isolation | 401 Unauthorized | `tests/auth.test.ts` |
| `generateUserDataExportAction` | `data-rights.ts` | ❌ | ✅ | ✅ | ✅ | ✅ | `requireUser()` (Section 11 DPDP) | 401 Unauthorized | `tests/privacy-dpdp.test.ts` |
| `updateLeadStatusAction` | `leads.ts` | ❌ | ❌ | ✅ | ✅ | ✅ | `requireRole("consultant", "manager", "admin")` | 403 Forbidden | `tests/leads-lifecycle.test.ts` |
| `reassignLeadAction` | `leads.ts` | ❌ | ❌ | ✅ (own leads) | ✅ | ✅ | `requireRole("consultant", "manager", "admin")` + `reassign_lead` RPC ownership check; a reason is required (the brief: consultants can re-assign leads) | 403 Forbidden | `tests/leads-lifecycle.test.ts` |
| `recordLeadReplyAction` | `leads.ts` | ❌ | ❌ | ✅ | ✅ | ✅ | `requireRole` + discount guard | 403 / 422 | `tests/leads-lifecycle.test.ts` |
| `updateBuyerProfileAction` | `profile.ts` | ❌ | ✅ | ✅ | ✅ | ✅ | `requireCompleteProfile()` | 401 Unauthorized | `tests/profile.test.ts` |
| `requestAccountDeletionAction` | `profile.ts` | ❌ | ✅ | ❌ | ❌ | ❌ | `requireUser()` (staff blocked) | 400 Bad Request | `tests/privacy-dpdp.test.ts` |
| `cancelAccountDeletionAction` | `profile.ts` | ❌ | ✅ | ❌ | ❌ | ❌ | `requireUser()` | 401 Unauthorized | `tests/privacy-dpdp.test.ts` |
| `getTradeInUploadUrlsAction` | `trade-in.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | Signed storage upload helper | 200 OK | `tests/rls-matrix.test.ts` |
| `submitTradeInAction` | `trade-in.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | Public lead generator + DPDP consent | 200 OK | `tests/leads-lifecycle.test.ts` |
| `saveOfferAction`, `deleteOfferAction`, `saveBannerAction`, `deleteBannerAction` | `admin-catalog.ts` | ❌ | ❌ | ❌ | ❌ | ✅ | `requireRole("admin")` | 403 Forbidden | `scripts/console-e2e.mjs` |
| `setUsedCarFinalPriceAction`, `updateUsedCarStatusAction` | `admin-catalog.ts` | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole("admin", "manager")` | 403 Forbidden | `scripts/console-e2e.mjs` |
| `getPriceBandAction` (price band from past sales) | `stock.ts` | ❌ | ❌ | ❌ | ✅ | ✅ | `requireRole("manager", "admin")`, computed server-side only | 403 Forbidden | `tests/console-structure.test.ts`, `tests/price-band.test.ts` |
| `getTradeInPhotosAction` | `stock.ts` | ❌ | ❌ | ✅ | ✅ | ✅ | `requireRole` + short-lived signed URLs on a private bucket | 403 Forbidden | `scripts/console-e2e.mjs` |
| `getLeadDrawerAction` | `lead-drawer.ts` | ❌ | ❌ | ✅ (own leads) | ✅ | ✅ | `requireRole`; a consultant opening another's lead gets "not found" | 404 Not found | `scripts/console-e2e.mjs` |
| `saveRoutingRuleAction`, `deleteRoutingRuleAction`, `updateWorkshopBaysAction`, `setUserActiveAction` | `admin-network.ts` | ❌ | ❌ | ❌ | ❌ | ✅ | `requireRole("admin")` | 403 Forbidden | `tests/console-structure.test.ts`, `scripts/console-e2e.mjs` |

### 2.1 Console screens by role

| Screen | Consultant | Manager | Admin | Enforced by |
|---|:---:|:---:|:---:|---|
| `/staff` Lead Desk, `/staff/bookings` | ✅ (own leads) | ✅ | ✅ | middleware + layout + RLS |
| `/staff/stock` Used Stock | ❌ 403 | ✅ | ✅ | middleware + page `requireRole` |
| `/admin`, `/admin/catalog`, `/admin/team` | ❌ 403 | ❌ 403 | ✅ | middleware + layout |

Managers no longer open `/admin/*`; used stock moved to `/staff/stock`.

---

## 3. Route Handlers Authorisation Matrix

| Route Handler | Method | Anon | Buyer | Consultant | Manager | Admin | System / Cron | Enforcement Mechanism |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| `/api/health` | `GET` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Public endpoint (no auth required) |
| `/api/chat` | `POST` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Public lead chat assistant |
| `/api/consent` | `POST` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Immutable DPDP ledger append |
| `/api/price` | `GET` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Public on-road engine (RLS shielded) |
| `/api/slots` | `GET` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Public slot availability query |
| `/api/cars/search` | `GET` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Public catalog full-text search |
| `/api/trade-in` | `POST` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Public trade-in appraisal intake |
| `/api/trade-in/upload-urls` | `POST` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Rate-limited signed URL factory |
| `/api/newsletter` | `POST` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Public double opt-in + honeypot |
| `/api/bookings` | `GET` | ❌ | ✅ (own) | ✅ (all) | ✅ (all) | ✅ (all) | ❌ | `requireUser()` + RLS policy |
| `/api/bookings` | `POST` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Public lead-gen or verified booking |
| `/api/leads` | `POST` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Web lead creation & auto-routing |
| `/api/leads` | `GET` | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | `requireRole("consultant", "manager", "admin")` |
| `/api/leads/[id]` | `GET` | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | `requireRole` + assigned filter |
| `/api/leads/[id]` | `PATCH` | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | `requireRole` + concurrency tag |
| `/api/leads/import` | `POST` | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | `requireRole("consultant", "manager", "admin")` |
| `/api/ai/lead-copilot` | `POST` | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | `requireRole("consultant", "manager", "admin")` |
| `/api/me/profile` | `GET` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | `requireUser()` (own profile only) |
| `/api/me/profile` | `PUT` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | `requireUser()` (own profile only) |
| `/api/me/delete` | `POST` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | `requireUser()` (staff cannot delete) |
| `/api/me/delete` | `DELETE` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | `requireUser()` (cancel cooling-off) |
| `/api/export/daily-csv` | `GET` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | `CRON_SECRET` or `requireRole("manager", "admin")` |
| `/api/cron/outbox` | `GET`/`POST` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `Authorization: Bearer <CRON_SECRET>` |
| `/api/cron/sla` | `GET`/`POST` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `Authorization: Bearer <CRON_SECRET>` |
| `/api/cron/data-retention` | `GET`/`POST` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `Authorization: Bearer <CRON_SECRET>` |
| `/api/cron/finalize-deletions` | `GET`/`POST` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `Authorization: Bearer <CRON_SECRET>` |
| `/api/outbox/send` | `POST` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `CRON_SECRET` or `requireRole("admin")` |
| `/api/auth/dev-login` | `POST` | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ | Development only (`APP_ENV !== 'production'`) |

---

## 4. Row Level Security (RLS) Database Guardrails

Every database operation executed with a user JWT runs through Postgres RLS policies:

1. **`price_rules` Table:**
   - `SELECT` strictly revoked from `anon` and `buyer`. Only accessible to `authenticated` staff with `role IN ('consultant', 'manager', 'admin')`.
   - Buyer on-road price estimates are computed via the SECURITY DEFINER RPC `calculate_on_road_price()` without exposing base margin rules.
2. **`used_cars.reg_no_private` Column:**
   - Column-level privilege restriction: `REVOKE SELECT (reg_no_private) ON public.used_cars FROM anon, authenticated`.
   - `reg_no_masked` is public (`UP32 ** **** 1234`).
   - Unmasked registration number is only retrievable via `public.get_used_car_reg(car_id)` which logs an entry in `audit_log` with the staff actor ID.
3. **`used_car_sales_history` & `used_car_price_suggestions`:**
   - Sales history and AI pricing bands are restricted strictly to `manager` and `admin`. Sales consultants querying this table receive 0 rows.
4. **`leads` & `bookings` Isolation:**
   - Buyers can only read and write rows where `user_id = auth.uid()`.
   - Consultants can read leads belonging to their assigned showroom or directly assigned to their `consultant_id`.
   - Managers and Admins can view all dealership leads.
5. **Operational Tables (`messages_outbox`, `rate_limits`, `idempotency_keys`):**
   - Zero client policies exist. Only the Service Role (`adminClient`) and background cron jobs have read/write access.

---

## 5. Automated Test Proof

The authorisation boundaries are verified in CI/CD through dedicated test suites:
- **`tests/rls-matrix.test.ts`**: Verifies 35/35 tables have RLS enabled, revokes on sensitive columns, and role-based policies.
- **`tests/auth.test.ts`**: Verifies role guard functions, `requireRole()`, `requireUser()`, redirect protection (`safeNext`), and phone normalization.
- **`tests/leads-lifecycle.test.ts`**: Verifies lead status mutations, forbidden discount word blocking, and manager reassignment barriers.
- **`tests/privacy-dpdp.test.ts`**: Verifies consent immutability, data export assembly, and 7-day cooling-off erasure states.

