# DISCOUNT RULES: what the reply filter blocks and allows

**Policy (from the brief):** drafts and replies must never quote discounts. Pricing adjustments are set by the Dealer Principal or Used-Car Manager only. The hard-blocked words are `discount`, `price cut`, `off`, `waiver`, and Hindi `छूट`, `कम`.

**One function, used everywhere:** `findForbiddenDiscountWord(text)` in `src/lib/validation/discount.ts`.
- The editor warning (`src/components/staff/ReplyDraftEditor.tsx`) calls it live while the consultant types.
- The server action `sendLeadReplyAction` (`src/server/actions/leads.ts`) calls the **same function** again before anything is queued, so a modified browser cannot skip the check.
- `tests/discount-rules.test.ts` asserts both files import it from this module and that neither re-implements the check.

It returns the offending fragment (blocked) or `null` (allowed). `containsForbiddenDiscountWords` is a thin boolean wrapper over it.

## 1. Exact patterns

English (case-insensitive, word boundaries):

| Pattern | Catches |
|---|---|
| `/\bdiscounts?\b/i` | discount, discounts |
| `/\bprice\s+cuts?\b/i` | price cut, price cuts |
| `/\bwaivers?\b/i` | waiver, waivers |
| `/\bcashbacks?\b/i` | cashback |
| `/\bfree\s+of\s+charge\b/i` | free of charge |
| `/\b(?:percent\|%)\s+off\b/i` | "percent off", "% off" |
| `/\b\d+\s*%\s*(?:off\|discount)\b/i` | 10% off, 15% discount |
| `/\b(?:\d+\|rs\.?\|inr\|₹)\s*(?:%\|\s*)\s*off\b/i` | 5000 off, Rs 5000 off |
| `/\b(?:special\|cash\|flat\|corporate)\s+discount\b/i` | special / cash / flat / corporate discount |
| `/\boff\b/i` (standalone) | the bare word "off", **except** the service phrases below |

Standalone "off" is allowed only inside: `drop off`, `drop-off`, `pick and drop`, `turn off`, `switched off`. Words that merely contain the letters (office, offer, offering, coffee) never match because of the word boundary.

Hindi (Devanagari-aware boundaries, so a Devanagari letter on either side stops a match):

| Pattern | Catches |
|---|---|
| `(?<!\p{Script=Devanagari})(?:छूट\|डिस्काउंट\|डिस्काउन्ट)(?!\p{Script=Devanagari})` | छूट, डिस्काउंट, डिस्काउन्ट |
| `(?<!\p{Script=Devanagari})(?<!से\s+)कम(?!\s+(?:समय\|से\s+कम))(?!\p{Script=Devanagari})` | the word कम, **except** "कम समय" and "कम से कम" / "से कम" |
| `\d+\s*%\s*(?:छूट\|कम)` | 5% छूट, 5% कम |

## 2. Sentence table (39 sentences, executable in `tests/discount-rules.test.ts`)

