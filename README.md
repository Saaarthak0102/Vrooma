# Vrooma — Luxury Car Dealership Platform

> **Authorised Dealer for Brand X (Lucknow & Kanpur)**
> 3 Showrooms · 2 Service Workshops · 1 Certified Pre-Owned Yard · 340 Staff · ₹550–650 Cr Annual Turnover.

Vrooma transforms the traditional car buying and servicing experience by replacing sluggish Excel tracking and phone-only bookings with real-time on-road pricing, self-service test drive & workshop bay scheduling, an auto-assigned lead desk with 5-minute SLA countdown timers, and an executive revenue leakage monitor recovering **₹2.11 crore** in annual lost opportunities.

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js:** `v20.0.0` or higher (recommended: Node 22+)
- **Package Manager:** `pnpm` (`v9.0.0` or higher)

### 2. Installation
```bash
# Clone repository and enter directory
git clone https://github.com/vrooma/vrooma.git
cd vrooma

# Install dependencies
pnpm install
```

### 3. Environment Setup
Copy the environment template:
```bash
cp .env.example .env.local
```

By default, the application runs in **Mock Mode** (`NEXT_PUBLIC_USE_MOCK=true`), allowing full frontend exploration, filtering, test-drive booking, staff lead management, and admin simulation completely offline without requiring an active Supabase database.

### 4. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🛠️ Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `pnpm dev` | Starts Next.js development server on port 3000 |
| `build` | `pnpm build` | Compiles production application bundle |
| `start` | `pnpm start` | Boots production server |
| `typecheck` | `pnpm typecheck` | Validates TypeScript types across the entire project (`tsc --noEmit`) |
| `lint` | `pnpm lint` | Runs Next.js ESLint verification |
| `test` | `pnpm test` | Runs unit tests (Vitest) for pricing, EMI, SLA, and DPDP masking |
| `check:wiring` | `pnpm check:wiring` | Audits all placeholder buttons and verifies dead-button compliance |
| `format` | `pnpm format` | Formats code with Prettier |

---

## 🧭 Interactive Demo Walkthrough

### 👤 Role 1: Car Buyer (Public & Self-Service)
1. **Explore Vehicle Catalog:** Visit `/cars` and filter by budget, fuel type, and transmission.
2. **Dynamic On-Road Price:** Click on **Model H** (`/cars/model-h`). Switch variants to observe real-time spec and ex-showroom price updates. Click **Calculate On-Road Price** to view the itemized RTO, insurance, handling, accessories, and TCS breakdown for Lucknow RTO.
3. **Certified Used Car Dossier:** Visit `/used-cars` to browse certified inventory with masked plates (`UP32 ** **** 1234`). Click on **Model C VX** (`/used-cars/uc-1182`) to view the 140-point inspection scorecard.
4. **Self-Service Test Drive:** Click **Book Test Drive** (`/book/test-drive`). Pick a showroom (Hazratganj), demo car, date, and live time slot. Enter driver details with explicit DPDP consent to receive an instant booking confirmation.
5. **Loan EMI Calculator:** Visit `/emi-calculator` to adjust loan amount, tenure, and interest rate sliders, viewing real-time monthly installments and the complete amortisation schedule.

### 💼 Role 2: Sales Consultant (Staff Lead Desk)
1. **Switch Role:** Click the **Sign In** button in the header and select **Sales Consultant (Vikram Malhotra)**.
2. **Lead Desk & 5-Minute SLA:** Navigate to `/staff/leads`. Observe the color-coded SLA countdown clocks tracking incoming leads to meet the 5-minute response target.
3. **AI Buyer Briefing & Guarded First Reply:** Open a lead (`/staff/leads/lead-1`). Read the 3-bullet AI buyer summary. Inspect the AI-generated first reply. Notice that if you attempt to insert forbidden discount words (`discount`, `छूट`), the editor alerts and blocks transmission.
4. **CSV Lead Importer:** Visit `/staff/leads/import` to upload portal leads (`scripts/seed-csv-sample.csv`) with instant column mapping and duplicate phone detection.

### 🔍 Role 3: Used-Car Manager
1. **Switch Role:** Select **Used-Car Manager (Rajesh Verma)** from the sign-in modal.
2. **Valuation Engine:** Open `/admin/used-cars`. Observe the AI-suggested market valuation band (e.g. ₹8.10L – ₹8.45L) calculated from historical transactions, visible **exclusively** to the manager.

### 🏢 Role 4: Dealer Principal (Admin Executive)
1. **Switch Role:** Select **Dealer Principal / Admin (Sunil Agarwal)**.
2. **₹2.11 Crore Revenue Leakage Monitor:** Visit `/admin` to inspect real-time leakage analytics:
   - ₹1.62 Cr lost to slow lead responses (>24h).
   - ₹48.6 Lakh lost to dropped service phone calls.
3. **Live Price Rules CMS:** Visit `/admin/prices` to adjust Lucknow or Kanpur RTO percentages and observe the live pricing simulator react in real time.

---

## 📐 Architecture & Standards

- **Source of Truth:** Full architectural specification and golden rules are maintained in [`context.md`](./context.md).
- **Zero Dead Buttons:** Strict dead-button policy enforced via `notWired()` helper and audited in [`docs/WIRING.md`](./docs/WIRING.md).
- **DPDP Act 2023 Compliance:** Vehicle registration numbers masked on public views, explicit consent checkboxes, and customer data erasure endpoints (`/api/me/delete`).
- **Bilingual Support:** Full English and authentic Hindi (`hi`) translations supported across all views via `next-intl`.
- **Pure Arithmetic Engines:** Financial algorithms (road tax, EMI amortisation, SLA timers) are isolated in pure functions with 100% test coverage.

---

## 📄 Documentation Directory

- [`docs/BRIEF.md`](./docs/BRIEF.md) — Verbatim client brief and specifications
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — System layers and mock-to-Supabase swap
- [`docs/ROUTES.md`](./docs/ROUTES.md) — Comprehensive application route table
- [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) — PostgreSQL schema, enums, and tables
- [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) — Design tokens, typography, and styling rules
- [`docs/MOTION.md`](./docs/MOTION.md) — Micro-interaction limits and Phase 2 landing scenes
- [`docs/GATING.md`](./docs/GATING.md) — Access control and progressive gating matrix
- [`docs/AI.md`](./docs/AI.md) — AI copilot architecture and zero-discount guardrails
- [`docs/DPDP.md`](./docs/DPDP.md) — Privacy compliance, masking, and data erasure
- [`docs/SEO.md`](./docs/SEO.md) — Indexable URLs and Schema.org JSON-LD
- [`docs/PERFORMANCE.md`](./docs/PERFORMANCE.md) — Sub-2.5s 4G optimization budgets
- [`docs/TESTING.md`](./docs/TESTING.md) — Vitest test suites and coverage
- [`docs/WIRING.md`](./docs/WIRING.md) — Placeholder button registry and audit
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — Architectural Decision Records (ADRs)
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — 5-day implementation roadmap

---

## ⚖️ License
Proprietary — Internal Dealership Platform for Vrooma Brand X.

