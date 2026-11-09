# VROOMA — DPDP ACT 2023 COMPLIANCE & DATA PRIVACY

## 1. Regulatory Context

Under the **Digital Personal Data Protection Act, 2023 (DPDP Act)** of India:
- Dealerships processing customer names, phone numbers, email addresses, driving license details, and vehicle registration numbers act as **Data Fiduciaries**.
- Processing is lawful only on the basis of **verifiable, informed, affirmative consent** or for specified legitimate uses.
- Data Principals (car buyers and owners) have statutory rights to access personal data, rectify inaccuracies, and request unconditional erasure.

---

## 2. Consent Mechanism

### Unchecked Consent Checkbox
Every lead, test-drive, service, and trade-in form across Vrooma embeds the standardized `@/components/forms/ConsentCheckbox`:
- **Strict Rule:** The checkbox is **never pre-checked**.
- **Legal Notice:** Explicitly outlines the exact processing purpose:
  > *"I consent to Vrooma contacting me via Phone, WhatsApp, or Email regarding this enquiry and vehicle quotation under the DPDP Act 2023. I understand I can withdraw consent at any time."*
- **Traceability:** When submitted, the timestamp, user agent, IP address, and consent version are permanently recorded alongside the lead record.

---

## 3. Vehicle Registration Number Masking

Under Indian privacy principles, vehicle registration numbers can be linked to individuals via Parivahan / RTO registries.
- **Rule:** Certified pre-owned vehicle listings on public web pages and public APIs MUST mask the registration plate:
  - Input: `UP32 AB 1234` or `UP32AZ5678`
  - Output: `UP32 ** **** 1234` or `UP32 ** **** 5678`
- **Implementation:** Pure deterministic masking in `src/lib/masking.ts` (`maskRegNo`). Unmasked registration numbers are restricted strictly to authenticated workshop managers and the Used-Car Manager.

---

## 4. Data Subject Rights & Erasure Workflow

1. **Right to Access & Download:**
   - Any registered buyer can visit `/dashboard/profile` or `/legal/data-rights` to download a complete JSON archive of their recorded bookings, enquiries, and communication history.
2. **Right to Erasure ("Right to be Forgotten"):**
   - Vrooma provides a 1-click erasure endpoint: `POST /api/me/delete`.
   - Upon receipt:
     - The customer profile is immediately marked for deletion.
     - Phone numbers and email addresses on past leads are scrubbed/anonymized.
     - Active test-drive bookings are cancelled.
     - A confirmation receipt is presented with a DPDP reference token.

---

## 5. Retention

Personal data is deleted or anonymised when its purpose ends. Periods (leads 24 months, chats 12 months, AI logs 90 days, outbox 90 days, and others) are listed in `docs/DATA_MODEL.md` and run daily by `/api/cron/data-retention`. Buyers can also delete their account; it can be cancelled until it is finalised.

## 6. AI and personal data

- Prompts and stored `ai_logs` are redacted: phone numbers and registration numbers are never stored.
- The AI never sees data the viewing role cannot see. The chatbot gets facts built on the server for that buyer.
- Garage and service-due reminders and saved-car emails are opt-in, with an unticked checkbox and a send-time consent check.
- The buyer data export includes garage vehicles and service records.

## 7. Demo accounts

Demo accounts (`*@demo.vrooma.in`, migration `0042`) hold fictional people only. The outbox never emails demo addresses. Remove them with `supabase/remove-demo-data.sql` before real launch (`docs/backend/PROD_DEMO.md`).

