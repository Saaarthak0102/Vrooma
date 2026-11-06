import React from "react";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { requireRole } from "@/server/auth/viewer";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Second layer behind middleware: never render the admin console without an admin session.
  try {
    await requireRole("admin", "manager"); // middleware limits managers to /admin/used-cars
  } catch {
    redirect("/sign-in?next=/admin");
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</div>
    </div>
  );
}
