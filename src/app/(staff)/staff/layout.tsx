import React from "react";
import { redirect } from "next/navigation";
import { ConsoleShell } from "@/components/layout/ConsoleShell";
import { requireRole } from "@/server/auth/viewer";

export const dynamic = "force-dynamic";
/** Briefings, Next steps and price-band notes call the model from here (server actions run under this limit). */
export const maxDuration = 60;

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Second layer behind middleware: never render the staff console without a staff session.
  let viewer;
  try {
    viewer = await requireRole("consultant", "manager", "admin");
  } catch {
    redirect("/sign-in?next=/staff");
  }

  return (
    <ConsoleShell role={viewer.profile.role} name={viewer.profile.full_name}>
      {children}
    </ConsoleShell>
  );
}
