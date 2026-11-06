import React from "react";
import { notFound } from "next/navigation";
import { listModels } from "@/server/repositories/models";
import { ModelDetailClient } from "./ModelDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminModelDetailPage({ params }: PageProps) {
  const { id } = await params;
  const models = await listModels();
  const model = models.find((m) => m.id === id || m.slug === id) || models[0];

  if (!model) {
    notFound();
  }

  return <ModelDetailClient model={model} />;
}
