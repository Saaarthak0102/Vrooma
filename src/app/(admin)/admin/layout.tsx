import React from "react";
import { redirect } from "next/navigation";
import { ConsoleShell } from "@/components/layout/ConsoleShell";
import { requireRole } from "@/server/auth/viewer";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Second layer behind middleware: the admin console is for the Dealer Principal only.
  // (Used stock, which managers need, now lives at /staff/stock.)
  let viewer;
  try {
    viewer = await requireRole("admin");
  } catch {
    redirect("/sign-in?next=/admin");
  }

  return (
    <ConsoleShell role={viewer.profile.role} name={viewer.profile.full_name}>
      {children}
    </ConsoleShell>
  );
}
