import React from "react";
import { listLeads } from "@/server/repositories/leads";
import { requireRole } from "@/server/auth/viewer";
import { LeadDeskClient } from "./LeadDeskClient";

export const dynamic = "force-dynamic";

/** Screen 1 for every staff role: the Lead Desk (dashboard KPIs + spreadsheet + side panel). */
export default async function LeadDeskPage() {
  const { user, profile } = await requireRole("consultant", "manager", "admin");
  // Consultants only see leads assigned to them; managers and the principal see everything.
  const leads = await listLeads({
    limit: 200,
    assignedTo: profile.role === "consultant" ? user.id : undefined,
  });
  return <LeadDeskClient initialLeads={leads} viewerRole={profile.role} />;
}
