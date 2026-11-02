import React from "react";
import { PageShell } from "@/components/layout/PageShell";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { DataRightsPanel } from "@/components/dashboard/DataRightsPanel";

export default function DashboardProfilePage() {
  return (
    <PageShell
      title="Profile Settings & DPDP Consent"
      subtitle="Manage your contact identity, notification preferences, and personal data rights under the DPDP Act 2023."
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Profile" }]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-4xl">
        <div className="lg:col-span-6 rounded-2xl border border-border bg-white p-6 shadow-card space-y-4">
          <h3 className="text-base font-bold text-ink">Personal Information</h3>
          <ProfileForm />
        </div>

        <div className="lg:col-span-6">
          <DataRightsPanel />
        </div>
      </div>
    </PageShell>
  );
}
