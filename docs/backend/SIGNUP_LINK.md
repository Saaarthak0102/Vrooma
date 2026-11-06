# SIGN-UP: LINK-ONLY EMAIL VERIFICATION

Sign-up no longer asks for a 6-digit code. The user gets an email with a **Confirm Account** link; after confirming they land on **onboarding**. Sign-in is unchanged and keeps its 6-digit code.

## Flow

1. `/sign-up` collects name, email, phone, city and the DPDP consent boxes (consents are only a gate on this page, they are **not** stored or carried over).
2. `requestSignupLink` (`src/server/auth/signup-link.ts`) asks Supabase for a confirmation email. Name, phone, city and locale ride along as auth user metadata, for prefill only.
3. The page switches to **Check your email**. It moves on by itself when the session appears in this browser (another tab opened the link), and re-checks when the tab regains focus.
4. The email link goes to `/auth/confirm?next=...&token_hash=...&type=signup`. That route **does not verify**: it forwards to `/verify-email`. Mail scanners (Outlook SafeLinks, antivirus) open every link, and the token is single-use, so verifying on page load would burn it.
5. The user presses **Confirm my email**: `confirmEmailLink` verifies the token and returns the destination from `resolvePostVerifyDestination` (`post-verify.ts`): onboarding for a new account, dashboard / staff / admin for a completed one, sign-in with an error for a deactivated one.
6. Onboarding opens prefilled via `getSignupHint`, with every consent box **unticked**. The user ticks them once, now that the address is verified, and `complete_profile` records them.

## Owner steps in the Supabase dashboard (DEV `eobtzcwinjmimzisypca`, then PROD)

The repo templates only apply to a local Supabase. On the hosted projects:

1. **Authentication > Email Templates > Confirm signup**: paste `supabase/templates/confirmation.html`. The button must stay `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup`.
2. **Authentication > URL Configuration**:
   - Site URL = the app URL.
   - Redirect URLs must include `<app url>/auth/confirm**` (for example `http://localhost:3000/auth/confirm**` on DEV and `https://vrooma.in/auth/confirm**` on PROD). If it is missing, `{{ .RedirectTo }}` falls back to the Site URL and the link loses its query string.
3. Keep **Confirm email** enabled. The link lifetime is the OTP expiry (default 1 hour); the email says "valid for 1 hour".
4. The **Magic Link** template (used when an existing account signs in, or submits the sign-up form again) is unchanged and still shows a code plus a link.

## Behaviour worth knowing

- Link opened on another device: that device continues to onboarding; the original tab keeps waiting.
- Used or expired link: the confirm page says so and offers a new link.
- `user_metadata` is user-editable. It only prefills form fields; it never sets a role or a consent.
- Abandoned sign-ups leave an unconfirmed auth user (unchanged behaviour).

## A bug found and fixed while building this

`/auth/confirm` and `/auth/callback` (the email-link handler and the Google OAuth callback) **returned 404 for everyone**: the middleware matcher sent them through `next-intl`, which rewrote them to `/en/auth/...`, a page that does not exist. They are now excluded from the matcher in `src/middleware.ts` (guarded by `tests/signup-link.test.ts`).

## Proof

- `tests/signup-link.test.ts` (23 tests): validation, redirect safety, the destination matrix, "GET never verifies", template and page guarantees, middleware matcher.
- `node scripts/e2e-signup-link.mjs` (DEV only, creates and deletes one throw-away user; needs a running app whose `NEXT_PUBLIC_SITE_URL` equals `TEST_URL`): link lands on the confirm page without creating a session, a scanner GET only redirects, the button leads to onboarding, name and phone are prefilled, consents start unticked, a reused link is refused, a token-less link goes to sign-in. 12/12 on a production build.
- `node scripts/console-check.mjs`: 67/67, including `/en/sign-up`, `/hi/sign-up` and `/en/verify-email`.
