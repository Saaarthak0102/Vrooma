# PHASE 2: DATABASE (schema, constraints, RLS, functions, cron, storage, seed)

Prerequisite: Phase 1 accepted. Read docs/backend/AUDIT.md section 2.4 (schema diff) and the existing migrations.

## 0. HUMAN STEPS (stop and wait)
"Part B: Database setup" of the setup guide: Supabase CLI installed, project linked, extensions allowed, password stored. The agent must not run `db push` against any project until the user confirms the project ref is the DEV project.

## 1. APPROACH
- Rewrite the unapplied migrations `0001`-`0008` into clean, ordered files (the first push has not happened). Suggested split: `0001_extensions_schemas_enums`, `0002_identity_profiles_consents`, `0003_geo_catalog`, `0004_pricing`, `0005_used_cars`, `0006_slots_bookings`, `0007_leads_assignment`, `0008_messaging_audit_ops`, `0009_privacy_requests`, `0010_rls_policies`, `0011_functions_rpc`, `0012_cron_jobs`, `0013_storage`. Each migration is idempotent where possible and wrapped in a transaction.
- Extensions into the `extensions` schema: `pgcrypto`, `pg_trgm`, `btree_gist`, `citext`, `unaccent`, `pg_cron`, `pg_net`.
- Schemas: `public` (exposed tables, views and RPCs) and `private` (helper functions; not exposed). Grant `usage` on `private` to `anon, authenticated`; revoke execute on private functions from public and grant only what policies need.
- Every table: uuid PK (`gen_random_uuid()`), `created_at`, `updated_at` (trigger `private.touch_updated_at`), FK indexes (Postgres does not create them), sensible `ON DELETE` (never cascade into business records), CHECK constraints for every domain rule.

## 2. TABLE DECISIONS (apply on top of the existing design in docs/DATA_MODEL.md)
**Identity**
- `profiles(id uuid PK references auth.users on delete cascade, email citext, full_name, phone text CHECK (phone ~ '^\+91[6-9][0-9]{9}$'), phone_verified_at, city_id, preferred_showroom_id, locale ('en'|'hi'), role (enum default 'buyer'), is_active bool default true, onboarding_completed_at, deleted_at, anonymised_at, + the extra fields approved in the audit)`.
- `staff_showrooms(profile_id, showroom_id, PK both)`: consultant/manager membership.
- Trigger `handle_new_user` (SECURITY DEFINER, `set search_path=''`): inserts the minimal profile, never trusts metadata for role, `ON CONFLICT DO NOTHING`.
- Column privileges: `revoke update on profiles from authenticated; grant update (full_name, phone, city_id, preferred_showroom_id, locale) on profiles to authenticated;` plus an RLS policy `id = (select auth.uid())`. Role and is_active change only through `admin_set_role()` / `admin_set_active()` (admin only; cannot demote the last active admin; cannot change own role; audit-logged).
- A public view `consultant_public(id, display_name)` for buyer-facing "Assigned: name" (no phone, no email).

**Consents (append-only):** `consents(id, user_id nullable, subject_email citext nullable, subject_phone nullable, purpose enum('terms_privacy','service_contact','marketing','newsletter','lead_contact'), granted bool, policy_version text, text_hash text, source enum, created_at)`. No update/delete for anyone; withdrawal = a new row with granted=false. A view `current_consents` gives the latest row per (subject, purpose). Function `complete_profile(...)` writes profile + consents + sets `onboarding_completed_at` atomically.

**Catalog:** `cities, showrooms (hours jsonb validated by a CHECK function, lat/lng), workshops (bays int > 0, hours), showroom_closures(showroom_or_workshop, date, reason)`, `models (slug unique, name, body_type enum, tagline + tagline_hi, is_featured, is_active, hero_image, gallery jsonb)`, `variants (fuel enum, transmission enum, ex_showroom int > 0, specs jsonb, is_active)`, `variant_colors`. Admin-written display text that buyers see (offers, banners, taglines) has nullable `_hi` columns with fallback to English.

