import React from "react";
import { PageShell } from "@/components/layout/PageShell";
import { constructMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return constructMetadata({
    title: "Terms and Conditions of Service",
    description: "Terms of sale, test drive regulations, and vehicle delivery guidelines for Vrooma Automobiles Lucknow.",
    path: "/legal/terms",
  });
}

export default function TermsPage() {
  return (
    <PageShell
      title="Terms of Service & Dealership Regulations"
      subtitle="Operational guidelines for showroom test drives, vehicle reservations, and service bay bookings."
      breadcrumbs={[{ label: "Legal" }, { label: "Terms of Service" }]}
    >
      <div className="max-w-3xl rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-6 text-sm text-ink-soft leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink">1. Price Indicative Clause</h2>
          <p>
            All on-road price estimates, including RTO registration fees, Road Tax, TCS, and insurance premiums displayed on this portal, are calculated from current official Lucknow and Kanpur regional transport tables. Statutory rates are subject to change as per Uttar Pradesh state gazette amendments at the time of vehicle invoicing.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink">2. Test Drive Requirements</h2>
          <p>
            Test drive bookings require a valid permanent Indian motor driving license presented in original prior to vehicle release. Customers must adhere to authorized speed regulations and designated showroom test routes in Hazratganj and Gomti Nagar.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink">3. Pre-Owned Vehicle Certification</h2>
          <p>
            Vrooma Certified Pre-Owned vehicles are delivered post completion of a 140-point structural and mechanical inspection. A 6-month or 7,500 km limited warranty covers specified engine and drivetrain components.
          </p>
        </section>
      </div>
    </PageShell>
  );
}

