/**
 * The emailed sign-in code length comes from one constant (OTP_LENGTH, default 8 to match the Supabase
 * project). The UI used to hard-code 6, which cut an 8-digit code short and made sign-in impossible.
 */
import { describe, it, expect, vi } from "vitest";

const state = vi.hoisted(() => ({ verifyCalls: [] as any[] }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      verifyOtp: async (args: unknown) => {
        state.verifyCalls.push(args);
        return { data: { user: { id: "u1" } }, error: null };
      },
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { onboarding_completed_at: "2026-01-01" } }) }) }),
    }),
  }),
}));

import { OTP_LENGTH, sanitizeOtp } from "@/lib/auth-config";
import { verifyOtp } from "@/server/auth/actions";

describe("OTP length", () => {
  it("defaults to 8 digits (the length the Supabase project emails)", () => {
    expect(OTP_LENGTH).toBe(8);
  });

  it("sanitizeOtp keeps digits only, accepts pasted spacing, and drops extra digits", () => {
    expect(sanitizeOtp("12345678")).toBe("12345678");
    expect(sanitizeOtp("1234 5678")).toBe("12345678");
    expect(sanitizeOtp("1234-5678")).toBe("12345678");
    expect(sanitizeOtp("123456789012")).toBe("12345678");
    expect(sanitizeOtp("abc")).toBe("");
  });

  it("verifyOtp rejects wrong-length codes without calling Supabase", async () => {
    state.verifyCalls.length = 0;
    const short = await verifyOtp("buyer@example.com", "123456");
    const long = await verifyOtp("buyer@example.com", "123456789");
    expect(short.ok).toBe(false);
    expect(long.ok).toBe(false);
    if (!short.ok) expect(short.error.code).toBe("INVALID_CODE");
    expect(state.verifyCalls).toHaveLength(0);
  });

  it("verifyOtp accepts a code of the configured length", async () => {
    state.verifyCalls.length = 0;
    const res = await verifyOtp("buyer@example.com", "1234 5678");
    expect(res.ok).toBe(true);
    expect(state.verifyCalls).toHaveLength(1);
    expect(state.verifyCalls[0]).toMatchObject({ token: "12345678", type: "email" });
  });
});
