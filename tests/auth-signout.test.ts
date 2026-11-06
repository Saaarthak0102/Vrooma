import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { shouldRedirectOnAuthEvent } from "@/lib/auth-events";

describe("shouldRedirectOnAuthEvent", () => {
  it("redirects when a signed-in user is signed out elsewhere (other tab, ended session)", () => {
    expect(shouldRedirectOnAuthEvent(true, "SIGNED_OUT", false)).toBe(true);
  });

  it("does not redirect on the first-load 'no session' event of a public page", () => {
    expect(shouldRedirectOnAuthEvent(false, "SIGNED_OUT", false)).toBe(false);
  });

  it("does not redirect twice when this tab is already navigating after pressing Sign out", () => {
    expect(shouldRedirectOnAuthEvent(true, "SIGNED_OUT", true)).toBe(false);
  });

  it("ignores every other auth event", () => {
    for (const ev of ["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "INITIAL_SESSION"]) {
      expect(shouldRedirectOnAuthEvent(true, ev, false)).toBe(false);
    }
  });
});

describe("sign-out wiring", () => {
  const root = path.resolve(__dirname, "..");
  const provider = fs.readFileSync(path.join(root, "src/components/auth/AuthProvider.tsx"), "utf8");

  it("signs out in the browser client AND on the server, then loads the landing page", () => {
    const body = provider.slice(provider.indexOf("const signOut = useCallback"));
    expect(body).toMatch(/auth\.signOut\(\{ scope: "local" \}\)/);
    expect(body).toMatch(/await serverSignOut\(\)/);
    expect(body).toMatch(/window\.location\.assign\("\/"\)/);
  });

  it("callers no longer navigate on their own", () => {
    const profile = fs.readFileSync(path.join(root, "src/components/profile/ProfileView.tsx"), "utf8");
    const rights = fs.readFileSync(path.join(root, "src/components/dashboard/DataRightsPanel.tsx"), "utf8");
    expect(profile).not.toMatch(/await signOut\(\);[^\n]*\n\s*router\.push\("\/"\)/);
    expect(rights).not.toMatch(/await signOut\(\);[^\n]*\n\s*window\.location\.href/);
  });
});
