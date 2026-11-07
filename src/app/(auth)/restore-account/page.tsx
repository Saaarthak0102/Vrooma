import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/viewer";
import { isRestorableAccount, deletionDeadline } from "@/lib/account-restore";
import { RestoreAccountPanel } from "./RestoreAccountPanel";

export const dynamic = "force-dynamic";

export default async function RestoreAccountPage() {
  const viewer = await getViewer();
  if (!viewer.isAuthenticated) redirect("/sign-in");

  const profile = viewer.profile;
  // Active accounts have nothing to restore; accounts past the window are handled by the sign-in guard.
  if (!profile || profile.is_active !== false) redirect("/dashboard");
  if (!isRestorableAccount(profile)) redirect("/sign-in?error=account_disabled");

  const deadline = deletionDeadline(profile.deleted_at as string);
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6 px-4 py-16">
      <RestoreAccountPanel deadlineIso={deadline.toISOString()} />
    </main>
  );
}
