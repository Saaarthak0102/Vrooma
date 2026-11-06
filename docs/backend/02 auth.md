# PHASE 1: AUTH (Supabase Auth + sign-up + onboarding + guards)

Prerequisite: Phase 0 report accepted. Read docs/backend/AUDIT.md (especially the profile field table in 2.3).

## 0. HUMAN STEPS FIRST (stop and wait)
The user must complete "Part A: Auth setup" of the setup guide (project created, keys, URLs, Email provider, Google, SMTP, email templates). Ask the user to confirm each, and to put the values in `.env.local`:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`. Until then, write code but do not claim it works.
Create the email template files in `supabase/templates/` (confirmation, magic link/OTP, invite, email change, reauthentication) for the user to paste into the dashboard. Each template shows the 6-digit code (`{{ .Token }}`) prominently AND a fallback link built as `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=<type>&next=...` (works even if the link is opened in another browser or phone, unlike the PKCE link). Branded, plain HTML, English plus a one-line Hindi hint, no tracking pixels.

## 1. DESIGN DECISIONS (do not change without asking)
- **Methods:** email one-time code (primary) and Google. No passwords in the UI. No phone/SMS OTP (cost); the mobile number is collected and stored UNVERIFIED (`phone_verified_at` null).
- **Sign-in and sign-up are one passwordless flow** (`signInWithOtp` with `shouldCreateUser: true`), so the UI never reveals whether an email already exists. The sign-up page differs only in that it collects the profile first.
- **A profile must be completed before any gated action** (booking, trade-in, enquiry, save). `profiles.onboarding_completed_at IS NULL` means incomplete. This covers Google sign-ups, abandoned sign-ups and legacy users with one rule.
- **Roles:** `buyer` (default), `consultant`, `manager`, `admin`. A role is NEVER set from client input or metadata. Staff accounts are created by an admin invite (`auth.admin.inviteUserByEmail`) and the role is set by a server-only admin function after the user exists. The first admin is bootstrapped with a script (below).
- **Authorisation reads the database** (profiles.role, profiles.is_active), not JWT metadata.

## 2. WHAT TO BUILD

### 2.1 Supabase clients and request interceptor
- `src/lib/supabase/{client,server,public,admin}.ts` as defined in 00-README (browser, cookie server client, cookie-less public client, server-only admin client). Use the publishable and secret keys.
- Request interceptor: check the installed Next.js version; the file is `proxy.ts` on new versions and `middleware.ts` on older ones. It must compose next-intl routing with the Supabase session refresh: run the intl handling, then (only for the protected path set: `/dashboard`, `/book`, `/trade-in`, `/staff`, `/admin`, `/onboarding`, `/sign-in`, `/sign-up`, `/auth`, `/api` except public endpoints) call `getClaims()` and copy any refreshed cookies onto the response that is returned (including redirects). Public pages (home, cars, used-cars, offers, showrooms, legal) must not trigger session work, so ISR keeps working. Responses that set auth cookies get `Cache-Control: private, no-store`.
- Guard order for protected paths: no claims -> redirect to `/sign-in?next=<sanitised path>`; claims but profile incomplete -> `/onboarding?next=`; staff/admin path without the role -> 403 page (not a redirect loop); inactive account -> sign out and show "account disabled" on sign-in.

### 2.2 Server helpers (src/server/auth/)
`getViewer()` (claims + profile, cached per request), `requireUser()`, `requireCompleteProfile()`, `requireRole(...roles)`, each throwing AppError(401/403/409). `safeNext(next)`: only same-origin relative paths starting with a single `/`, no `//`, no `\`, no protocol, allow-list of prefixes, locale-aware; anything else falls back to `/dashboard`. Unit-test it with hostile inputs (`//evil.com`, `/\evil.com`, `javascript:`, encoded variants, very long strings).

