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
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink">3. Specified Purpose of Processing</h2>
          <p>
            Customer data is strictly processed to assign enquiries to showroom sales specialists within our 5-minute SLA, confirm test drive and workshop appointments, compute on-road taxes, and transmit transactional booking updates via SMS or WhatsApp.
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
      </div>
    </PageShell>
  );
}

