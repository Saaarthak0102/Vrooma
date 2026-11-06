import type { SupabaseClient } from "@supabase/supabase-js";
import { safeNext } from "./safe-next";
import { postSignInPath } from "@/lib/console-nav";

export interface PostVerifyDestination {
  /** App path to navigate to after a link has been verified. */
  destination: string;
  /** True when the account is deactivated: the session was dropped and the user goes to sign-in with an error. */
  disabled: boolean;
}

/**
 * Where to send a user right after their email link was verified. Single copy of the rules, used by the
 * confirm-page server action:
 *   inactive account            -> /sign-in?error=account_disabled (session dropped)
 *   onboarding not completed    -> /onboarding?next=<safe next>      <- every brand-new sign-up
 *   admin / staff               -> their console (postSignInPath)
 *   everyone else               -> safeNext(next)
 */
export async function resolvePostVerifyDestination(
  supabase: SupabaseClient<any, any, any>,
  nextParam: string
): Promise<PostVerifyDestination> {
  const { data: { user } } = await supabase.auth.getUser();
  const target = safeNext(nextParam);

  if (!user) {
    return { destination: "/sign-in?error=expired_link", disabled: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at, is_active, role")
    .eq("id", user.id)
    .single();

  if (profile?.is_active === false) {
    await supabase.auth.signOut({ scope: "local" });
    return { destination: "/sign-in?error=account_disabled", disabled: true };
  }

  if (!profile?.onboarding_completed_at) {
    return { destination: `/onboarding?next=${encodeURIComponent(target)}`, disabled: false };
  }

  // Staff always land in their console; buyers keep their own destination.
  return { destination: postSignInPath(profile.role, target), disabled: false };
}
