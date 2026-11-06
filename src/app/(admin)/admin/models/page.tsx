import React from "react";
import { listAdminModels } from "@/server/repositories/admin-models";
import { ModelsClient } from "./ModelsClient";

export const dynamic = "force-dynamic";

export default async function AdminModelsPage() {
  // Admin sees drafts and inactive trims too; the public catalog only lists live rows.
  const models = await listAdminModels();
  return <ModelsClient initialModels={models} />;
}
