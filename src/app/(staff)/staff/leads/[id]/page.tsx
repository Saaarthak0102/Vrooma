import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** A lead is now a side panel on the Lead Desk. Old links open that panel. */
export default async function LegacyLeadRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/staff?lead=${encodeURIComponent(id)}`);
}
