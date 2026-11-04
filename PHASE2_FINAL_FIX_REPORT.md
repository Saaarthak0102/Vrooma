# VROOMA — PHASE 2 FINAL BLOCKER FIX REPORT

> **Document Ref:** PHASE2-FINAL-FIX-REPORT-01  
> **Date:** November 2026  
> **Auditor & Remediation Role:** Principal Backend Architect, PostgreSQL Security Specialist, Supabase Platform Auditor  
> **Target DEV Project:** `eobtzcwinjmimzisypca`  
> **Production Project:** `ajumkjokagqfdikfguti` (STRICTLY PRESERVED & UNTOUCHED)  
> **Execution Status:** IMPLEMENTED & LOCALLY VALIDATED  
> **Remote Database Impact:** **NONE (ZERO REMOTE DATABASE INTERACTIONS)**

---

## 1. EXACT FILES CHANGED

The following files were modified to resolve the final high-severity blocker findings identified in `FINAL_BLOCKER_VERIFICATION.md`:

| # | File Path | Nature of Change |
| :--- | :--- | :--- |
| 1 | `scripts/db-push.mjs` | Replaced deprecated `--linked` flag with explicit `--remote=${EXPECTED_DEV_PROJECT_REF}` and retained `--include-all`. Added `buildPushArgs` export with fail-closed non-DEV project rejection. |
| 2 | `tests/db-push.test.ts` | Added unit tests verifying exact argument generation (`--remote=eobtzcwinjmimzisypca --include-all`), verified omission of `--linked`, and added negative tests ensuring attempt to build args for production (`ajumkjokagqfdikfguti`) or legacy DEV (`gmyrehlrmifxckszrdje`) throws. |
| 3 | `supabase/migrations/0013_storage.sql` | Removed broad staff access from `"Users manage own trade in photos"`. Split into two distinct policies: (1) customer-only full management on own folder (`<user_id>/...`), and (2) staff read-only viewing (`FOR SELECT` using `private.is_staff()`). |
| 4 | `tests/rls-matrix.test.ts` | Added automated static verification tests ensuring customer folder isolation, confirming absence of `private.is_staff()` in customer management policy, and verifying staff is strictly confined to `FOR SELECT` on `trade-in-photos`. |

---

## 2. MIGRATION RUNNER ARGUMENTS (BEFORE / AFTER)

### Before:
```javascript
// scripts/db-push.mjs (Prior Implementation)
const pushArgs = ["supabase", "db", "push", "--linked"];
```
- **CLI v3.0.0 Behavior:** Emitted `Warning: --linked is deprecated and will be removed in v4. Use --remote instead`. Relied implicitly on ambient link state in `supabase/.temp/project-ref`.

### After:
```javascript
// scripts/db-push.mjs (Remediated Implementation)
export function buildPushArgs(projectRef = EXPECTED_DEV_PROJECT_REF) {
  if (FORBIDDEN_PROJECT_REFS.has(projectRef) || projectRef !== EXPECTED_DEV_PROJECT_REF) {
    throw new Error(`BLOCKED: Cannot construct push arguments for non-DEV project '${projectRef}'.`);
  }
  return ["supabase", "db", "push", `--remote=${projectRef}`, "--include-all"];
}

// In runPush():
const pushArgs = buildPushArgs(result.expectedRef);
console.log(`Executing: ${cmd} ${pushArgs.join(" ")}`);
```
- **CLI v3.0.0 Behavior:** Explicitly targets project `eobtzcwinjmimzisypca` using the canonical `--remote=<ref>` syntax. Eliminates deprecation warnings. Enforces `--include-all` to ensure all 13 migration files are applied cleanly against the remote database.

---

## 3. FINAL TRADE-IN STORAGE POLICY BEHAVIOR

### 3.1 SQL Policy Definition in `0013_storage.sql`

```sql
-- Trade-In Photos: Users manage files only within their own folder (<user_id>/...); Authorized staff can view
DROP POLICY IF EXISTS "Users manage own trade in photos" ON storage.objects;
CREATE POLICY "Users manage own trade in photos"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'trade-in-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'trade-in-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Staff view trade in photos" ON storage.objects;
CREATE POLICY "Staff view trade in photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'trade-in-photos'
    AND private.is_staff()
  );
```

### 3.2 Confirmation of Old Broad Policy Removal

- **Old Defective Policy:**  
  Previously, `"Users manage own trade in photos"` contained `OR private.is_staff()` in its `USING` clause. Because PostgreSQL RLS evaluates `USING` exclusively on `DELETE` statements, any authenticated staff member could delete customer trade-in photos.
- **Remediation & Confirmation:**  
  1. `DROP POLICY IF EXISTS "Users manage own trade in photos" ON storage.objects;` explicitly drops the old policy.
  2. The recreated `"Users manage own trade in photos"` contains **zero references** to `private.is_staff()`. Both `USING` and `WITH CHECK` are strictly bound to `(storage.foldername(name))[1] = auth.uid()::text`.
  3. `DROP POLICY IF EXISTS "Staff view trade in photos" ON storage.objects;` ensures idempotency.
  4. The newly introduced `"Staff view trade in photos"` is created strictly **`FOR SELECT`**.

