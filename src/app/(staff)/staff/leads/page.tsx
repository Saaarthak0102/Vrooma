import React from "react";
import { listLeads } from "@/server/repositories/leads";
import { requireRole } from "@/server/auth/viewer";
import { StaffLeadsClient } from "./StaffLeadsClient";

export const dynamic = "force-dynamic";

export default async function StaffLeadsPage() {
  const { user, profile } = await requireRole("consultant", "manager", "admin");
  // Consultants only see leads assigned to them, matching /api/leads.
  const leads = await listLeads({
    limit: 100,
    assignedTo: profile.role === "consultant" ? user.id : undefined,
  });
  return <StaffLeadsClient initialLeads={leads} />;
}
