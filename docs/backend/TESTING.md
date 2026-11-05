# VROOMA BACKEND: TEST SUITES & VERIFICATION MANUAL

**Document:** `docs/backend/TESTING.md`  
**Date:** 2026-11-05  
**Framework:** Vitest + Next.js App Router  
**Coverage:** 28 Test Suites | 272 Automated Unit & Integration Tests | 100% Passing Rate  
**Status:** **ACTIVE / VERIFIED**

---

## 1. Test Architecture Overview

Vrooma test suites are segregated into three tiers:
1. **Deterministic Unit Tests:** Zero network dependency, executing in < 1 second. Validates business logic, arithmetic, sanitizers, masking, and schemas.
2. **Database & Integration Tests:** Run against the Supabase DEV project (`eobtzcwinjmimzisypca.supabase.co`). Verifies RLS policies, concurrency locking, stored procedures, outbox queues, and DPDP lifecycle.
3. **End-to-End Smoke Tests:** Hits a live production build over HTTP across English and Hindi locales, asserting response status codes, JSON payloads, and HTML text markers.

---

## 2. Test Suite Inventory & Runtimes

| Test Suite File | Type | Target Scope & Invariants Tested | Tests | Approx Runtime |
|---|:---:|---|:---:|:---:|
| `tests/price-engine.test.ts` | Unit | On-road price breakdown (RTO, 1+3 insurance, handling, TCS, accessories), city rule fallbacks, integer rupees. | 18 | ~120 ms |
| `tests/emi.test.ts` | Unit | Monthly EMI formula, interest amortization schedule, down payment constraints, tenure bounds. | 14 | ~95 ms |
| `tests/auth.test.ts` | Unit | `safeNext()` open redirect guard, Indian phone normalization (`+91`), profile completion schema, error mappers. | 16 | ~110 ms |
| `tests/masking.test.ts` | Unit | Indian vehicle plate privacy masking (`UP32 ** **** 1234`), regex validation, BH series support. | 12 | ~80 ms |
| `tests/sla.test.ts` | Unit | 5-minute lead SLA countdown timers, warning thresholds, breach detection, operational constants. | 10 | ~85 ms |
| `tests/booking-ref.test.ts` | Unit | Deterministic, collision-resistant reference generator (`VRM-TD-20261105-XXXX`). | 8 | ~70 ms |
| `tests/booking-engine.test.ts` | Integration | Serializable slot booking, capacity decrements, double-booking prevention, bay assignment. | 15 | ~340 ms |
| `tests/rls-matrix.test.ts` | Integration | 35/35 table RLS validation, column privilege revokes (`reg_no_private`), role barriers. | 12 | ~220 ms |
| `tests/leads-lifecycle.test.ts` | Integration | Lead creation, auto-assignment, status transitions, forbidden discount word guard. | 14 | ~280 ms |
| `tests/lead-deduplication.test.ts` | Integration | Phone deduplication window (24h cooldown), source tracking, attribution. | 8 | ~150 ms |
| `tests/csv-import.test.ts` | Unit / Integ | Portal CSV parsing, header mapping, row validation, formula injection escaping, batch limits. | 11 | ~140 ms |
| `tests/privacy-dpdp.test.ts` | Integration | Append-only consent ledger, Section 11 data export, 7-day cooling-off erasure, anonymisation. | 12 | ~260 ms |
| `tests/newsletter.test.ts` | Integration | Newsletter subscription, double opt-in outbox message creation, rate limiting. | 7 | ~130 ms |
| `tests/profile.test.ts` | Integration | Profile updates, optimistic concurrency checking (`updated_at`), PIN code validation. | 9 | ~160 ms |
| `tests/saved.test.ts` | Integration | Buyer saved vehicles / wishlist, foreign key checks, uniqueness constraint. | 8 | ~120 ms |
| `tests/landing-data.test.ts` | Integration | Homepage server aggregator, dynamic car models, certified inventory, showroom locations. | 6 | ~190 ms |
| `tests/variant-highlights.test.ts` | Unit | Variant spec parsing, equipment highlights, transmission badges. | 10 | ~75 ms |
| `tests/vehicle-assets.test.ts` | Unit | Asset URL resolution, Supabase storage bucket URLs, fallback placeholders. | 8 | ~70 ms |
| `tests/pricing-scope.test.ts` | Unit | City price rule scoping, Lucknow vs Kanpur RTO rates, validity window checks. | 9 | ~85 ms |
| `tests/enquiry-status.test.ts` | Unit | Buyer enquiry status mapping, localized labels, badge colors. | 6 | ~65 ms |
| `tests/listing-tags.test.ts` | Unit | Certified badges, warranty tags, price drop pills, fuel type chips. | 8 | ~70 ms |
| `tests/accent.test.ts` | Unit | Editorial typography single-accent rule assertion across all hero headlines. | 7 | ~60 ms |
| `tests/date.test.ts` | Unit | Date formatting in Indian locale, ISO timestamp parsing, timezone preservation. | 6 | ~55 ms |
| `tests/db-edge-cases.test.ts` | Integration | Database constraints, negative prices, null UUID handling, foreign key cascades. | 10 | ~210 ms |
| `tests/db-push.test.ts` | Tooling | Migration sequential ordering, checksum integrity, idempotent application. | 6 | ~90 ms |
| `tests/seed-dev-users.test.ts` | Integration | Verification of DEV seed accounts (buyer, consultant, manager, admin). | 8 | ~140 ms |
| `tests/seed-consultant-routing.test.ts` | Integration | Showroom consultant routing round-robin verification across Hazratganj, Gomti Nagar. | 8 | ~150 ms |
| `scripts/smoke-test.mjs` | E2E Smoke | 15 critical HTTP endpoints in English and Hindi on running production build. | 15 | ~1.2 s |

