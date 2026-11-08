import React from "react";
import { PageShell } from "@/components/layout/PageShell";
import { constructMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return constructMetadata({
    title: "Privacy Policy - Digital Personal Data Protection Act 2023",
    description: "Vrooma Automobiles customer privacy policy in strict adherence with India's DPDP Act 2023 regulations.",
    path: "/legal/privacy",
  });
}

export default function PrivacyPage() {
  return (
    <PageShell
      title="Privacy Policy & Notice"
      subtitle="Strict compliance with the Digital Personal Data Protection (DPDP) Act, 2023."
      breadcrumbs={[{ label: "Legal" }, { label: "Privacy Policy" }]}
    >
      <div className="max-w-3xl rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6 text-sm text-ink-soft leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink">1. Identity of Data Fiduciary</h2>
          <p>
            Vrooma Automobiles Pvt. Ltd. (referred to as &ldquo;Vrooma&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;) operates as the Data Fiduciary under the DPDP Act 2023 for all customer information collected through this digital showroom portal.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink">2. Categories of Personal Data Collected</h2>
          <p>We collect and process only the minimal necessary personal data, including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Contact details: Name, 10-digit mobile number, email address.</li>
            <li>Vehicle preferences: Preferred Brand X model, variant, fuel type, and city of registration.</li>
            <li>Booking records: Appointment date, slot, and preferred showroom facility.</li>
            <li>Home visit address and PIN code: only if you ask for a home test drive or a vehicle pickup, stored with that booking alone.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink">3. Specified Purpose of Processing</h2>
          <p>
            Customer data is strictly processed to assign enquiries to showroom sales specialists within our 5-minute SLA, confirm test drive and workshop appointments, compute on-road taxes, and transmit transactional booking updates via WhatsApp or email.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink">4. Registration Number Masking Policy</h2>
          <p>
            To protect previous vehicle owner privacy, all pre-owned car listings publicly display masked registration identifiers (e.g. <code>UP32 ** **** 1234</code>). Full registration details are verified exclusively during in-person vehicle transfer at our authorized registry.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink">5. Grievance Redressal & Data Protection Officer</h2>
          <p>
            For inquiries, consent withdrawals, or data correction, contact our Data Protection Officer at:
            <br />
            <strong>Email:</strong> dpo@vrooma.in · <strong>Address:</strong> 14/A MG Marg, Hazratganj, Lucknow, UP 226001.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink">6. AI Assistance and Service Providers</h2>
          <p>
            Some features use artificial intelligence: the website chat assistant, and tools that help our staff summarise an enquiry and draft a reply. A person always reviews a reply before it is sent to you. Prices are never produced by AI; they always come from our official price tables.
          </p>
          <p>
            To do this we send the text of your enquiry or chat message, and your first name, to Google (Gemini API), our AI service provider. Before anything is sent we remove phone numbers, email addresses, vehicle registration numbers and similar identifiers from that text. We do not send your contact details or registration number. Under the terms that apply to the service we use, Google may use this text to improve its services, and trained reviewers may read it. Please do not type personal details, such as phone numbers or ID numbers, into the chat.
          </p>
          <p>
            If you would rather not have your message handled this way, use the booking and enquiry forms or contact us at dpo@vrooma.in and a team member will help you directly.
          </p>
        </section>
      </div>
    </PageShell>
  );
}

