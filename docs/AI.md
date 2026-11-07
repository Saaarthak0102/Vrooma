# VROOMA — AI ARCHITECTURE & SAFETY GUARDRAILS

## 1. AI Capabilities Overview

Vrooma integrates generative AI to solve dealership operational bottlenecks while keeping human staff strictly in the loop:

| Capability | Target User | Input Data | Generated Output | Guardrails & Policy |
|---|---|---|---|---|
| **1. Buyer Summarizer** | Sales Consultant | Lead form text, requested variant, trade-in data, source. | 3-bullet executive briefing: buyer intent, timeline, and budget fit. | Read-only summary for internal staff preparation. |
| **2. First-Reply Copilot** | Sales Consultant | Buyer summary, customer name, requested model, showroom. | Contextual greeting and invitation to showroom/drive. | **Zero Discount Policy.** Drafts must be reviewed and sent manually by consultant. |
| **3. Used Car Valuation Engine** | Used-Car Manager | Model, year, odometer (km), fuel type, inspection score. | Suggested resale band (e.g. ₹8.10L – ₹8.45L). | Visible **only** to Used-Car Manager. Never shown on public cards. |

---

## 2. Hard Safety Guardrails

### A. The Zero-Discount Enforcement Rule
Dealership profitability is severely compromised when automated drafts offer premature price cuts or match speculative internet discounts.
- **Rule:** AI first-reply drafts can NEVER quote discounts, cashbacks, or waivers.
- **Implementation:** Both the system prompt and the client-side draft editor enforce strict keyword rejection:
```typescript
const FORBIDDEN_WORDS = [
  "discount", "price cut", "special price", "off", "concession",
  "waiver", "छूट", "कम", "ऑफ़र"
];
```
If a consultant attempts to send a message containing any forbidden term, the submission is blocked with an alert: *"Dealership policy prohibits quoting unapproved discounts in initial replies."*

### B. Role Isolation for Used-Car Pricing
- The price recommendation is statistical, not a language model: a percentile band over adjusted past sales.
- **Rule:** The band is computed on the server by `getPriceBandAction` (`requireRole("manager", "admin")`) from past sales of the same model, within 2 years, adjusted for year and kilometres (`src/lib/price-band.ts`, `used_car_sales_history`). It is shown only on `/staff/stock` (stock drawer and trade-in drawer). With no comparable sale there is no band, and the screen says so. The sample size and confidence are shown, never invented.
- It is completely omitted from the public API payload (`/api/cars/search`) and public vehicle dossier.

---

## 3. "When AI Is Wrong" Protocol

| Situation | Safety Mechanism & Recovery Action |
|---|---|
| **AI drafts inaccurate specifications** | All drafts populate an editable `Textarea` in the staff inbox. The consultant can freely edit or discard the draft before clicking Send. |
| **AI suggests unrealistic used price** | The Used-Car Manager retains 100% pricing authority and manually types the final listing price. The suggestion is purely informational. |
| **AI assigns lead to wrong showroom** | The Lead Desk interface provides a 1-click `ReassignDialog` allowing consultants to re-route leads to another branch immediately. |
| **On-road pricing hallucination** | The AI model is strictly prohibited from computing on-road prices. All prices displayed to customers are calculated deterministically by `src/lib/price-engine.ts` using admin database rules. |

---

## 4. Audit Trail (`ai_logs`)

Every model call is written to `ai_logs` by `src/server/ai/log.ts` (service role; only managers can read it):

| Column | Meaning |
|---|---|
| `feature` | `chat`, `lead_summary`, `handoff_brief`, `lead_agent`, `digest`, `price_band_note` (migration `0035`) |
| `action` | Legacy audit key the admin AI panel counts on: `copilot_generated`, `reply_sent_unedited`, `reply_sent_edited` |
| `status` | `ok` (model output used), `fallback` (rule-based path), `blocked` (a guard rejected the output), `error` |
| `model`, `input_tokens`, `output_tokens`, `latency_ms` | Cost and speed per feature |
| `user_id`, `lead_id` | Who triggered it and which enquiry it concerns (`user_id` is set to null on erasure) |
| `input_hash` | SHA-256 of the input, for caching and de-duplication. The input text itself is not stored |
| `prompt` | A short, redacted description of the input. Never raw buyer text, phone, email or full registration number |
| `response` | The model output (or `[blocked: reason]` / `[error]` / `[timeout]` plus the rejected text, for QA) |

For reply drafts, `sendLeadReplyAction` writes `reply_sent_unedited` / `reply_sent_edited` with `prompt` = the AI draft and `response` = what the consultant sent, which is the edit diff shown at `/admin?tab=ai`.

---

## 5. Foundation (`src/server/ai/`)

Every AI feature is called through `runAi()` (`index.ts` -> `runner.ts`), so they all behave the same way:

| Situation | Behaviour |
|---|---|
| No `AI_PROVIDER_API_KEY` (or running under Vitest) | Rule-based fallback; no model call, nothing logged |
| Feature already made `AI_DAILY_CALL_CAP` model calls today (IST) | Rule-based fallback (`budget.ts`, cached one minute, fails open) |
| Model times out (fast 8 s, smart 20 s) or throws | Rule-based fallback, logged `error` |
| Output rejected by `guard` | Rule-based fallback, logged `blocked` |
| Otherwise | Model output, logged `ok` with tokens and latency |

`guard.ts` holds the pure guards, covered by `tests/ai-guard.test.ts` and `tests/ai-runner.test.ts`:
- **Discount filter** (`findForbiddenDiscountWord`).
- **Registration numbers**: a full Indian registration number in model output is rejected (masked `UP32 ** **** 1234` is fine).
- **Grounding**: every rupee amount in buyer-facing text must appear in a tool result (price engine, EMI calculator, catalog). `groundingSources: []` forbids any amount, which is how first-reply drafts are checked.
- **Prompt injection**: `looksLikePromptInjection` short-circuits to the fallback; `wrapUntrusted` fences buyer text so it is treated as data; `sanitizeUserText` strips control characters.

Models: `AI_MODEL_FAST` (default `claude-haiku-5-5`: chatbot, extraction, digests) and `AI_MODEL_SMART` (default `claude-sonnet-5-5`: lead summaries, replies, the Lead Desk Agent). Buyer free text sent to the model is a third-party processing step: see the ADR in `docs/DECISIONS.md`.
