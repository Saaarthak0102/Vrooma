import React from "react";
import { redirect } from "next/navigation";
import { StaffSidebar } from "@/components/layout/StaffSidebar";
import { requireRole } from "@/server/auth/viewer";

export const dynamic = "force-dynamic";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Second layer behind middleware: never render the staff console without a staff session.
  try {
    await requireRole("consultant", "manager", "admin");
  } catch {
    redirect("/sign-in?next=/staff");
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      <StaffSidebar />
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</div>
    </div>
  );
}
