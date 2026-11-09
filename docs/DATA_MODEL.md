# VROOMA — DATA MODEL

The authoritative schema is `supabase/migrations/` (42 files, `0001`-`0042`). `src/types/database.types.ts` is generated from it (`pnpm db:types`) and `tests/types-match-schema.test.ts` keeps the hand-written `src/types/db.ts` in line. This page is the map, not a copy of the SQL.

## Golden rules
1. **Integer rupees.** Money is `BIGINT` whole rupees. Never decimals or floats.
2. **Row Level Security on every table.** Buyers see their own rows; staff see what their role allows (`docs/backend/ROLE_MATRIX.md`). Public reads go through views or RPCs that mask data.
3. **Registration numbers** are stored in full on `used_cars` and masked (`UP32 ** **** 1234`) for everyone except staff who may reveal them; every reveal is audited.
4. **Personal data needs consent** (`consents` row with time, IP, version) and is erasable (`docs/DPDP.md`).
5. Migrations start `BEGIN;` and end `COMMIT;` (`pnpm db:lint`). Never edit an applied migration; add a new one.

## Enums (migration `0001`)
`role_type` (buyer, consultant, manager, admin; manager is also the Used-Car Manager), `fuel_type`, `transmission_type`, `body_style`, `vehicle_condition`, `lead_status_type` (new, contacted, test_drive_booked, negotiating, won, lost), `lead_source_type` (web, portal, social, walkin, chat, trade_in), `booking_type`, `booking_status`, `used_car_status`.

## Tables by area
| Area | Tables |
|---|---|
| Catalogue and prices | `models`, `variants`, `variant_colors`, `cities`, `price_rules`, `offers`, `banners` |
| Used stock | `used_cars`, `used_car_sales_history`, `used_car_price_suggestions` (manager only) |
| Places and capacity | `showrooms`, `workshops`, `showroom_closures`, `service_types`, `demo_cars`, `slots`, `staff_showrooms`, `consultant_availability` |
| Leads | `leads`, `lead_events` (timeline), `lead_tasks` (agent proposals, `0040`), `assignment_rules`, `assignment_rule_consultants`, `csv_imports`, `trade_in_requests` |
| Bookings | `bookings` (test drive and service, capacity-checked through slots) |
| Chat | `chat_conversations` (holds `ai_context` brief), `chat_messages` |
| People and privacy | `profiles`, `consents`, `data_requests`, `saved_items`, `newsletter_subscribers` |
| Owner garage (`0039`) | `owner_vehicles`, `service_records` (odometer, next service, reminder opt-in) |
| Service calls (`0034`) | `call_logs` |
| Messaging | `messages_outbox` (email now, WhatsApp by switch) |
| AI | `ai_logs` (redacted call records), AI profile columns on `leads` (`0036`) |
| Platform | `audit_log`, `idempotency_keys`, `rate_limits`, `cron_heartbeats` (`0038`) |

## Notable functions (full list: `docs/backend/RPC_CALL_PATHS.md`)
`create_lead` (routing, SLA, consent), `book_slot`, `generate_slots(from, days)`, `flag_sla_breaches()`, `private.ensure_cron_jobs()`, `private.refresh_demo_activity()` (demo data only), `handle_new_user` trigger (creates the profile on sign-up).

## Retention (DPDP)
Defined in `src/server/privacy/retention.ts`, run daily by `/api/cron/data-retention`:

| Data | Kept |
|---|---|
| Closed leads | anonymised after 24 months |
| Outbox (sent or dead) | 90 days |
| Idempotency keys | 7 days |
| Service-call logs | 365 days |
| Support chats (no new message) | 365 days |
| `ai_logs` | 90 days |
| Draft-versus-sent reply audit | 365 days |
| Finished or dismissed `lead_tasks` | 180 days |

Account deletion is requested in the buyer dashboard, can be cancelled (`/restore-account`), and is finalised by `/api/cron/finalize-deletions`.
