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

Every AI prompt and completion is logged to the `ai_logs` table for compliance and QA:
- `lead_id`: The referenced customer enquiry.
- `action_type`: `'summary'`, `'reply_draft'`, or `'price_estimate'`.
- `prompt`: The rendered system prompt and user context.
- `raw_completion`: The verbatim response received from the LLM.
- `edited_completion`: The final text edited and approved by the consultant.
- `user_id`: The staff member responsible for transmission.
- `created_at`: Timestamp.