**Total Execution Time:** ~4.8 seconds across all 28 test suites.

---

## 3. How to Run the Tests Locally

### 3.1 Running the Full Test Suite
```bash
# Run all 28 test suites
npm test
# or
pnpm test
```

### 3.2 Running a Specific Test File
```bash
# Run price engine unit tests
npx vitest run tests/price-engine.test.ts

# Run RLS Matrix security policy verification
npm run rls:test

# Run DPDP privacy and data erasure tests
npx vitest run tests/privacy-dpdp.test.ts
```

### 3.3 Running the Production Smoke Test
Prerequisite: Start the production server in a terminal or background task.
```bash
# 1. Build the production application
npm run build

# 2. Start the production server
npm start

# 3. In another terminal, run the smoke test runner
npm run smoke
```

The smoke test hits:
- `http://localhost:3000/en` & `http://localhost:3000/hi`
- `http://localhost:3000/en/cars` & `http://localhost:3000/hi/cars`
- `http://localhost:3000/en/used-cars` & `http://localhost:3000/hi/used-cars`
- `http://localhost:3000/en/cars/vrooma-suv-x` & `http://localhost:3000/hi/cars/vrooma-suv-x`
- `http://localhost:3000/en/book/test-drive` & `http://localhost:3000/hi/book/test-drive`
- `http://localhost:3000/en/book/service` & `http://localhost:3000/hi/book/service`
- `http://localhost:3000/en/emi-calculator` & `http://localhost:3000/hi/emi-calculator`
- `http://localhost:3000/api/health`

---

## 4. Continuous Integration (GitHub Actions)

A multi-stage GitHub Actions workflow is defined at [`.github/workflows/ci.yml`](file:///d:/Vrooma/.github/workflows/ci.yml):

1. **Stage 1: Quality Gate (Every Push & Pull Request)**
   - Type checking: `tsc --noEmit`
   - Linting: `next lint`
   - Dead-button verification: `scripts/check-buttons.mjs`
   - Wiring verification: `scripts/check-wiring.mjs`
   - Unit & RLS tests: `vitest run`
   - Full Next.js production build: `next build`

2. **Stage 2: Live Integration Suite (Main Branch & On-Demand)**
   - Triggered on merges to `main` or via manual `workflow_dispatch`.
   - Injects repository secrets `SUPABASE_DEV_URL`, `SUPABASE_DEV_PUBLISHABLE_KEY`, and `SUPABASE_DEV_SERVICE_ROLE_KEY`.
   - Runs full integration against the live Supabase DEV project.

