# PHASE 3: DATA LAYER, CATALOG, PRICING, ADMIN CRUD (mock removed)

Prerequisite: Phase 2 accepted (schema pushed to the DEV project, seed loaded, RLS matrix passing).

## 1. REPLACE THE MOCK LAYER
- Rewrite `src/server/repositories/*` to call Supabase using the generated `Database` types. Keep the public function names and return types so pages and components change as little as possible. Remove the mock branch, the in-memory store and `NEXT_PUBLIC_USE_MOCK` (also from env validation, README and docs). Keep `src/data/mock` only if the tests or the seed generator use it; mark it test-only.
- Client choice per call: PUBLIC client (no cookies) for catalog reads on ISR/static pages; server client (cookies) for anything user-specific; admin client only for the allow-listed functions.
- Every repository function: typed input, typed output (mapped to domain types, not raw rows), explicit column lists (no `select *`), bounded results, keyset pagination for lists (`/cars`, `/used-cars`, leads), a max page size, deterministic ordering with a tiebreaker (id), and error mapping to `AppError`. Never expose `reg_no_private`, internal notes or AI fields in public types (enforce with separate types).
- Search: `/cars` and `/used-cars` search use `pg_trgm` + `unaccent` (typo tolerant), debounced on the client, with the filter set already in the UI (body type, fuel, transmission, budget range, city; model, year, km, price, owners). Parameters validated by zod (reject absurd ranges, clamp page size). Create the needed indexes (trigram on names, btree on filter columns) and check the plans with `EXPLAIN` on the seed data.
- Caching: public catalog uses cached functions with tags (`models`, `model:<slug>`, `used`, `used:<stock>`, `offers`, `price`) and `revalidate` fallbacks; admin mutations call `revalidateTag` for the right tags (and `revalidatePath` for sitemap). The landing's `getLandingData` keeps working with the same shape; its next-slot chip and counts come from the DB. The landing page must stay static/ISR: no cookies() in anything it imports.

## 1b. THE BUILD MUST NOT BREAK (learned from the first local build)
- No module may throw when it is loaded (env validation, security guards). Check at server start in `instrumentation.ts`, or lazily; during `next build` (`NEXT_PHASE === 'phase-production-build'`) only warn. Use `APP_ENV` (development | production) for environment guards, never `NODE_ENV` (every `next build` is `production`, even locally).
- `generateStaticParams`: use the PUBLIC client, cap the list (for example the 50 newest), wrap in try/catch returning `[]` with a console warning, and set `dynamicParams = true` so other slugs render on first request and are cached (ISR). Never throw.
- `sitemap.ts`: `revalidate = 3600`; on failure fall back to the static routes only.
- ISR pages need the database reachable at build time. The public catalog is readable with the publishable key, so CI can build against the dev project. An empty table must produce an empty state, never a build failure.
- No `throw new Error("TODO` may remain in any repository; `pnpm check:wiring --strict` greps for `TODO(day-` and fails.
- Edge runtime only for routes that import nothing server-only (for example the OG image); everything else uses the Node runtime.
- Add `npm run build && npm start` and a smoke request to CI.

## 2. ON-ROAD PRICE (the hard part)
- The pure function `computeOnRoad` stays (tested) and is fed by the rules from `get_onroad_breakup` / `get_onroad_teaser`. Do not duplicate the maths in SQL; the SQL functions only select and authorise.
- Anonymous visitors get the TEASER (total, valid until, city) only; signed-in users get the full breakup. A direct call to the REST API must not leak more than the UI shows.
- Edge cases to test: no valid rule -> null -> "Contact showroom"; rule starts tomorrow; rule expired yesterday; two cities with different rules; variant-specific rule beats model rule; accessories toggle; TCS present/absent; rounding documented and tested on the three sample cars; fuel-specific rules; inactive variant/model; unknown city id -> 404 not 500.
- Every on-road number shown anywhere carries the validity date and "prices may change" (already a rule; verify against real data).

## 3. SEO FROM REAL DATA
`generateStaticParams` for models and used cars from the DB (public client); sitemap and robots from the DB (both locales); JSON-LD Vehicle/Offer with real prices (only where a valid price exists); unknown slug -> `notFound()`; sold used cars: keep the page with a "Sold" notice and `noindex`, remove from listings and sitemap. Booked cars stay listed but not bookable.

## 4. ADMIN CRUD FOR CARS AND PRICES (server actions, role-guarded, audit-logged)
Screens exist; make them real: models, variants, colours, images (upload to `car-media` through validated signed uploads), price rules (create/edit/close a rule; overlap errors from the exclusion constraint are shown as a clear message naming the conflicting rule and range; a "preview on-road price" panel uses the real engine), used cars (stock CRUD, inspection JSON editor with schema validation, final price field manager/admin only, status transitions), offers and banners (with `_hi` fields and validity), showrooms/workshops/bays/demo cars/closures, users and roles (invite staff; role changes via `admin_set_role`; cannot demote self or the last admin), assignment rules (join table UI).
Rules for all admin mutations: `requireRole` first; zod validation; optimistic concurrency (send `updated_at`; reject with a "someone else changed this" message if it differs); soft-delete or deactivate instead of hard delete where business rows reference the record (blocked with a clear message if still referenced); every successful mutation writes the audit log (actor, entity, diff); revalidate tags; return structured field errors that the existing forms display. Uploads: max 5 MB, jpeg/png/webp, validated server-side by content, generated file names, old file cleanup on replace.

## 5. EDGE CASES
Admin edits a price while a user is viewing the page (stale page shows old price until revalidation: acceptable, but the booking/lead step re-reads server-side); deactivating a model that has used-car or lead references; deleting a showroom with future slots (blocked); two admins editing the same record; very long names, emoji, RTL/Devanagari text; empty catalog (empty states); a model with no variants (hidden from listings, admin sees a warning); image missing (placeholder).

## 6. TESTS AND CHECKS
Repository integration tests (dev project): each public query returns only safe columns; pagination stability; search typo cases; price rule scenarios in section 2; admin guard tests per role; RLS spot checks through the real clients. `pnpm build` must statically generate the landing and catalog pages with real data. Report first-load JS and ISR behaviour for `/`, `/cars`, `/used-cars`.

## 7. Report
Mock removal checklist (grep results), list of repository functions and their clients, caching tags table, price-engine test results, admin actions covered per role, anything still on mock and why.