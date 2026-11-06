# RPC CALL PATHS: who calls each restricted function, with which client

**Why this exists (follow-up 1):** migration `0014_rpc_privilege_hardening` revoked direct execution of several functions from `anon` / `authenticated`. This file records, for every function that is restricted, restricted-by-default, or identity-sensitive, **which code path calls it now, with which Supabase client, and where the identity and role are checked.** Migration `0018` closes the gaps found while writing it.

## Rules every row obeys

1. **Check first.** Server code authenticates the user and checks the role (`requireUser` / `requireCompleteProfile` / `requireRole` in `src/server/auth/viewer.ts`, or `guardUser` / `guardRole` / `guardCronOrAdmin` in `src/server/auth/api-guard.ts` for route handlers) **before** it calls anything.
2. **User session when the SQL checks `auth.uid()`.** Functions that decide on `auth.uid()` / `private.is_staff()` are called with the *user's* client (`createClient()` from `src/lib/supabase/server.ts`). Through the admin (service-role) client `auth.uid()` is NULL and those checks refuse the call.
3. **Admin client only for what has no user identity**, and then the acting user id is passed **explicitly** (`p_user_id`).
4. **SQL never trusts a caller-supplied user id unless the caller is the service role.** `create_lead(p_user_id)` honours the argument only when `auth.role() = 'service_role'`; for every other role it is ignored and the JWT subject is used.

## Call-path table

