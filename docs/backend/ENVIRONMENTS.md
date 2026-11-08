# VROOMA: ENVIRONMENT SPECIFICATION & PROMOTION POLICY

**Document:** `docs/backend/ENVIRONMENTS.md`  
**Date:** 2026-11-05  
**Version:** 2026.1  
**Status:** **ACTIVE / VERIFIED**

---

## 1. Project References & Identity

| Attribute | Development (DEV) | Production (PROD) |
|---|---|---|
| **Supabase Project Reference** | `eobtzcwinjmimzisypca` | `ajumkjokagqfdikfguti` |
| **Supabase Project URL** | `https://eobtzcwinjmimzisypca.supabase.co` | `https://ajumkjokagqfdikfguti.supabase.co` |
| **AWS Region** | `ap-south-1` (Mumbai) | `ap-south-1` (Mumbai) |
| **Host Environment** | Local machine / Vercel Preview Deployments | Vercel Production Deployment (`https://vrooma.in`) |
| **`APP_ENV` Variable** | `development` | `production` |
| **Dev Password Sign-in** | Allowed (`ALLOW_DEV_LOGIN=true`) | Strictly disabled (`ALLOW_DEV_LOGIN=false`, 404 on endpoint) |
| **Dev Seed Users** | 9 canonical dev personas present | Never seeded; real staff only |

---

## 2. Environment Files Layout

- **`.env.local`:**
  - Contains **DEV credentials ONLY**.
  - Must never contain the production ref `ajumkjokagqfdikfguti` in any URL or secret key value.
  - Contains non-secret reference flags:
    ```bash
    SUPABASE_DEV_REF=eobtzcwinjmimzisypca
    SUPABASE_PROD_REF=ajumkjokagqfdikfguti
    ```
- **`.env.production*` files:**
  - **Strictly forbidden** on disk. Next.js automatically loads `.env.production` during local builds and starts, which risks cross-contaminating production state.
  - Enforced by `node scripts/check-env.mjs`.
- **`.env.example`:**
  - Committed template with blank variable values.
- **Production Credentials:**
  - Configured exclusively in the hosting provider (e.g. Vercel dashboard environment variables).
  - For one-off manual operational tasks, credentials must be passed via the active shell session environment variables.

---

## 3. Database Migration Promotion Procedure (DEV -> PROD)

1. **Step 1: Local Development & Linting:**
   - Author incremental forward migration in `supabase/migrations/NNNN_name.sql`.
   - Never modify an already-applied migration.
   - Run `pnpm db:lint` to verify syntax, universal RLS, and search paths.

2. **Step 2: DEV Application & Verification:**
   - Link the CLI to DEV (the CLI link is a single shared file, `supabase/.temp/project-ref`; the runner checks it but never changes it):
     ```bash
     npx supabase link --project-ref eobtzcwinjmimzisypca
     ```
   - Push to the DEV project. `--target dev` and `--yes` are both required:
     ```bash
     SUPABASE_PROJECT_REF=eobtzcwinjmimzisypca pnpm db:push --target dev --yes
     ```
     The runner checks, in order: the arguments (an allowlist; any other flag is rejected), that `APP_ENV`/`NODE_ENV` is not `production`, that `SUPABASE_PROJECT_REF` is the DEV ref, that `.env.local`'s `NEXT_PUBLIC_SUPABASE_URL` is the DEV project, and that the CLI is linked to DEV. It then runs `supabase db push --remote=eobtzcwinjmimzisypca --include-all --yes`.
   - Run all automated regression tests:
     ```bash
     pnpm test
     pnpm rls:test
     ```
   - Run the API security probe:
     ```bash
     pnpm probe
     ```