**Pricing:** `price_rules` as designed plus: a generated `scope_key` (variant id, else model id + fuel) and `EXCLUDE USING gist (city_id WITH =, scope_key WITH =, daterange(valid_from, valid_until, '[]') WITH &&)` so two rules can never overlap; CHECKs: pct between 0 and 100, amounts >= 0, `valid_until >= valid_from`. Resolution precedence (function `resolve_price_rule`): variant-specific > model+fuel > model; none valid on the date -> NULL (UI shows "Contact showroom"). The on-road gating is enforced HERE: anon may call `get_onroad_teaser(variant_id, city_id)` (returns only the total and valid-until) and only authenticated users may call `get_onroad_breakup(...)` (full lines). `price_rules` itself is NOT readable by anon. Staff read; admin writes.

**Used cars:** `used_cars (stock_id unique, model_id, variant_name, fuel, year check, km >= 0, owners >= 1, price int > 0, status enum, reg_no_private text, reg_no_masked text GENERATED ALWAYS AS (...) STORED, showroom_id, certified, inspection jsonb, inspection_score int 0-100, listed_at, sold_at)`. `reg_no_private` has SELECT revoked from anon and authenticated (column grants list only safe columns); staff read it through `get_used_car_reg(stock_id)` (staff only, audit-logged). Allowed status transitions via trigger (available -> booked -> available|sold; sold is final). Only manager/admin can change `price`. `used_car_sales_history` and `used_car_price_suggestions`: manager/admin only (no consultant, no buyer).

**Slots and bookings**
- `demo_cars(showroom_id, variant_id, reg_label, active)`; `service_types(name, duration_min, active)`.
- `slots(id, kind enum('test_drive','service'), showroom_id|workshop_id, demo_car_id nullable, resource_id GENERATED (coalesce(demo_car_id, workshop_id)), starts_at, ends_at, capacity int >= 1, booked_count int default 0, active, CHECK (booked_count between 0 and capacity), UNIQUE (kind, resource_id, starts_at))`.
- Atomic booking, no explicit locking needed: `UPDATE slots SET booked_count = booked_count + 1 WHERE id = $1 AND active AND booked_count < capacity AND starts_at > now() + lead_time RETURNING ...`; zero rows means "slot taken or closed" (custom error code `VR001`).
- `bookings(id, ref text unique (generated 'VR-' + 6 chars from an unambiguous alphabet, retry on collision), user_id, slot_id, kind, status enum, vehicle_info jsonb (service: reg no is validated and treated as personal data), service_type_id, notes, consent_id, lead_id, cancelled_at, cancel_reason, rescheduled_from, idempotency_key, created_at)`; partial unique index `(user_id, slot_id) WHERE status = 'confirmed'`; a user cannot hold two confirmed bookings of the same kind at overlapping times (exclusion constraint on `tstzrange` via a helper column).
- `idempotency_keys(user_id, key, endpoint, response jsonb, created_at, PK (user_id, key, endpoint))` with a 24 h purge job.