### 3.3 Operation-by-Operation Access Control Matrix

| Operation | Authenticated Customer (Owner) | Authenticated Customer (Non-Owner) | Sales Consultant | Used-Car Manager | Dealership Admin | Unauthenticated (Anon) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **SELECT** | ALLOWED (own folder) | DENIED | ALLOWED (view) | ALLOWED (view) | ALLOWED (view) | DENIED |
| **INSERT** | ALLOWED (own folder) | DENIED | DENIED | DENIED | DENIED | DENIED |
| **UPDATE** | ALLOWED (own folder) | DENIED | DENIED | DENIED | DENIED | DENIED |
| **DELETE** | ALLOWED (own folder) | DENIED | **DENIED** | **DENIED** | **DENIED** | DENIED |

*Note on Manager & Admin Erasure:* Customer personal data deletion requests under DPDP Act 2023 are executed server-side via Supabase Admin / Service Role credentials (which bypass RLS), preserving client-side data immutability.

---

## 4. LOCAL VALIDATION TEST RESULTS

Every required local test and verification command was executed:

| Verification Command | Scope / Target Evaluated | Exit Code | Result Summary |
| :--- | :--- | :---: | :--- |
| `pnpm exec vitest run tests/db-push.test.ts` | Guarded db-push runner & argument generator | **0** | **13/13 tests passed** (including target generation and forbidden ref rejection) |
| `pnpm exec vitest run tests/rls-matrix.test.ts` | RLS matrix & storage security policy static tests | **0** | **10/10 tests passed** (confirms folder isolation & zero staff delete/update) |
| `pnpm exec vitest run --no-file-parallelism` | Complete Vitest test suite (20 test suites) | **0** | **153/153 tests passed** |
| `pnpm typecheck` (`tsc --noEmit`) | TypeScript compilation across complete project | **0** | **Clean (0 errors)** |
| `pnpm lint` (`next lint`) | Next.js ESLint static analysis | **0** | **Clean (0 warnings, 0 errors)** |
| `pnpm db:lint` | Migration sequence, transaction bounds, table RLS, privacy | **0** | **Clean (13 migrations valid, 35 tables protected, 0 errors)** |
| `git diff --check` | Whitespace, formatting, conflict markers | **0** | **Clean (0 formatting/whitespace errors)** |

---

## 5. REMAINING OPERATIONAL CONCERNS & DEPLOYMENT PROTOCOL

While the code and SQL migration files are now completely remediated, the deploying engineer must observe the following operational protocol when migrating to DEV project `eobtzcwinjmimzisypca`:

1. **Supabase CLI Authentication Requirement:**  
   `supabase db push` against a remote project requires valid authentication. The operator must either run `supabase login` or export `SUPABASE_ACCESS_TOKEN` in their shell before running `pnpm db:push --yes`.
2. **Deterministic 4-Phase Seed Sequence:**  
   Because `supabase db push` intentionally does not execute seed files, the operator must execute the validated sequence:
   - **Step 1:** Run `SUPABASE_PROJECT_REF=eobtzcwinjmimzisypca pnpm db:push --yes` (Applies DDL 0001–0013).
   - **Step 2:** Apply `supabase/seed.sql` via Supabase Dashboard SQL Editor (Seeds cities, showrooms, workshops, models, variants, and price rules).
   - **Step 3:** Run `node --experimental-strip-types scripts/seed-dev-users.ts` (Provisions dev Auth users, profiles, and links `staff_showrooms`).
   - **Step 4:** Re-apply Section 9 of `supabase/seed.sql` (Populates consultant routing rules now that profiles exist).
3. **Database Types Regeneration:**  
   Following migration and seeding, run `pnpm db:types` to regenerate `src/types/db.ts` from the live remote schema.

---

## 6. EXPLICIT STATEMENT OF REMOTE ENVIRONMENT ISOLATION

- **Production Project Reference (`ajumkjokagqfdikfguti`):** **ZERO remote operations were executed. Untouched and completely preserved.**
- **Development Project Reference (`eobtzcwinjmimzisypca`):** **ZERO remote operations were executed. No remote DDL, no migrations, no seed data, and no SQL commands were dispatched.**
- **Local Isolation:** All verification was conducted via static analysis, TypeScript compiler, ESLint, and local Vitest test runners in Standard Sandbox Mode.

---

## 7. ACCEPTANCE STATUS

**Phase 2 is NOT YET formally accepted.**  
Formal acceptance of Phase 2 is strictly contingent upon:
1. Successful remote deployment of migrations 0001–0013 to the live DEV project `eobtzcwinjmimzisypca`.
2. Execution of the complete seed sequence and verification of catalog data in the remote database.
3. Live PostgreSQL verification of Row-Level Security policies and RPC functions against authenticated sessions on the live DEV instance.