| Function | Who may execute (after 0014/0018) | Called from | Client | Identity / role check (before the call) | Acting id |
|---|---|---|---|---|---|
| `resolve_price_rule` | `service_role` only | `getPriceRule` in `src/server/repositories/pricing.ts`, reached from `getOnRoadAction`, the model page (teaser), `landing-data.ts` | admin | none needed: returns internal margin rules, never sent to the browser; callers return only the computed total (anon) or the itemised breakup (signed in) | n/a |
| `get_onroad_teaser` | anon, authenticated, service_role | not called by the app (the app computes the same teaser server-side from the same rule with `computeOnRoad`); kept for direct API use | n/a | none: total + validity only | n/a |
| `get_onroad_breakup` | authenticated, service_role | not called by the app (the app computes the itemised breakup server-side in `getOnRoadAction` after `getViewer()`); the SQL itself refuses `auth.uid() IS NULL` | n/a | `auth.uid()` in SQL | JWT |
| `create_lead` | authenticated, service_role (**anon revoked**) | (a) `createLead` in `src/server/repositories/leads.ts` <- `POST /api/leads` (the only anonymous path); (b) `bookSlotAction`; (c) `submitTradeInAction`; (d) `src/server/services/csv-import.ts` <- `POST /api/leads/import` | admin for (a)(b)(c)(d) | (a) honeypot + per-IP and per-phone rate limit + zod + consent; (b) `requireCompleteProfile()`; (c) `getViewer()` (guest allowed, consent required); (d) `getViewer()` role = manager/admin | (b) `p_user_id: user.id`; (c) `p_user_id: viewer.user?.id`; (a) and (d) none (leads have no user) |
| `book_slot` | authenticated, service_role (**anon revoked**) | `bookSlotAction` | **user session** (`createClient()`) | `requireCompleteProfile()`, overlap check, then the RPC records `user_id = auth.uid()`; the function has **no user-id parameter at all** | JWT |
| `cancel_booking` | authenticated, service_role | `cancelBookingAction`; `requestAccountDeletionAction` (releases a leaving user's own upcoming bookings) | user session; admin for the deletion flow | RPC: owner (`user_id = auth.uid()`) or staff, else `VR005`. The deletion flow first selects only `.eq("user_id", user.id)` rows | JWT |
| `reschedule_booking` | authenticated, service_role | `rescheduleBookingAction` | **user session** | same owner-or-staff rule; the new booking keeps the original `user_id` | JWT |
| `get_used_car_reg` | authenticated, service_role | `revealUsedCarRegAction` in `src/server/actions/used-car-reg.ts` | **user session** | action: `requireRole(consultant, manager, admin)`; RPC: `private.is_staff()` or `VR005`; RPC writes `VIEW_UNMASKED_REG` to `audit_log` with `actor_id = auth.uid()` | JWT |
| `set_lead_status` | authenticated, service_role | `updateLeadStatusAction`; `sendLeadReplyAction` (status new -> contacted) | **user session** (both) | `requireRole(...)`; RPC: `is_staff()` and, since 0018, a consultant may only touch a lead assigned to them | JWT |
| `reassign_lead` | authenticated, service_role | `reassignLeadAction` | **user session** | `requireRole(...)`; RPC: `is_staff()`; since 0018 a consultant may only re-assign their own lead, and the target must be active staff of the lead's showroom (admin: any) | JWT |
| `complete_profile` | authenticated, service_role | `completeProfile` in `src/server/auth/actions.ts` | user session | `requireUser()` | JWT |
| `request_account_deletion` | authenticated, service_role | `requestAccountDeletionAction` | user session | `requireUser()` and role = buyer | JWT |
| `admin_set_role` | authenticated, service_role | `setStaffRoleAction` | user session | `requireRole("admin")`; RPC: `private.is_admin()`, cannot change own role, last admin protected | JWT |
| `get_leak_metrics` | authenticated, service_role | `getLeakMetricsAction` | user session | `requireRole("admin")`/manager | JWT |
| `generate_slots` | `service_role` only | `generateSlotsAction`; pg_cron job `daily_slot_generation` | admin; pg_cron | `requireRole("admin"/"manager")` in the action | n/a |
| `flag_sla_breaches` | `service_role` only | pg_cron job `eval_lead_sla_breaches` (the only scheduler); `GET/POST /api/cron/sla` (manual trigger) | pg_cron; admin | cron route: `authorizeCron` bearer secret | n/a |
| `anonymise_user` | `service_role` only (public wrapper added in 0018; the original lives in `private`, which PostgREST does not expose) | `/api/cron/finalize-deletions` | admin | `authorizeCron` bearer secret; only rows in `data_requests` past the 7-day cooling-off | explicit `p_uid` from the request row |
| `get_cron_status` (0018) | `service_role` only | Admin > System Health | admin | `requireRole("admin")` page guard | n/a |
| `private.ensure_cron_jobs` (0018) | postgres / SQL editor only | migration 0018; owner after adding Vault secrets | n/a | n/a | n/a |

## What was wrong before 0018 (found while writing this table)

| # | Finding | Fix |
|---|---|---|
| 1 | Bookings and trade-ins call `create_lead` with the admin client. `auth.uid()` is NULL there, so `leads.user_id` and the event actor were NULL: the buyer's own enquiries never matched the lead. | `p_user_id`, honoured for the service role only (0018) + callers pass it. |
| 2 | `set_lead_status` / `reassign_lead` checked only "is staff". Any consultant could change or re-route **any other consultant's lead** by calling the RPC with the publishable key. | Ownership check inside both functions (0018). |
| 3 | `sendLeadReplyAction` called `set_lead_status` with the admin client, where `is_staff()` is false, so the call was refused and the lead stayed `new`, the SLA clock kept running after the buyer was already answered. | Called with the user session. |
| 4 | `anonymise_user` existed only as `private.anonymise_user`. PostgREST cannot reach the `private` schema, so `/api/cron/finalize-deletions` failed for every real erasure request. | Public service-role wrapper (0018). |
| 5 | `create_lead` left an enquiry **unassigned** when it carried no model and the showroom's rules were all model-specific (true for Hazratganj and Gomti Nagar in DEV). The generic contact form and every booking-attached lead hit this. | Tier-1 fallback to any active rule of the showroom (0018). |
| 6 | `get_onroad_teaser`, `get_onroad_breakup` and `get_used_car_reg` were never called by the app: the breakup gate was a client-side `AuthGate` around data already shipped to the browser, and there was no staff path to reveal a registration. | `getOnRoadAction` (server-side tiering) and `revealUsedCarRegAction`. |

## Tests that prove it

- `tests/e2e-flows.test.ts` (live DEV, real dev users, needs 0018 applied): signed-out teaser vs refused breakup; signed-in breakup, test-drive booking with the buyer's id, reschedule and cancel; anonymous contact form via the route handler only (and a receipt, not the stored row); consultant reveals a registration with an audit row, a buyer is refused; two buyers cannot cancel or reschedule each other's bookings; `p_user_id` ignored for a buyer session and honoured for the service role; a consultant cannot change or re-route another consultant's lead; `anonymise_user` and `get_cron_status` are service-role only.
- `tests/api-route-guards.test.ts`: every route that used to run unauthenticated now answers 401/410 with no session, and the source contains no client-supplied user id.
- `pnpm probe` (`scripts/api-probe.ts`) and `pnpm rls:test` re-confirm the grants.
