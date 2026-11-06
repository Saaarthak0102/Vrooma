import { redirect } from "next/navigation";

export default function DashboardSavedPage() {
  redirect("/dashboard?view=saved");
}
