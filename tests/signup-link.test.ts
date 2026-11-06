import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ---- fake Supabase server client -------------------------------------------------------------
type Profile = { onboarding_completed_at: string | null; is_active: boolean; role: string } | null;
const state = vi.hoisted(() => ({
  user: { id: "u1", user_metadata: {} as Record<string, unknown> } as { id: string; user_metadata: Record<string, unknown> } | null,
  profile: null as Profile,
  verifyError: null as { message: string } | null,
  otpError: null as { message: string } | null,
  calls: { verifyOtp: 0, signInWithOtp: [] as any[], signOut: 0, createClient: 0 },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    state.calls.createClient++;
    return {
      auth: {
        signInWithOtp: async (args: unknown) => {
          state.calls.signInWithOtp.push(args);
          return { error: state.otpError };
        },
        verifyOtp: async () => {
          state.calls.verifyOtp++;
          return { error: state.verifyError };
        },
        getUser: async () => ({ data: { user: state.user } }),
        signOut: async () => {
          state.calls.signOut++;
          return {};
        },
      },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: state.profile }) }) }) }),
    };
  },
}));

import { requestSignupLink, confirmEmailLink, getSignupHint } from "@/server/auth/signup-link";
import { GET as confirmGet } from "@/app/auth/confirm/route";

const valid = { email: "Buyer@Example.com", fullName: "Aditya Mishra", phone: "98765 43210", cityId: "city-lucknow", locale: "en" as const };

beforeEach(() => {
  state.user = { id: "u1", user_metadata: {} };
  state.profile = null;
  state.verifyError = null;
  state.otpError = null;
  state.calls = { verifyOtp: 0, signInWithOtp: [], signOut: 0, createClient: 0 };
});

describe("requestSignupLink", () => {
  it("sends a confirmation link request with a safe redirect and prefill metadata", async () => {
    const res = await requestSignupLink(valid, "/cars/model-h");
    expect(res.ok).toBe(true);
    const sent = state.calls.signInWithOtp[0];
    expect(sent.email).toBe("buyer@example.com");
    expect(sent.options.shouldCreateUser).toBe(true);
    expect(sent.options.emailRedirectTo).toContain("/auth/confirm?next=");
    expect(decodeURIComponent(sent.options.emailRedirectTo)).toContain("/cars/model-h");
    expect(sent.options.data).toEqual({ full_name: "Aditya Mishra", phone: "+919876543210", city_id: "city-lucknow", locale: "en" });
  });

  it("never puts consent flags, role or anything else in the metadata", async () => {
    await requestSignupLink({ ...valid, role: "admin", termsConsent: true } as any);
    const keys = Object.keys(state.calls.signInWithOtp[0].options.data).sort();
    expect(keys).toEqual(["city_id", "full_name", "locale", "phone"]);
  });

  it("neutralises an open-redirect next parameter", async () => {
    await requestSignupLink(valid, "//evil.example.com/steal");
    const redirect = decodeURIComponent(state.calls.signInWithOtp[0].options.emailRedirectTo);
    expect(redirect).not.toContain("evil.example.com");
  });

  it("rejects a bad phone, a short name and a bad email without calling Supabase", async () => {
    expect((await requestSignupLink({ ...valid, phone: "12345" })).ok).toBe(false);
    expect((await requestSignupLink({ ...valid, fullName: "A" })).ok).toBe(false);
    expect((await requestSignupLink({ ...valid, email: "not-an-email" })).ok).toBe(false);
    expect(state.calls.signInWithOtp).toHaveLength(0);
  });

  it("surfaces Supabase errors", async () => {
    state.otpError = { message: "Email rate limit exceeded" };
    const res = await requestSignupLink(valid);
    expect(res.ok).toBe(false);
  });
});

describe("confirmEmailLink: where the user lands after the link is verified", () => {
  const link = { tokenHash: "abcdefghij1234567890", type: "signup" as const, locale: "en" as const };

  it("a brand-new account (onboarding not completed) goes to onboarding, keeping next", async () => {
    state.profile = { onboarding_completed_at: null, is_active: true, role: "buyer" };
    const res = await confirmEmailLink({ ...link, next: "/cars/model-h" });
    expect(res).toEqual({ ok: true, data: { destination: "/en/onboarding?next=%2Fcars%2Fmodel-h" } });
  });

  it("a user with no profile row yet also goes to onboarding", async () => {
    state.profile = null;
    const res = await confirmEmailLink(link);
    expect(res.ok && res.data.destination).toMatch(/^\/en\/onboarding\?next=/);
  });

  it("a completed buyer goes to the dashboard", async () => {
    state.profile = { onboarding_completed_at: "2026-01-01", is_active: true, role: "buyer" };
    const res = await confirmEmailLink(link);
    expect(res).toEqual({ ok: true, data: { destination: "/en/dashboard" } });
  });

  it("staff and admin go to their consoles on the default target", async () => {
    state.profile = { onboarding_completed_at: "2026-01-01", is_active: true, role: "consultant" };
    expect((await confirmEmailLink(link)).ok && (await confirmEmailLink(link))).toMatchObject({ data: { destination: "/en/staff" } });
    state.profile = { onboarding_completed_at: "2026-01-01", is_active: true, role: "admin" };
    expect(await confirmEmailLink(link)).toMatchObject({ data: { destination: "/en/admin" } });
  });

  it("a deactivated account is signed out and sent to sign-in with an error", async () => {
    state.profile = { onboarding_completed_at: "2026-01-01", is_active: false, role: "buyer" };
    const res = await confirmEmailLink(link);
    expect(res).toEqual({ ok: true, data: { destination: "/en/sign-in?error=account_disabled" } });
    expect(state.calls.signOut).toBe(1);
  });

  it("an expired or already-used token is a CODE_EXPIRED error", async () => {
    state.verifyError = { message: "Token has expired or is invalid" };
    const res = await confirmEmailLink(link);
    expect(res.ok).toBe(false);
    expect(!res.ok && res.error.code).toBe("CODE_EXPIRED");
  });

  it("rejects an unknown token type or a tiny token before touching Supabase", async () => {
    expect((await confirmEmailLink({ ...link, type: "recovery" as any })).ok).toBe(false);
    expect((await confirmEmailLink({ ...link, tokenHash: "x" })).ok).toBe(false);
    expect(state.calls.verifyOtp).toBe(0);
  });

  it("hindi locale destinations carry the /hi prefix", async () => {
    state.profile = { onboarding_completed_at: null, is_active: true, role: "buyer" };
    const res = await confirmEmailLink({ ...link, locale: "hi", next: "/hi/dashboard" });
    expect(res.ok && res.data.destination).toMatch(/^\/hi\/onboarding\?next=/);
  });
});

