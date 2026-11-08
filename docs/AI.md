# VROOMA — AI ARCHITECTURE & SAFETY GUARDRAILS

## 1. AI Capabilities Overview

Vrooma integrates generative AI to solve dealership operational bottlenecks while keeping human staff strictly in the loop:

| Capability | Target User | Input Data | Generated Output | Guardrails & Policy |
|---|---|---|---|---|
| **1. Buyer Summarizer + profile** | Sales Consultant | Lead message, source, stage, last 15 timeline events, website-chat transcript, saved cars, bookings, showroom, consultant first name. | Summary (max 60 words), urgency, extracted budget / timeline / fuel / finance / trade-in, suggested next step (`leads.ai_summary`, `leads.ai_profile`). | Staff only. First name only goes to the model: no phone, email or registration number. May say "asked about a discount". |
| **2. First-Reply Copilot** | Sales Consultant | Same facts. | Under-60-word draft in `leads.ai_draft`, shown in the editable reply box. | **Zero Discount Policy.** No rupee amount at all, no registration number. Blocked drafts fall back to the rule-based draft. Consultant reviews and sends manually. |
| **3. Chat Handoff Brief** | Sales Consultant | The chat transcript at the moment the buyer asks for a person. | Summary and suggested reply in `chat_conversations.ai_context`. | Fast model, 5 s timeout (the buyer is waiting); falls back to the intent-label brief. |
| **4. Buyer Chatbot** | Visitors and buyers | The buyer's message, the last 9 turns, and read-only catalog tools (below). | A short plain-text answer plus the "solved or connect?" question. | Every rupee figure must come from a tool result, links only to our own pages, no discounts, no registration numbers. Falls back to the rule-based bot. |
| **5. Lead Desk Agent** | Sales Consultant | The lead facts (as in 1), open test-drive slots at the lead's showroom, consultant workload. | Up to 3 ranked proposals, one line of reasoning each: call now, draft a message, offer a slot, move the stage, reassign, add a follow-up, ask a manager. | Proposes only. A consultant presses Apply on each. See below. |
| **6. Daily Digest** | Consultant, Used-Car Manager, Dealer Principal | Plain database queries (leads, tasks, bookings, stock, calls, outbox). | One email at 08:30 IST: consultant queue and today's bookings; manager ageing stock (60+ days) and trade-ins; admin yesterday's 5-minute response rate, missed service calls and outbox health. An optional "Where to start" line from the fast model. | Numbers are never model-written; the note may only use numbers already in the digest. Nobody with nothing to act on is emailed (except the dealer principal). |
| **7. Price Band Note** | Used-Car Manager | The fixed output of `computePriceBand`. | Two sentences explaining how far to trust the band, under the band on the stock screen. | Manager and admin only. Cannot change the numbers, quote a figure that is not in the band, or recommend a price. |
| **8. Used Car Valuation Engine** | Used-Car Manager | Model, year, odometer (km), fuel type, inspection score. | Suggested resale band (e.g. ₹8.10L – ₹8.45L). | Visible **only** to Used-Car Manager. Never shown on public cards. |

### How the lead briefing is kept fresh (`ensureLeadCopilot`)
- Generated when a consultant first opens a lead, then rebuilt only when the facts changed (a hash of message, chat, events, bookings and stage in `leads.ai_input_hash`), and at most every 10 minutes. The Refresh button in the briefing card forces a rebuild, at most once per 30 seconds per lead.
- The reply draft is replaced only while nobody has contacted the buyer; after the first contact the draft is left alone.
- With AI off, capped, slow or blocked, the rule-based briefing fills **empty** fields only, so a model-written briefing is never overwritten by a weaker one. `leads.ai_profile.origin` says `ai` or `rules`; the card title drops "AI" for the latter.
- The profile columns (migration `0036`) are read separately from the main lead queries, so deploying before the migration is applied only hides the profile; it never breaks the Lead Desk.

### Lead Desk Agent (`src/server/ai/lead-agent.ts`, `src/lib/lead-agent.ts`)
- Opened from **Next steps** in the lead drawer ("Suggest next steps"; 10 runs a minute per person). Smart model with up to 6 tool steps.
- **It cannot act.** Its tools are two lookups (`get_open_slots`, `get_consultant_load`) and six `propose_*` tools that only record a suggestion after validating it against real data: a slot id must be one returned by `get_open_slots` (the label comes from our data), a consultant id must be real and not the current owner, **won and lost can never be proposed**, and a reply must pass the same strict guard as first-reply drafts (no discount, no rupee amount, no registration number, under 420 characters). Invalid proposals are returned to the model as errors so it can correct them. One per kind, three at most.
- **Approval is the consultant's click**, and each kind goes through an existing path: *reply* and *offer a slot* only fill the editable reply box (nothing is sent or booked); *move the stage* calls `updateLeadStatusAction`; *reassign* calls `reassignLeadAction`; *follow-up* creates a `lead_tasks` row; *ask a manager* creates a task and emails `ALERT_EMAIL`.
- A buyer asking for a discount is never answered by the agent: it proposes asking a manager.
- With AI off, capped, slow or blocked, deterministic suggestions of the same shape are shown, labelled "Rule-based".

