/**
 * Demo mode: the four instant persona buttons (buyer, consultant, manager, admin) on the sign-in screens.
 *
 *   development            always on (the existing dev persona switch, signs in through /api/auth/dev-login)
 *   anywhere else          only when DEMO_LOGIN=true on the server (the route checks it; it is the real gate) and
 *                          NEXT_PUBLIC_DEMO_LOGIN=true (only decides whether the buttons are drawn)
 *
 * There is no passcode: while DEMO_LOGIN=true, anyone who opens the site can sign in as any of the four demo
 * accounts, admin included. Remove the variable in the hosting settings and redeploy to switch it off.
 */

export const IS_DEV_BUILD = process.env.NODE_ENV === "development";

/** Whether the persona buttons should be drawn. Safe to read in client components (NEXT_PUBLIC_ is inlined at build). */
export const SHOW_PERSONA_LOGIN = IS_DEV_BUILD || process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";

/** The route that performs the sign-in for this build. */
export const PERSONA_LOGIN_ENDPOINT = IS_DEV_BUILD ? "/api/auth/dev-login" : "/api/auth/demo-login";

export const PERSONA_LOGIN_TITLE = IS_DEV_BUILD ? "Dev Mode: Instant Persona Login" : "Demo mode: instant sign-in";

/** Server-side gate for the demo login route. */
export function demoLoginEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.DEMO_LOGIN === "true";
}
