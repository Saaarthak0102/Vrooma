import { redirect } from "next/navigation";

/** CSV import is now a dialog on the Lead Desk. */
export default function LegacyImportRedirect() {
  redirect("/staff?import=1");
}
