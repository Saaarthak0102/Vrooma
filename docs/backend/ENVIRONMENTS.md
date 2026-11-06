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

