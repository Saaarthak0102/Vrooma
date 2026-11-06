import { redirect } from "next/navigation";

export default function DashboardEnquiriesPage() {
  redirect("/dashboard?view=enquiries");
}
