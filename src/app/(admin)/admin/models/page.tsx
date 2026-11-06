import React from "react";
import { listModels } from "@/server/repositories/models";
import { ModelsClient } from "./ModelsClient";

export default async function AdminModelsPage() {
  const models = await listModels();
  return <ModelsClient initialModels={models} />;
}
