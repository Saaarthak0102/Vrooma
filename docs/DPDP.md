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