describe("GET /auth/confirm", () => {
  const req = (qs: string) => ({ url: `http://localhost:3000/auth/confirm?${qs}` }) as any;

  it("does NOT verify the token (mail scanners open links); it forwards to the confirm page", async () => {
    const res = await confirmGet(req("token_hash=abcdefghij1234567890&type=signup&next=%2Fdashboard"));
    expect(state.calls.verifyOtp).toBe(0);
    expect(state.calls.createClient).toBe(0);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/en/verify-email");
    expect(location.searchParams.get("token_hash")).toBe("abcdefghij1234567890");
    expect(location.searchParams.get("type")).toBe("signup");
    expect(location.searchParams.get("next")).toBe("/dashboard");
  });

  it("a link with missing parameters goes to sign-in with invalid_link", async () => {
    const res = await confirmGet(req("type=signup"));
    expect(res.headers.get("location")).toContain("/en/sign-in?error=invalid_link");
  });

  it("keeps the hindi locale from next", async () => {
    const res = await confirmGet(req("token_hash=abcdefghij1234567890&type=signup&next=%2Fhi%2Fdashboard"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/hi/verify-email");
  });
});

describe("getSignupHint", () => {
  it("returns only validated prefill fields", async () => {
    state.user = {
      id: "u1",
      user_metadata: { full_name: "  Aditya Mishra ", phone: "+919876543210", city_id: "city-kanpur", locale: "hi", role: "admin", terms: true },
    };
    expect(await getSignupHint()).toEqual({ fullName: "Aditya Mishra", phoneDigits: "9876543210", cityId: "city-kanpur", locale: "hi" });
  });

  it("drops garbage and returns null when signed out", async () => {
    state.user = { id: "u1", user_metadata: { phone: "12", city_id: "<script>", locale: "fr", full_name: "A" } };
    expect(await getSignupHint()).toEqual({});
    state.user = null;
    expect(await getSignupHint()).toBeNull();
  });
});

describe("link-only guarantees in the source", () => {
  const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

  it("the confirm-signup email shows no code and uses the app's redirect URL", () => {
    const html = read("supabase/templates/confirmation.html");
    expect(html).not.toContain("{{ .Token }}");
    expect(html).toContain("{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup");
  });

  it("the sign-up page no longer asks for or verifies a code", () => {
    const page = read("src/app/[locale]/(auth)/sign-up/page.tsx");
    expect(page).not.toMatch(/verifyOtp|requestOtp|completeProfile|otpCode|6-Digit/);
    expect(page).toContain("requestSignupLink");
  });

  it("sign-in keeps its code flow", () => {
    const signIn = read("src/app/[locale]/(auth)/sign-in/page.tsx");
    expect(signIn).toContain("verifyOtp");
  });

  it("onboarding does not restore consent flags from the sign-up draft", () => {
    const onboarding = read("src/app/[locale]/(auth)/onboarding/page.tsx");
    expect(onboarding).not.toMatch(/setTermsConsent\(parsed|setServiceConsent\(parsed|setMarketingConsent\(parsed/);
  });
});

describe("middleware does not swallow the /auth/* route handlers", () => {
  it("excludes /auth/confirm and /auth/callback from next-intl routing (they 404 otherwise)", async () => {
    const { config } = await import("@/middleware");
    const catchAll = config.matcher.find((m: string) => m.startsWith("/((?!"))!;
    const re = new RegExp("^" + catchAll.replace(/^\/\(/, "/(") + "$");
    for (const p of ["/auth/confirm", "/auth/callback"]) expect(re.test(p), p).toBe(false);
    for (const p of ["/sign-up", "/verify-email", "/onboarding", "/cars/model-h"]) expect(re.test(p), p).toBe(true);
    expect(re.test("/api/health")).toBe(false);
  });
});
