import React from "react";
import { notFound } from "next/navigation";
import { getLeadById, listLeads } from "@/server/repositories/leads";
import { listUsers } from "@/server/repositories/users";
import { LeadDetailClient } from "./LeadDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  let lead = await getLeadById(id);

  if (!lead) {
    const all = await listLeads();
    lead = all.find((l) => l.id === id) || null;
  }

  if (!lead) {
    notFound();
  }

  const consultants = await listUsers("consultant");

  return <LeadDetailClient initialLead={lead} consultants={consultants} />;
}
