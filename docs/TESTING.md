# VROOMA — TESTING

## 1. Philosophy
Money, dates, privacy and AI-safety rules live in pure functions with unit tests. Everything else is tested against hermetic fakes (in-memory file system, mock spawner, mocked Supabase) so `pnpm test` needs no network and never touches a real project.

## 2. Tiers
1. **`pnpm test`** (Vitest 3): 90 files, 1,033 tests, a few seconds. This is the gate before every commit and in CI.
2. **Quality gate scripts**: `pnpm typecheck`, `pnpm lint`, `pnpm db:lint` (migrations start `BEGIN;` and end `COMMIT;`), `pnpm check:wiring`, `pnpm check:buttons`, `pnpm check:env`, `pnpm build` (63 pages).
3. **Browser and database checks against the DEV project only** (they refuse to run unless the target is localhost and `.env.local` holds DEV values): `pnpm e2e:console`, `pnpm charts:console`, `pnpm layout:console`, `pnpm smoke` (against a running production build), `pnpm rls:test`.
4. **Live AI check**: `pnpm ai:smoke` tries models and prints a verdict (needs a key).

Production is never a test target.

## 3. What the unit tests cover (by area)
| Area | Files (in `tests/`) | Invariants |
|---|---|---|
| Money, price, EMI | `money`, `price-engine`, `pricing-scope`, `emi` | Indian grouping; full on-road breakup, TCS above ₹10 lakh, validity date; EMI formula and amortisation sums to principal, 0% case |
| Privacy | `masking`, `privacy-dpdp`, `retention` | `UP32 ** **** 1234`; consent ledger, export, erasure; retention periods |
| SLA, bookings, leads | `sla`, `booking-ref`, `booking-engine`, `leads-lifecycle`, `lead-deduplication`, `csv-import` | 5-minute states; no double booking; routing; CSV formula-injection safe |
| Discount and AI safety | `discount-rules`, AI guard/chat/agent/digest tests | Discount and price-promise wording blocked (executable twin of `docs/backend/DISCOUNT_RULES.md`) |
| Channels and automations | `reply-channel`, outbox, automation tests | Email default, WhatsApp by switch, demo addresses skipped, consent at send time |
| Console | `grid`, `analytics`, `price-band`, `inspection-score`, `console-structure`, `post-sign-in` | Grid sort/filter/export; chart aggregation by IST day; at most 3 screens per role; where each role lands |
| Schema and tooling | `types-match-schema`, `trade-in-columns`, `db-push` (67), `demo-migration`, `demo-login`, `demo-personas`, `docs-links` | Types match columns; runner is fail-closed; demo migration is idempotent; demo login 404 unless enabled; every doc path referenced exists |
| Security | `rls-matrix` | RLS on every table, column privileges |

## 4. Browser checks (DEV only)
```bash
pnpm dev                 # terminal 1
pnpm e2e:console         # 42 checks: each action in a browser, asserted in the database, then cleaned up
pnpm charts:console      # chart clicks must equal direct Supabase counts
pnpm layout:console      # every console screen at 8 viewports: overflow, drawers, scroll, 40px targets
node scripts/console-snap.mjs --out=DIR [--viewport=390x844]
```
They sign in with the seeded dev users (`scripts/seed-dev-users.ts`). Not covered: attended/no-show, reassign, brand-new invite emails (sends real email), WhatsApp delivery (simulated).

## 5. Frontend verification (every UI change)
Check 360×740, 390×844, 768×1024, 1024×768, 1280×720, 1536×864, 1920×1080, landscape phone 667×375, touch (no hover), `prefers-reduced-motion`, 200% zoom. Hover effects use `@media (hover:hover) and (pointer:fine)`.

## 6. CI (`.github/workflows/ci.yml`)
Stage 1 on every push and PR: typecheck, lint, `check:buttons`, `check:wiring`, `vitest run`, `next build`. Stage 2 on `main` or manual: integration against the DEV project with `SUPABASE_DEV_*` secrets.
