/**
 * Decides whether an auth state event should send the visitor to the landing page.
 *
 * - Only a real SIGNED_OUT counts.
 * - Only when the user WAS signed in: Supabase also reports "no session" on the very first load of a public
 *   page, which must not redirect anyone.
 * - Not when this tab is already navigating because the user pressed "Sign out" itself.
 */
export function shouldRedirectOnAuthEvent(
  wasAuthenticated: boolean,
  event: string,
  signingOutHere: boolean
): boolean {
  return event === "SIGNED_OUT" && wasAuthenticated && !signingOutHere;
}
