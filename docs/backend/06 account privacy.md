# PHASE 5: ACCOUNT, PRIVACY (DPDP), SAVED, ENQUIRIES, TRADE-IN, NEWSLETTER

Prerequisite: Phase 4 accepted. This phase makes every buyer-side screen real and closes the privacy requirements of the brief (consent checkbox and opt-out under the DPDP Act 2023). It is engineering, not legal advice: list anything that needs the client's lawyer in the report.

## 1. DASHBOARD DATA (real queries, one place)
Replace the dashboard's data sources with real, per-user queries (server client, cookies, dynamic rendering, `no-store`):
- Upcoming appointments and the "View all" panel: bookings joined with slot, showroom/workshop, vehicle and consultant display name (through `consultant_public`), soonest first, paginated (50 cap as built), past bookings separately.
- Saved vehicles: `saved_items` joined to models/used cars; count and list from the SAME query (the earlier count mismatch must not return). A saved used car that is later sold or deactivated is shown as "No longer available" with a remove button, never as an error or a missing row.
- Enquiries: the `my_enquiries` view with the buyer-facing status labels already implemented; never expose AI text, internal notes or other staff data.
- Counts for the strip come from `count` queries, not from list lengths.
- `bookingRef(id)` helper: use the real `ref` column now; keep the helper only as a fallback for legacy rows and remove it once nothing uses it.
- Saved: `save`/`unsave` server actions (idempotent upsert/delete, return the new state, handle "already saved" and "target no longer exists"); the heart/save buttons on cards and model pages become real and gated; optimistic UI with rollback on failure.

## 2. PROFILE PAGE (`/dashboard/profile`)
Real read/update through `updateProfile` (same zod schema as sign-up; phone re-normalised; changing the phone clears `phone_verified_at`; changing email is a separate flow using Supabase `updateUser({ email })` with the confirmation emails from the setup guide, and the UI explains that the new address must be confirmed). Consent toggles (marketing, newsletter) append consent rows; they are not boolean columns. Language preference updates the profile and the locale cookie. Fields come from the approved audit table. Show the "Delete my account" section (below). Concurrency: reject stale writes (`updated_at`).

## 3. CONSENT AND OPT-OUT
- One module `src/server/privacy/consent.ts`: `recordConsent(subject, purpose, granted, source)`; reads the current policy version constant and stores `text_hash` of the consent text shown (i18n key content in the language displayed). Every personal-data form (contact, enquiry, trade-in, booking, newsletter, sign-up, onboarding) must send a consent purpose; the server refuses requests without it and writes the row inside the same transaction as the data it covers.
- Consent withdrawal is as easy as granting: toggles in the profile; an unsubscribe link in marketing emails (`/unsubscribe/<token>`, no login needed, idempotent, shows a confirmation, records a `granted=false` row); marketing sending code must check `current_consents` before queuing mail.
- `/legal/data-rights` (exists as UI) becomes real: signed-out visitors can submit an opt-out or deletion/export request with email (a confirmation email with a signed link proves control of the address before anything is processed; rate-limited); signed-in users have buttons on the profile page. All requests create `data_requests` rows with a due date and appear on an admin queue screen (status changes are audit-logged).
- Policy versioning: constant `POLICY_VERSION`; when it changes, signed-in users see a one-time "review updated notice" prompt (a new `terms_privacy` consent row is recorded when they accept) without blocking read-only browsing.

## 4. EXPORT AND DELETION
- Export: an admin-processed or automatic job that assembles the user's data (profile, consents, bookings, leads they created, saved items, trade-ins metadata) into a JSON file in a private bucket, signed URL valid 24 h, emailed to the verified address. Never include other people's data or staff-internal notes.
- Deletion (`request_account_deletion`): immediate sign-out, 7-day grace period (configurable constant) during which signing in cancels the request, then `anonymise_user` (Phase 2) + auth user removal through the admin API in `/api/cron/finalize-deletions`. Bookings/leads stay as anonymised business records; storage objects are deleted; marketing and newsletter rows are unsubscribed; the audit log keeps a non-personal event. Staff accounts can only be deactivated by an admin.
- Edge cases: deletion requested while a future booking exists (cancel and release the slot, tell the user); user signs in during the grace period; user has an open lead being worked (assigned consultant notified: "customer requested deletion", the lead is closed as `withdrawn`); duplicate requests; cron failing halfway (resumable, idempotent); request from an unverified email; the last admin cannot self-delete.

## 5. TRADE-IN (`/trade-in`)
Form fields from the existing UI (make, model, year, km, condition, notes, up to 6 photos). Photos: the browser asks the server for signed upload URLs after validating count, size (<= 5 MB each) and declared type; the server stores paths only in the row; after upload the server verifies each object exists and its size and content type; orphaned uploads (form abandoned) are purged by a daily job after 24 h. Submit creates a `trade_in_requests` row and a lead (`source = trade_in`) through `create_lead`, with consent, assigned like any lead. Staff see photos through short-lived signed URLs. Edge cases: partial upload failure (retry per file), user leaves mid-upload, wrong file type renamed to .jpg, huge image dimensions (limit megapixels), duplicate submit (idempotency), year in the future or before 1990, absurd km.

## 6. NEWSLETTER (footer form on every page)
`POST /api/newsletter` (public route handler): email normalisation, consent checkbox required (unticked by default), honeypot, rate limit per IP and per email, idempotent (re-subscribing an existing active address returns success without revealing existence), optional double opt-in (confirmation email with a signed link; recommended: ON), unsubscribe token, writes the consent row in the same transaction, never sends marketing to an address without a current granted consent. The existing button statuses (loading, success, error) are wired to the real result.

## 7. CONTACT / ENQUIRY FORMS
Already routed through `create_lead` in Phase 4; verify consent, rate limiting, duplicate handling and the buyer-facing acknowledgement here as well.

## 8. DATA RETENTION JOB (daily)
Constants in one file: leads closed more than N months are anonymised (default 24, ask the client), rate-limit and idempotency rows purged, expired data-export files deleted, unconfirmed newsletter sign-ups removed after 7 days, outbox rows older than 90 days archived/deleted. Each job is idempotent and writes one audit row with counts, never PII.

## 9. TESTS AND EDGE CASES TO PROVE
Buyer A cannot read or modify buyer B's saved items, bookings, enquiries, profile or storage files (try with direct REST calls using A's token); consent rows cannot be updated or deleted; withdrawing marketing consent stops queued marketing mail; unsubscribe link works twice; deletion flow end to end on a test user (data gone, business rows kept, auth user removed); export contains only the user's data; trade-in upload with a spoofed type is rejected; profile phone change clears verification; stale profile write rejected; consent text hash changes when the text changes; Hindi flows for each form.

## 10. Report
Per screen: real/partly/not; privacy flows demonstrated; list of items for the client's lawyer (retention period, consent wording, grievance contact, children's data wording); remaining gaps.