**Leads**
- `leads(id, ref unique, source enum, source_ref text (portal lead id, UNIQUE per source when set), user_id nullable, name, phone (E.164), email, showroom_id, model_id, used_car_id, message, status enum, assigned_to references profiles, assigned_at, sla_due_at, first_contacted_at, sla_breached_at, status_changed_at, lost_reason, consent_id, ai_summary, ai_draft, internal_notes, created_at)`.
- Dedupe rule: one OPEN lead per (phone, model_id) within 24 hours; a repeat enquiry appends a `lead_events` row (`repeat_enquiry`) and bumps `updated_at` instead of creating a second lead. Implemented in `create_lead()`.
- `assignment_rules(id, showroom_id, model_id nullable, priority, active)` + `assignment_rule_consultants(rule_id, consultant_id)` (replaces the uuid array). `consultant_availability(profile_id, is_available, until)` for leave.
- `lead_events(lead_id, type enum, payload jsonb, actor_id, created_at)` append-only.
- Buyer-safe view `my_enquiries` (own leads: model, status, created_at, consultant display name; NOT ai fields, internal notes or other buyers' data).

**Operations:** `messages_outbox(id, channel enum, to_address, template, body, lead_id, booking_id, status enum('pending','sending','sent','failed','dead'), attempts, next_attempt_at, last_error, idempotency_key unique, created_at)` (no client access), `audit_log` (generic trigger `private.audit()` on price_rules, used_cars.price, profiles.role/is_active, assignment_rules, offers, models, variants), `rate_limits(key, window_start, count, PK (key, window_start))` with `private.hit_rate_limit(key, limit, window)`, `newsletter_subscribers(email citext unique, consent_id, unsubscribed_at, unsubscribe_token)`, `csv_imports`, `ai_logs`, `saved_items(user_id, model_id nullable, used_car_id nullable, CHECK exactly one, UNIQUE per user+target)`, `trade_in_requests(user_id, lead_id, ... photos jsonb of storage paths)`, `offers(title, title_hi, body, body_hi, model_id, valid_from, valid_until, active)`, `banners`.

**Privacy:** `data_requests(id, user_id, kind enum('export','delete','opt_out'), status enum('received','in_progress','done','rejected'), due_at default now()+30 days, processed_by, note)`. Function `request_account_deletion()` marks the profile `deleted_at`, revokes marketing consent, creates the request; function `private.anonymise_user(uid)` (run after the grace period by a job) nulls PII on profiles, leads, bookings.vehicle_info, trade-in rows, deletes saved items and storage objects, and sets `anonymised_at` (business records stay, personal fields do not); a server route then deletes the auth user via the admin API. Staff accounts cannot use the self-service path.

## 3. RLS MATRIX (write every policy, then test each cell)
| Table / view | anon | buyer | consultant | manager | admin |
|---|---|---|---|---|---|
| cities, showrooms, workshops, models, variants, variant_colors, active offers/banners, active demo cars, service_types | read | read | read | read | write |
| slots | read future active (columns limited) | same | same | same | write |
| used_cars (safe columns only) | read available/booked/sold-marked | same | same + reg via RPC | + price write | all |
| price_rules | none | none (RPC only) | read | read | write |
| profiles | none | own row, limited columns | own + `consultant_public` | staff in own showrooms (limited) | all via RPC |
| consents | none | own, read only | none | none | read |
| saved_items | none | own CRUD | none | none | none |
| bookings | none | own read; create/cancel/reschedule only via RPC | showroom bookings read | read | read |
| leads | none | `my_enquiries` view only | assigned + own-showroom pool (read), update status on assigned, reassign via RPC | all in own showrooms | all |
| lead_events | none | none | via lead access (read), insert via RPC | same | same |
| trade_in_requests | none | own | via lead access | same | same |
| used_car_sales_history, used_car_price_suggestions | none | none | **none** | read/write | read/write |
| messages_outbox, rate_limits, idempotency_keys | none | none | none | none | none (definer/service only) |
| ai_logs | none | none | none | read | read |
| audit_log | none | none | none | none | read |
| data_requests | none | own insert/read | none | none | manage |
Policy rules: use `(select auth.uid())` and `(select private.current_role())` so the planner caches them; never reference `user_metadata`; every `FOR UPDATE` policy has `WITH CHECK`; inactive users (`is_active = false`) get no access anywhere (helper functions return false). Write a script `scripts/rls-matrix.ts` that, for each table and each of the five personas (anon, buyer A, buyer B, consultant, manager, admin), tries select/insert/update/delete and asserts the matrix; it must also assert that buyer A cannot read buyer B's rows and that `reg_no_private` is unreadable by everyone except via the staff RPC.

## 4. FUNCTIONS (SECURITY DEFINER unless noted; every one validates its inputs and raises custom codes)
`private.current_role()`, `private.is_staff()`, `private.is_manager()`, `private.is_admin()`, `private.user_showrooms()`; `complete_profile`, `get_onroad_teaser`, `get_onroad_breakup`, `create_lead` (dedupe + assignment + SLA + acknowledgement outbox row, one transaction), `assign_lead` (least-loaded consultant in the rule's pool who is active, available and a member of the showroom; ties broken by oldest last assignment; `FOR UPDATE SKIP LOCKED` on the candidate rows so concurrent leads spread out; empty pool -> leave unassigned, create an `unassigned` event and a manager notification), `reassign_lead`, `set_lead_status` (sets `first_contacted_at` on the first transition out of `new`; validates allowed transitions), `book_slot`, `cancel_booking` (releases the slot count; enforces a cancellation window constant), `reschedule_booking` (book new then cancel old in ONE transaction, rolled back if the new slot is gone), `generate_slots(from, to)` (idempotent, `ON CONFLICT DO NOTHING`, respects hours and closures), `flag_sla_breaches()` (sets `sla_breached_at` once per lead, writes a `sla_breached` event and a manager notification outbox row; idempotent), `get_leak_metrics(from, to)` (admin dashboard: % of leads first-contacted within 5 minutes, bookings count, service answered rate, using the brief's maths), `admin_set_role`, `admin_set_active`, `request_account_deletion`, `private.anonymise_user`, `get_used_car_reg`, `private.hit_rate_limit`.
Custom error codes (SQLSTATE class `VR`): `VR001` slot unavailable, `VR002` booking window closed, `VR003` duplicate/overlap, `VR004` invalid transition, `VR005` forbidden, `VR006` rate limited, `VR007` validation. The data layer maps these.

## 5. CRON (pg_cron; jobs are idempotent and logged)
Every minute: `flag_sla_breaches()`; every minute: call `/api/cron/outbox` via `pg_net` with the `CRON_SECRET` header; daily 02:00 IST: `generate_slots(today, today + 14)`; daily: purge expired `idempotency_keys` and old `rate_limits`; daily: `anonymise` due deletion requests then call `/api/cron/finalize-deletions`. Store the app URL and secret in Supabase Vault, not in SQL text. Document how to list, pause and edit jobs.

## 6. STORAGE (migration `0013`)
Buckets: `car-media` (public read, admin write, 5 MB, images only), `inspection-reports` (private, signed URLs for signed-in users, admin write), `trade-in-photos` (private, path `<user_id>/<uuid>.<ext>`, owner write/read, staff read via lead access, 5 MB, jpeg/png/webp, max 6 files). Storage policies on `storage.objects` for each. Never trust the client file name or MIME type; the server validates magic bytes before issuing a signed upload URL.

## 7. SEED (`supabase/seed.sql`, idempotent via `ON CONFLICT`)
Generate from the existing mock data: 2 cities, 3 showrooms, 2 workshops, closures, 5+ models with variants and colours (NEW-H-02), used cars (UC-1182, UC-1190 booked, the rest of the demo set) with varied `listed_at`, price rules clearly labelled seed values and valid after today, offers valid after today, banners, demo cars, 6 consultants and 1 manager as PROFILES-ONLY placeholders that are created for real by the dev-user script (never insert into `auth.users` by SQL), assignment rules with the join table, service types. Slots come from `generate_slots`, not from the seed.

## 8. TYPES AND CHECKS
`pnpm db:types` generates `src/types/db.ts`; commit it. Add scripts: `pnpm db:push` (guarded: refuses unless `SUPABASE_PROJECT_REF` matches the dev ref in `.env.local` and the user passes `--yes`), `pnpm db:lint` (`supabase db lint` if available, else a SQL script), `pnpm rls:test` (section 3). After pushing, the agent asks the user to open Supabase -> Advisors (security and performance) and paste the findings; fix every error and each warning that is not explicitly justified.

## 9. EDGE CASES TO PROVE
Two concurrent bookings of the last slot (exactly one wins); two concurrent leads for one consultant pool (spread); lead with empty pool; consultant deactivated or on leave; duplicate lead within 24 h; price rule overlap rejected; expired price rule returns NULL; reg number never selectable; a buyer updating `role` is rejected; last admin cannot be demoted; booking in the past or inside the lead-time window rejected; cancel releases capacity exactly once (double-cancel is a no-op); reschedule to a full slot leaves the old booking intact; deleting a user anonymises and keeps business rows; `generate_slots` run twice creates no duplicates; booked_count can never exceed capacity (CHECK).
Write these as SQL or vitest integration tests against the dev project (concurrency tests use `Promise.all`).

## 10. Report
Migrations list, the RLS matrix test output, Advisors findings and fixes, function list with signatures, cron jobs, what was deferred.