import { redirect } from "next/navigation";

/** The inbox is now the Lead Desk at /staff. Kept so old bookmarks keep working. */
export default function LegacyLeadsRedirect() {
  redirect("/staff");
}
