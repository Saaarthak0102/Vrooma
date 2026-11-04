import React from "react";
import { listLeads } from "@/server/repositories/leads";
import { StaffLeadsClient } from "./StaffLeadsClient";

export default async function StaffLeadsPage() {
  const leads = await listLeads({ limit: 100 });
  return <StaffLeadsClient initialLeads={leads} />;
}