| # | Sentence | Result | Note |
|---|---|---|---|
| 1 | कम कीमत में | **BLOCKED** |  |
| 2 | कम दाम | **BLOCKED** |  |
| 3 | छूट मिलेगी | **BLOCKED** |  |
| 4 | डिस्काउंट | **BLOCKED** |  |
| 5 | डिस्काउन्ट मिल जाएगा | **BLOCKED** |  |
| 6 | इस कार पर 5% छूट है | **BLOCKED** |  |
| 7 | हम दाम कम कर देंगे | **BLOCKED** |  |
| 8 | आपको छूट नहीं मिलेगी | **BLOCKED** | mentions the word while refusing: over-blocked by design |
| 9 | कम ब्याज दर पर लोन | **BLOCKED** | loan rate, not car price: over-blocked by design |
| 10 | कम समय में | allowed |  |
| 11 | कम से कम दो दिन | allowed |  |
| 12 | गाड़ी कम समय में तैयार हो जाएगी | allowed |  |
| 13 | 5 साल से कम पुरानी गाड़ी | allowed |  |
| 14 | कमल नगर शोरूम | allowed | word boundary: कमल is a different word |
| 15 | आपकी टेस्ट ड्राइव कल सुबह 11 बजे बुक है | allowed |  |
| 16 | 10% off | **BLOCKED** |  |
| 17 | Flat 5% discount for you | **BLOCKED** |  |
| 18 | We can offer a discount on this car | **BLOCKED** |  |
| 19 | DISCOUNTS available | **BLOCKED** | case-insensitive |
| 20 | We cannot offer any discount | **BLOCKED** | mentions the word while refusing: over-blocked by design |
| 21 | This is a price cut of 50,000 | **BLOCKED** |  |
| 22 | Price cuts this week | **BLOCKED** |  |
| 23 | Registration fee waiver available | **BLOCKED** |  |
| 24 | Get cashback of 10,000 on delivery | **BLOCKED** |  |
| 25 | Take 20 percent off | **BLOCKED** |  |
| 26 | Rs 5000 off on accessories | **BLOCKED** |  |
| 27 | Free of charge handling package | **BLOCKED** |  |
| 28 | Please switch off the engine | **BLOCKED** | bare word `off` is hard-blocked per the brief; rephrase |
| 29 | Our showroom is off Kanpur Road | **BLOCKED** | address use of `off` is blocked by design; write 'near Kanpur Road' |
| 30 | Our office opens at 9 | allowed |  |
| 31 | Namaste Aditya, your test drive is confirmed for tomorrow 11 AM. | allowed |  |
| 32 | Would you like tea or coffee during your showroom tour? | allowed |  |
| 33 | We are offering exclusive colour choices for Model H. | allowed |  |
| 34 | Please bring your driving licence for the test drive | allowed |  |
| 35 | EMI starts at 18,500 per month | allowed |  |
| 36 | Please drop off the car at 10 am | allowed | explicit service exception |
| 37 | Pick and drop is available for service | allowed | explicit service exception |
| 38 | special offer on accessories | allowed | OWNER DECISION: allowed. The rule is about quoting a discount; 'offer' is a normal word. Flagged in DISCOUNT_RULES.md |
| 39 | A free test drive is available | allowed | only 'free of charge' is blocked, plain 'free' is not |

## 3. Decisions the owner should confirm

1. **"special offer on accessories" is ALLOWED.** The rule is about quoting a discount or price reduction; "offer" is an ordinary word and a festive offer published on `/offers` is legitimate. If the business wants *any* mention of offers to go through a manager, add `/\boffers?\b/i` (this would also block "We offer a free test drive").
2. **The filter over-blocks on purpose.** It blocks sentences that mention the word while refusing ("We cannot offer any discount"), the bare word "off" in unrelated use ("switch off the engine", "off Kanpur Road"), and "कम" about loan rates. The brief says these words are hard-blocked, so we err on the side of blocking; the consultant rephrases ("near Kanpur Road"). Loosening any of these is a policy decision, not a bug fix.
3. **The AI draft prompt still suggests "complimentary accessory bundles"** (`src/server/ai/prompts/lead-reply.ts`). That is a freebie offer which this filter does not catch. Decide whether a free bundle counts as a discount; if yes, remove that line from the prompt.

## 4. Known gaps (the filter does NOT catch these today)

| # | Sentence | Result | Note |
|---|---|---|---|
| 1 | कीमत में कमी हो सकती है | allowed | कमी (reduction) is a different word from कम |
| 2 | We can reduce the price for you | allowed |  |
| 3 | Best deal, lowest price guaranteed | allowed |  |

These are price-reduction phrasings without the hard-blocked words. Adding them (`कमी`, `reduce the price`, `lowest price`) is a one-line change in `discount.ts` plus a table row, but each addition also raises the false-positive rate, so they are listed rather than silently added.

## Price-promise check (added 2026-11-09)

Besides the word list, `findPriceConcessionPhrase` (same file, `src/lib/validation/discount.ts`) blocks phrases that promise a better price without using a listed word, such as "I can reduce the price", "price can come down", "best price", "special deal", "negotiable", "cheaper", "lower than the quoted price", "match any competitor price", or the word "discount" with letters spread out. It applies to AI drafts (through `guardAiText`), the buyer chatbot, and consultant replies in the Lead Desk and the Chats screen. The rule-based fallback text is written to pass both checks.

