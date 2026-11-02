import React from "react";
import { PageShell } from "@/components/layout/PageShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { constructMetadata } from "@/lib/seo";
import { Building2, Users, Trophy, ShieldCheck, Car, Award } from "lucide-react";

export async function generateMetadata() {
  return constructMetadata({
    title: "About Vrooma - Lucknow's Authorised Brand X Dealership",
    description: "Learn about Vrooma: 340 staff, 3 showrooms, 2 certified workshops, and over 6,900 new and pre-owned vehicle deliveries across Lucknow annually.",
    path: "/about",
  });
}

export default function AboutPage() {
  return (
    <PageShell
      title="About Vrooma Automobiles"
      subtitle="The premier passenger car destination in Lucknow, dedicated to transparent ownership and effortless automotive care."
      breadcrumbs={[{ label: "About" }]}
    >
      <div className="space-y-12 max-w-4xl">
        {/* Company Overview Narrative */}
        <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-4">
          <h2 className="text-xl font-bold text-ink">Our Heritage & Scale</h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            Founded with a vision to eliminate the friction in car buying, Vrooma is Lucknow&apos;s authorised dealership partner for passenger car Brand X. Operating across three luxury showroom facilities, two certified high-capacity service centers, and a dedicated pre-owned valuation yard, our organization serves over 60,000 satisfied motorists across Uttar Pradesh.
          </p>
          <p className="text-sm text-ink-soft leading-relaxed">
            With over 340 trained sales and technical professionals, we deliver approximately 6,000 new cars and 900 certified pre-owned vehicles each year, generating an annual enterprise turnover of ₹550 to ₹650 crore.
          </p>
        </div>

        {/* Operational Statistics */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-soft mb-4">
            Dealership Network Scale
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard
              label="Annual New Deliveries"
              value="~6,000"
              subtitle="Brand X passenger cars"
              icon={<Car className="h-4 w-4" />}
            />
            <StatCard
              label="Pre-Owned Sold"
              value="900+"
              subtitle="140-point certified cars"
              icon={<Award className="h-4 w-4" />}
            />
            <StatCard
              label="Dealership Staff"
              value="340"
              subtitle="Consultants, technicians, staff"
              icon={<Users className="h-4 w-4" />}
            />
            <StatCard
              label="Showroom Facilities"
              value="3"
              subtitle="Hazratganj, Gomti Nagar, Kanpur"
              icon={<Building2 className="h-4 w-4" />}
            />
            <StatCard
              label="Service Bays"
              value="24"
              subtitle="Transport Nagar & Alambagh"
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <StatCard
              label="Annual Revenue"
              value="₹600 Cr"
              subtitle="Authorised retail operations"
              icon={<Trophy className="h-4 w-4" />}
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