### Digests, saved-car emails and the marketing gate
- `/api/cron/digests` (migration `0041`, 03:00 UTC = 08:30 IST) builds the digests above; re-running the same day adds nothing and skips the model call for anyone already queued.
- **Saved-car email** (`saved_car_nudge`): someone who saved a new car 7-14 days ago and has not enquired or booked since gets one email, only if they ticked marketing messages in their profile. Email only; 50 per run.
- **Marketing consent gate** (`src/server/automations/consent-gate.ts`): templates listed there are checked at *send* time by the outbox worker against the account's latest `marketing` consent. No account, no consent, or an unsubscribe since queuing means the row is marked `skipped` ("no marketing consent"). Add any new marketing template to that list.

### Follow-up automations (no model)
Part of `/api/cron/automations`, creating `lead_tasks` (migration `0040`) and an email to the lead's consultant: stage unchanged for 3-14 days with no timeline activity (alert mailbox told at 7+ days); a test drive marked attended 3-48 h ago ("follow up while it is fresh"); a test drive marked no-show in the last 48 h ("offer to rebook"). Only leads that are still open; 50 per run; keys make re-runs add nothing.

### Buyer chatbot (`src/server/ai/chat-answer.ts`, `chat-tools.ts`)
- Fast model with up to 4 tool steps. The existing flow is unchanged: handoff, "solved" and greetings never reach the model, and every answer still ends with the closing question and the two quick replies.
- **Tools (read-only):** `search_new_cars`, `get_model_details`, `search_used_cars`, `calculate_emi` (the site's EMI calculator; assumes 9.5% and says so when the buyer gives no rate), `list_offers`, `list_open_slots`, `list_locations`, and, for a signed-in buyer only, `my_bookings` (user id comes from the session, never from the model).
- **Deliberately not offered:** on-road prices (the breakup stays behind the lead gate; the bot gives ex-showroom and points to the model page), inspection reports, valuations, lead data, anything that writes.
- **Guards on the answer:** discount filter, no registration number, rupee amounts must appear in a tool result (`12.45 lakh` is accepted for `₹12,45,000`, `12 lakh` is not), links only to site sections in `SITE_PATH_PREFIXES` (any URL or invented path is rejected), 900 characters max. Any failure uses the rule-based answer instead. Prompt-injection phrases skip the model entirely.
- The widget turns allowed page paths in bot messages into real links (`ChatText.tsx`).

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

## 4b. Date-driven triggers (no model involved)

`/api/cron/automations` (every 5 minutes, migration `0037`) runs the rules in `src/server/automations/`. They only queue messages; the outbox job sends them. Each message has an idempotency key, so re-runs never duplicate. The service-due and expiry reminders are gated on the owner's latest `service_contact` consent (the unticked "Send me service and insurance reminders" box under My cars; unticking appends a granted=false event and the next run stops). Marketing-type templates are additionally gated at send time (see "Digests, saved-car emails and the marketing gate").

| Rule | When | Goes to |
|---|---|---|
| Test drive / service reminder | 24 h and 3 h before the slot (skipped if booked inside that window) | Buyer: email + WhatsApp |
| Booking outcome needed | Slot ended 1-24 h ago, still `confirmed`; at most 50 per run, oldest first | Lead's consultant, else `ALERT_EMAIL` |
| Lead uncontacted | New lead, no contact after 15 min (only leads 15-60 min old are escalated, so enabling the rule never mails about a backlog) | Consultant + `ALERT_EMAIL` |
| Chat unanswered | Handoff with no staff reply after 10 min (up to 60 min old) | Consultant + `ALERT_EMAIL` |
| Service due (opt-in) | Latest service record's next due date is 14 and 3 days away | Owner with the `service_contact` consent ticked: email + WhatsApp |
| Insurance / PUC / warranty ending (opt-in) | 30 and 7 days before the date on the car | Same owners |
| Price rule expiring | Ended in the last 30 days or ends within 7, with no successor for the same city/model/variant/fuel | `ALERT_EMAIL` |
| Offer ending | Within 3 days | `ALERT_EMAIL` |
| DPDP request due | Within 5 days of the 30-day deadline | `ALERT_EMAIL` |

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

**Provider and models.** `AI_PROVIDER` is `google` (Gemini, works with a free AI Studio key; the default) or `anthropic` (Claude). `AI_MODEL_FAST` (chatbot, handoff brief, digest note, price-band note) and `AI_MODEL_SMART` (lead briefing, Lead Desk Agent) override the provider defaults; run `pnpm ai:smoke` to see which models a key can call and to test plain text, structured output and a tool call on each. Model names and free-tier access change, so the defaults are only a starting point.

**Small quotas (free keys).**
- A 429 / `RESOURCE_EXHAUSTED` from the API pauses model calls for the time the API asks (default 60 s); features answer from their rule-based path meanwhile and the audit log records `fallback` with `[rate_limited]` (it does not count against `AI_DAILY_CALL_CAP`).
- `AI_MAX_RPM` is an optional ceiling on model calls per minute; set it a little under the key's limit. Calls fail fast (no hidden SDK retries).
- A buyer-chat turn can make several requests (one per tool step): `AI_CHAT_MAX_STEPS` (default 3) limits that.
- `AI_DAILY_CALL_CAP` is per feature; keep the sum under the key's daily limit.

**Personal data and the provider.** Every buyer- or staff-typed text is passed through `redactPii()` before it reaches a model: phone numbers, emails, vehicle registration numbers, PAN and Aadhaar-style numbers become `[phone]`, `[email]`, `[reg]`, `[id]`. The model gets the buyer's first name and what they asked for. On Google's free tier the provider may use prompts to improve its services and reviewers may read them; the privacy page (section 6) and a line under the chat box say so. Removing `AI_PROVIDER_API_KEY` switches every feature back to rule-based answers at once.
