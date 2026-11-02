"use client";

import React from "react";
import { PageShell } from "@/components/layout/PageShell";
import { EnquiryRow } from "@/components/dashboard/EnquiryRow";
import { memoryStore } from "@/server/store";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageSquare } from "lucide-react";

export default function DashboardEnquiriesPage() {
  const enquiries = memoryStore.leads;

  return (
    <PageShell
      title="My Enquiries & Quotations"
      subtitle="Track active inquiries, trade-in requests, and designated consultant responses."
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Enquiries" }]}
    >
      <div className="space-y-4 max-w-3xl">
        {enquiries.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-10 w-10 text-ink-mute" />}
            title="No active enquiries"
            description="You have not submitted any vehicle price inquiries or trade-in requests yet."
          />
        ) : (
          enquiries.map((lead) => <EnquiryRow key={lead.id} lead={lead} />)
        )}
      </div>
    </PageShell>
  );
}
