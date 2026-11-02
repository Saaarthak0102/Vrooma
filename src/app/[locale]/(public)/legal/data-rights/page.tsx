import React from "react";
import { PageShell } from "@/components/layout/PageShell";
import { DataRightsPanel } from "@/components/dashboard/DataRightsPanel";
import { constructMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return constructMetadata({
    title: "Personal Data Rights & Opt-Out - DPDP Act 2023",
    description: "Manage your personal data preferences, opt-out of marketing communications, or exercise your legal right to erasure under India's DPDP Act 2023.",
    path: "/legal/data-rights",
  });
}

export default function DataRightsPage() {
  return (
    <PageShell
      title="Personal Data Rights & Privacy Controls"
      subtitle="Exercise your rights under the Digital Personal Data Protection Act 2023: opt-out of notifications, review active consents, or request permanent erasure."
      breadcrumbs={[{ label: "Legal" }, { label: "Data Rights" }]}
    >
      <div className="max-w-2xl">
        <DataRightsPanel />
      </div>
    </PageShell>
  );
}