### 2.3 Routes and pages
- `/sign-in` (exists as UI): email field -> code step; "Continue with Google"; link "New here? Create an account" -> `/sign-up`. The same component powers `SignInSheet`.
- `/sign-up` (NEW). Two columns on desktop: left, heading ("Create your Vrooma account") and three short benefit lines with real value (see the on-road price, book a real slot, track your enquiries); right, the form. Single column on phones. Step indicator "1 of 2". Step 1 fields (from the audit table, baseline):
  * Full name (required, 2-80 chars, trimmed, letters/spaces/.'-, Unicode allowed for Hindi names)
  * Mobile (required): "+91" prefix chip + 10 digits; accept pasted `9876543210`, `+91 98765 43210`, `09876543210`; normalise to `+919876543210`; must start 6-9
  * Email (required)
  * City (required, from the `cities` table; default Lucknow)
  * Preferred language (English / हिन्दी, default = current locale)
  * Consent checkboxes, ALL UNTICKED: (1) required: "I am 18 or older and agree to the Terms and Privacy Notice" (links open in a new tab); (2) required for booking features, shown as part of the same required group: "You may contact me about my enquiries and bookings by phone, WhatsApp, SMS or email"; (3) optional: "Send me offers and news" (marketing). Each checkbox label states the purpose; marketing can be withdrawn any time.
  * Any extra profile fields found in the audit that are required, at the positions the audit decided. Optional ones go into a collapsed "More details (optional)" group.
  Buttons: "Continue with Google" (secondary) and "Send code" (primary, loading state). Step 2: one-time code input (length = `OTP_LENGTH` in `src/lib/auth-config.ts`, 8 by default; it must equal the Supabase "Email OTP Length" setting and `NEXT_PUBLIC_AUTH_OTP_LENGTH`) (`inputmode="numeric"`, `autocomplete="one-time-code"`, paste support, auto-submit on the 6th digit), "Resend code" with a 60-second countdown, "Change email". Success -> save profile + consents (2.5) -> redirect to `safeNext(next)` or `/dashboard`.
- `/onboarding` (NEW): the same profile fields prefilled from what is known (Google name, locale), no email/code step. Used for Google users, abandoned sign-ups and legacy users. Cannot be skipped; shows "Sign out" as the only exit.
- `/auth/callback` (OAuth `exchangeCodeForSession`) and `/auth/confirm` (`token_hash` + `type` -> `verifyOtp`), both as route handlers that set cookies, handle errors (`access_denied` when the user cancels Google, expired/used link, mismatched redirect) by redirecting to `/sign-in?error=<code>` with a friendly translated message, and never echo raw error text.
- `UserMenu`, `AuthProvider`, `AuthGate`, `useRequireAuth`: replace the mock session with real state. `AuthProvider` hydrates from `onAuthStateChange` on the client (public pages are static, so they cannot know the user on the server). Reserve the header user-area width so there is no layout shift while auth state loads. Multi-tab sign-in/out must sync. Remove the dev role switcher and localStorage sessions.
- `AuthGate`/`useRequireAuth`: keep the "open the sheet, then resume the action" behaviour. Store the pending intent (`{type, payload, returnTo, createdAt}`) in `sessionStorage` with a 30-minute expiry; it must survive the Google round trip in the same tab; clear it on sign-out. After sign-in, run `requireCompleteProfile` first, then resume.
- Sign out: server action `signOut` (scope local), clears intent, `router.refresh()`.

### 2.4 Server actions (src/server/auth/actions.ts), all zod-validated, rate-limit aware, idempotent
`requestOtp(email, locale, next)`, `verifyOtp(email, code)`, `startGoogle(next)`, `completeProfile(input)`, `signOut()`. Rules:
- Normalise email (trim, lower-case, reject > 254 chars).
- Map Supabase auth errors to AppErrors with translated messages: over-email-rate-limit/cooldown (show the countdown), invalid or expired code (and a remaining-attempts hint is not available; just say try again or resend), user banned, network failure, provider disabled. Never reveal whether the email exists.
- `completeProfile` runs with the user's own session (RLS), validates with the SAME zod schema as the form (shared in `src/lib/validation/profile.ts`), normalises the phone with `src/lib/phone.ts` (unit-tested: valid and invalid cases), writes the profile fields and the consent rows (purpose, policy version constant, granted_at, source = `signup`|`onboarding`) in ONE database call (a SQL function created in Phase 2; until then write the call against that signature and stub it behind a clear TODO that Phase 2 removes). It sets `onboarding_completed_at` only if every required field and the two required consents are present.
- If the code step succeeds but `completeProfile` fails (network, validation), the user is signed in with an incomplete profile and lands on `/onboarding` with their entered values preserved (keep the form values in sessionStorage until success).

### 2.5 Database pieces needed by auth (full detail in Phase 2; create now what auth needs, as a migration)
`profiles` table and `handle_new_user` trigger (creates a minimal profile on `auth.users` insert: id, email, full_name from metadata if present, locale, role `buyer`; `ON CONFLICT DO NOTHING`; it must never copy a role from metadata), role helper functions, `consents` table, and the `complete_profile` function. If Phase 2 is not run yet, put these in `0001` and have Phase 2 extend them.

### 2.6 Admin bootstrap and dev logins
- `scripts/bootstrap-admin.ts <email>`: uses the secret key to find or invite the user and sets `role = 'admin'`, `is_active = true`, `onboarding_completed_at = now()` through the admin client. Refuses to run if an admin already exists unless `--force`. Document usage in docs/backend/STATUS.md.
- Staff invites: an admin-only server action `inviteStaff(email, role, showroomIds)` -> `inviteUserByEmail`, then sets the role and showroom membership after the profile row exists (retry/backoff; if the user already exists, only update the role and say so).
- Dev-only password login for seeded test users (one per role) so every area can be tested without email: enabled ONLY when `NODE_ENV === 'development'` AND `APP_ENV !== 'production'` AND `ALLOW_DEV_LOGIN === 'true'`; the route returns 404 otherwise. Add an `APP_ENV` variable (development | production; set to `production` on the real host). The "must never be enabled in production" check runs when the SERVER STARTS (`instrumentation.ts` `register()`), never when a module is loaded, because `next build` loads every route module with `NODE_ENV=production` even on a laptop. Add a deploy/CI script that fails if `ALLOW_DEV_LOGIN` is set for a production environment. Seed the test users with a script using the admin API against the DEV project only.

### 2.7 Edge cases that must be handled and tested
Expired/used/mistyped code; resend spamming (cooldown + disabled button); two tabs requesting codes (latest code wins; show a clear message); opening the confirm link on another device (token_hash route works); email scanners pre-consuming links (that is why the code, not the link, is the primary path); Google account with an email that already has an OTP account (verify that identities link to ONE user and ONE profile; if not, report it); user cancels at Google; callback replayed or code reused; session expiry during a booking (resume the intent after re-auth); refresh-token failure (sign out cleanly, keep the intent); two-tab sign-out; deleted or banned user with a live session (guards reject on the next request); staff deactivated mid-session; role changed while signed in (takes effect on the next request because it is read from the DB); open-redirect via `next`; locale prefix in redirects (`/hi/...`); cookies on a response that was redirected; users with JavaScript disabled still see the sign-in form; autofill and password-manager behaviour with the code field; Hindi layout; reduced motion.

### 2.8 Tests
Unit: `safeNext`, phone normalisation, profile zod schema, error mapping. Integration (against the DEV Supabase project, skipped when env is missing): sign-in with the dev password users, role guards for each role on `/dashboard`, `/staff`, `/admin`, profile gate redirect, `completeProfile` rejects when a required consent is missing, a buyer cannot update their own role (this one is also tested again in Phase 2 against RLS).

## 3. Report
What was built, which human steps are confirmed, the proof list for each edge case in 2.7 (tested / manually checked / not possible), the exact proxy composition used, any identity-linking findings, and what Phase 2 must replace.