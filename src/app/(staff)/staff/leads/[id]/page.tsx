import React from "react";
import { notFound } from "next/navigation";
import { getLeadById, listLeadEvents } from "@/server/repositories/leads";
import { listUsers } from "@/server/repositories/users";
import { requireRole } from "@/server/auth/viewer";
import { ensureLeadCopilot } from "@/server/services/lead-copilot-persist";
import { LeadDetailClient } from "./LeadDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { user, profile } = await requireRole("consultant", "manager", "admin");
  const rawLead = await getLeadById(id);

  // A consultant can only open their own leads; anything else looks like it does not exist.
  if (!rawLead || (profile.role === "consultant" && rawLead.assigned_to !== user.id)) {
    notFound();
  }

  // Only active consultants can receive a reassigned lead (the RPC rejects the rest).
  // Authorisation is settled above, so the AI fill and the timeline can load in parallel.
  const [lead, events, allConsultants] = await Promise.all([
    ensureLeadCopilot(rawLead),
    listLeadEvents(rawLead.id),
    listUsers("consultant"),
  ]);
  const consultants = allConsultants.filter((c) => c.is_active !== false);

  return (
    <LeadDetailClient
      initialLead={lead}
      consultants={consultants}
      events={events}
      viewerRole={profile.role}
    />
  );
}
