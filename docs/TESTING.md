# VROOMA — TESTING STRATEGY & SUITE OVERVIEW

## 1. Testing Philosophy

Automotive retail applications fail when financial calculations drift or regulatory compliance (DPDP) is compromised. Vrooma isolates pure domain logic into zero-dependency pure functions and enforces 100% test coverage on all mathematical and compliance routines.

---

## 2. Test Runner: Vitest

We use **Vitest 3** for ultra-fast, native ESM execution with zero compile overhead.

### Running Tests
```bash
# Run all unit test suites
pnpm test

# Run tests in watch mode
pnpm vitest

# Generate test coverage report
pnpm vitest run --coverage
```

---

## 3. Core Test Suites

### A. Money Formatting & Parsing (`tests/money.test.ts`)
- Tests Indian numbering grouping: `formatINR(1245000)` produces `₹12,45,000`.
- Tests lakh notation: `formatLakh(1245000)` produces `₹12.45 L`.
- Verifies edge cases: zero, negative amounts, and string parsing.

### B. Dynamic On-Road Price Engine (`tests/price-engine.test.ts`)
- Verifies complete itemized calculation against Lucknow RTO rules.
- Tests TCS condition: 1% tax collected at source on vehicles with ex-showroom $\ge ₹10,00,000$, and ₹0 TCS below ₹10 Lakh.
- Tests date validity enforcement (rejects expired pricing rules).
- Tests optional accessories package toggling.

### C. Loan EMI & Amortisation Math (`tests/emi.test.ts`)
- Standard automotive reducing-balance EMI formula: $E = P \cdot r \cdot \frac{(1+r)^n}{(1+r)^n - 1}$.
- Tests 0% promotional interest scheme edge case (straight division without division by zero).
- Verifies that the sum of principal payments in the amortisation schedule exactly equals the original loan amount.

### D. DPDP Data Masking (`tests/masking.test.ts`)
- Verifies registration number masking across variations: `UP32 AB 1234` → `UP32 ** **** 1234`.
- Tests phone number privacy masking: `+91 98765 43210` → `+91 98765 *****`.

### E. SLA Countdown & State Machine (`tests/sla.test.ts`)
- Evaluates lead response time countdowns against the 5-minute target.
- Tests state transitions: `ok` ($\ge 2$ min remaining), `warning` ($< 2$ min remaining), `breached` ($< 0$ min remaining), and `met` (contacted before deadline).

