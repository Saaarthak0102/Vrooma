import React from "react";
import { notFound } from "next/navigation";
import { listAdminModels } from "@/server/repositories/admin-models";
import { ModelDetailClient } from "./ModelDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminModelDetailPage({ params }: PageProps) {
  const { id } = await params;
  const models = await listAdminModels();
  // An unknown id must 404. Falling back to another model would let an admin edit the wrong car.
  const model = models.find((m) => m.id === id || m.slug === id);

  if (!model) {
    notFound();
  }

  return <ModelDetailClient model={model} />;
}