3. **Step 3: Guarded Production Push (owner only):**
   - Take a production backup first (Supabase dashboard, Database, Backups).
   - Link the CLI to production, in the same shell session you will use for the push:
     ```bash
     npx supabase link --project-ref ajumkjokagqfdikfguti
     ```
   - Export production values **in the shell session only**. Never put them in `.env.local`, `.env.prod`, or any file (the runner blocks if `.env.local` mentions the production ref or defines production credentials):
     ```powershell
     # PowerShell
     $env:SUPABASE_PROJECT_REF = "ajumkjokagqfdikfguti"
     $env:NEXT_PUBLIC_SUPABASE_URL = "https://ajumkjokagqfdikfguti.supabase.co"
     $env:SUPABASE_DB_PASSWORD = "<production database password>"
     ```
     ```bash
     # bash
     export SUPABASE_PROJECT_REF=ajumkjokagqfdikfguti
     export NEXT_PUBLIC_SUPABASE_URL=https://ajumkjokagqfdikfguti.supabase.co
     export SUPABASE_DB_PASSWORD='<production database password>'
     ```
   - **Dry run first.** It runs every production check and asks the CLI to list what it would apply, without applying anything:
     ```bash
     pnpm db:push --target prod --i-am-targeting-production --dry-run
     ```
     Read the list. It must be exactly the migrations you expect.
   - **Apply.** Type the production ref as a second, separate confirmation:
     ```bash
     pnpm db:push --target prod --i-am-targeting-production --confirm-production=ajumkjokagqfdikfguti
     ```
     This runs `supabase db push --remote=ajumkjokagqfdikfguti --yes`. There is no `--include-all`, so a migration older than the remote history is stopped by the CLI's own history check instead of being forced through. The password reaches the CLI only through the process environment, never as an argument, and is never printed.
   - Re-link the CLI to DEV afterwards, otherwise DEV pushes stay blocked:
     ```bash
     npx supabase link --project-ref eobtzcwinjmimzisypca
     ```
   - The production run is refused when any of these is true: a missing `--i-am-targeting-production` or typed ref (the typed ref is not needed for `--dry-run`); `SUPABASE_PROJECT_REF` is anything other than the production ref (the DEV ref and the deleted legacy ref are named in the error); `NEXT_PUBLIC_SUPABASE_URL` is not exactly `https://ajumkjokagqfdikfguti.supabase.co`; `SUPABASE_DB_PASSWORD` is empty; the CLI link (`project-ref`, and `linked-project.json` when present) is not production; `.env.local` mentions the production ref or defines `SUPABASE_DB_PASSWORD`/`SUPABASE_ACCESS_TOKEN`; any of `SUPABASE_DB_URL`, `DATABASE_URL`, `POSTGRES_URL`, `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `SUPABASE_PROJECT_ID` is set; or any flag outside the allowlist is given (`--remote`, `--project-ref`, `--db-url`, `--linked`, `--password`, `--include-all`, `--yes` and so on).
   - Seed scripts, dev users, and test runners strictly refuse to execute against production.

---

## 4. `TRUSTED_PROXY` (client IP for rate limits and audit)

`src/lib/network.ts` takes the client IP from exactly one source, chosen by `TRUSTED_PROXY`. A client-sent `cf-connecting-ip`, `x-forwarded-for`, `x-real-ip` or `true-client-ip` is never trusted unless the matching mode is on.

| Value | Header trusted | Everything else | Where to set it |
|---|---|---|---|
| `none` (default) | none (socket address if the runtime exposes it, else a shared `unknown` bucket that is rate limited globally) | ignored | local development, any unknown host |
| `vercel` | `x-vercel-forwarded-for`, then the first `x-forwarded-for` entry (Vercel overwrites both on external requests) | ignored | **Vercel production and preview scopes** |
| `cloudflare` | `cf-connecting-ip` | ignored | only if the origin accepts Cloudflare traffic only |

Assumption (cannot be proven in code): in `vercel` / `cloudflare` mode the origin is reachable only through that proxy. A client that can hit the origin directly could forge the header, so use `none` in that case. Values that are not valid IPs are discarded.

## AI demo data (DEV only)

`supabase/seed.sql` is catalog-only and is also what restores production, so demo rows never go in it. The AI features
(lead briefings and the Next-steps agent, follow-up tasks, the garage and service reminders, digests, the price-band note,
the AI audit log, escalations) need people, leads and dates to show anything, so they have their own DEV-only script:

```
pnpm seed:ai-demo -- --dry-run     # prints the row counts, writes nothing
pnpm seed:ai-demo                  # inserts (safe to repeat; refreshes the relative dates)
pnpm seed:ai-demo -- --reset       # removes only its own rows, then re-seeds
```

(Set `SUPABASE_PROJECT_REF=eobtzcwinjmimzisypca` in the environment, as for `seed-dev-users.ts`.)

- **Safety:** refuses anything but the DEV project; production and the old project ref are blocked; production env flags are blocked.
- **Needs:** the dev users (`scripts/seed-dev-users.ts`), `supabase/seed.sql`, and migrations 0034-0040 applied. It names any that are missing.
- **Touches only its own rows:** every id starts with `5eed`. It does not edit models, variants, used cars, showrooms, price rules, offers, profiles or the outbox, and it does not write `cron_heartbeats`.
- **Dates are relative to now**, so reminders, escalations, stale leads and expiry chips are live. Run it again to refresh them.
- **What you get:** 29 leads with timelines and a mix of saved/empty AI briefings (including a discount-seeking buyer, quiet leads, a waiting chat),
  follow-up tasks, bookings for the dev buyer (tomorrow, in 2.5 h, completed, no-show, stuck "confirmed"), two cars in the buyer's garage with
  service history and near/expired dates, three chats, consents (marketing left off), 19 past used-car sales for the price band,
  service-desk calls, and an AI audit log. Everything belongs to the existing dev personas.
- Seeded follow-up tasks use the same keys as the automations, so the 5-minute job will not create duplicates of them.

## Cleaning up test data (DEV only)

Test runs create real leads, bookings and outbox rows on DEV. `tests/e2e-flows.test.ts` now removes what it creates when it finishes, and
`tests/csv-import.test.ts` runs against a fake database, so repeated `pnpm test` runs no longer pile up fake leads. To clear what older runs left behind:

```
pnpm cleanup:test-data -- --dry-run    # shows what would go
pnpm cleanup:test-data                 # deletes it
```

(Set `SUPABASE_PROJECT_REF=eobtzcwinjmimzisypca`, as for the seed scripts. Do not leave it exported while running `pnpm test`: the project-guard tests expect it to be unset.)

It removes only leads that look like test data (known test names, `E2E-` prefixes, the sample-CSV people), with their bookings, outbox rows, AI log rows, trade-ins and chats, plus bookings made by the test buyer accounts, and hands the booked seats back to the slots.
It never touches the AI demo data (`LD-D-` leads, `BK-D-` bookings, `5eed` ids) or a real person's enquiry.

## Email now, WhatsApp when the keys arrive

Nothing needs to be rewritten to start on email and move to WhatsApp later.

- **Reminders, booking confirmations and cancellations, service-due and insurance notices** already queue an email row and a separate WhatsApp row. Without WhatsApp keys the WhatsApp row is recorded as `skipped` (System health shows the count) and the email goes out.
- **A consultant's reply to a lead** uses one switch, `NOTIFY_CHANNEL` (`src/server/services/channels.ts`):
  - `auto` (default): email until `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID` are both set, then WhatsApp.
  - `email`: always email, even with keys (handy while WhatsApp templates are in review).
  - `whatsapp`: always WhatsApp.
  A reply by email goes to the lead's real email address. If the lead has none, nothing is sent and the lead stays `new` with the SLA timer running; the editor says "No email on file for this lead".
- **To switch to WhatsApp:** add `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID` (and `WHATSAPP_TEMPLATES` once templates are approved) in Vercel and redeploy. Nothing else changes.

