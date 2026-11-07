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
   - Push to DEV project:
     ```bash
     SUPABASE_PROJECT_REF=eobtzcwinjmimzisypca pnpm db:push --yes
     ```
   - Run all automated regression tests:
     ```bash
     pnpm test
     pnpm rls:test
     ```
   - Run the API security probe:
     ```bash
     pnpm probe
     ```

3. **Step 3: Guarded Production Push:**
   - Production migrations must pass through the guarded runner with `--target prod`, the safety flag `--i-am-targeting-production`, and operator ref verification:
     ```bash
     pnpm db:push --target prod --i-am-targeting-production
     ```
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

