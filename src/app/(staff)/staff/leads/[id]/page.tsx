import React from "react";
import { notFound } from "next/navigation";
import { getLeadById } from "@/server/repositories/leads";
import { listUsers } from "@/server/repositories/users";
import { requireRole } from "@/server/auth/viewer";
import { LeadDetailClient } from "./LeadDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { user, profile } = await requireRole("consultant", "manager", "admin");
  const lead = await getLeadById(id);

  // A consultant can only open their own leads; anything else looks like it does not exist.
  if (!lead || (profile.role === "consultant" && lead.assigned_to !== user.id)) {
    notFound();
  }

  // Only active consultants can receive a reassigned lead (the RPC rejects the rest).
  const consultants = (await listUsers("consultant")).filter((c) => c.is_active !== false);

  return <LeadDetailClient initialLead={lead} consultants={consultants} />;
}
