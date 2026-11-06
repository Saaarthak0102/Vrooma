import { describe, it, expect } from "vitest";
import { safeNext } from "@/server/auth/safe-next";
import { normalizeIndianPhone, formatIndianPhoneDisplay } from "@/lib/phone";
import { completeProfileSchema } from "@/lib/validation/profile";
import { toAppError, AppError } from "@/lib/errors";

describe("Phase 1: safeNext Open Redirect Guard", () => {
  it("allows safe relative paths starting with single slash", () => {
    expect(safeNext("/dashboard")).toBe("/dashboard");
    expect(safeNext("/cars/suv")).toBe("/cars/suv");
    expect(safeNext("/trade-in")).toBe("/trade-in");
  });

  it("strips the retired /en and /hi language prefixes from old links", () => {
    expect(safeNext("/en/dashboard")).toBe("/dashboard");
    expect(safeNext("/hi/dashboard")).toBe("/dashboard");
    expect(safeNext("/hi/cars/model-h?x=1")).toBe("/cars/model-h?x=1");
    expect(safeNext("/en")).toBe("/");
    expect(safeNext("/hi")).toBe("/");
  });

  it("never produces a language-prefixed path", () => {
    for (const input of ["/dashboard", "/cars", "/en/cars", "/hi/cars", "/hi", "/en/"]) {
      expect(safeNext(input)).not.toMatch(/^\/(en|hi)(\/|$)/);
    }
  });

  it("blocks protocol-relative URLs (//evil.com)", () => {
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("//evil.com/phish")).toBe("/dashboard");
  });

  it("blocks backslash open redirect vectors (/\\evil.com and \\\\evil.com)", () => {
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
    expect(safeNext("\\evil.com")).toBe("/dashboard");
    expect(safeNext("\\\\evil.com")).toBe("/dashboard");
  });

  it("blocks external protocol schemes (http:, https:, javascript:, data:)", () => {
    expect(safeNext("https://attacker.com")).toBe("/dashboard");
    expect(safeNext("http://attacker.com")).toBe("/dashboard");
    expect(safeNext("javascript:alert(1)")).toBe("/dashboard");
    expect(safeNext("data:text/html,<script>alert(1)</script>")).toBe("/dashboard");
  });

  it("blocks URL-encoded sneaky redirects", () => {
    expect(safeNext("%2F%2Fevil.com")).toBe("/dashboard");
    expect(safeNext("/%2Fevil.com")).toBe("/dashboard");
  });

  it("falls back to /dashboard on paths not in allow-list", () => {
    expect(safeNext("/secret-unapproved-path")).toBe("/dashboard");
    expect(safeNext("")).toBe("/dashboard");
    expect(safeNext(null as any)).toBe("/dashboard");
  });
});

describe("Phase 1: Indian Phone Normalization", () => {
  it("normalizes clean 10-digit mobile starting 6-9 to +91XXXXXXXXXX", () => {
    expect(normalizeIndianPhone("9876543210")).toBe("+919876543210");
    expect(normalizeIndianPhone("8876543210")).toBe("+918876543210");
    expect(normalizeIndianPhone("7876543210")).toBe("+917876543210");
    expect(normalizeIndianPhone("6876543210")).toBe("+916876543210");
  });

  it("handles leading 0 and +91 prefixes with spaces and dashes", () => {
    expect(normalizeIndianPhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("+919876543210")).toBe("+919876543210");
    expect(normalizeIndianPhone("09876543210")).toBe("+919876543210");
    expect(normalizeIndianPhone("98765-43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("(+91) 98765-43210")).toBe("+919876543210");
  });

  it("rejects invalid numbers", () => {
    // Starts with invalid digit (< 6)
    expect(normalizeIndianPhone("5876543210")).toBeNull();
    expect(normalizeIndianPhone("1234567890")).toBeNull();
    // Too short / too long
    expect(normalizeIndianPhone("98765")).toBeNull();
    expect(normalizeIndianPhone("987654321000")).toBeNull();
    // Empty or letters
    expect(normalizeIndianPhone("")).toBeNull();
    expect(normalizeIndianPhone("abcdefghij")).toBeNull();
  });

  it("formats Indian phone for display", () => {
    expect(formatIndianPhoneDisplay("+919876543210")).toBe("+91 98765 43210");
    expect(formatIndianPhoneDisplay("9876543210")).toBe("+91 98765 43210");
  });
});

describe("Phase 1: Complete Profile & Consent Schema", () => {
  const validPayload = {
    full_name: "Aarav Sharma",
    email: "aarav.sharma@example.com",
    phone: "9876543210",
    city_id: "c1111111-1111-1111-1111-111111111111",
    locale: "en" as const,
    terms_consent: true as const,
    service_consent: true as const,
    marketing_consent: false,
  };

  it("validates valid payload with all required consents", () => {
    const res = completeProfileSchema.safeParse(validPayload);
    expect(res.success).toBe(true);
  });

  it("rejects when terms and privacy consent is false or missing", () => {
    const res = completeProfileSchema.safeParse({
      ...validPayload,
      terms_consent: false,
    });
    expect(res.success).toBe(false);
  });

  it("rejects when service communications consent is false or missing", () => {
    const res = completeProfileSchema.safeParse({
      ...validPayload,
      service_consent: false,
    });
    expect(res.success).toBe(false);
  });

  it("allows marketing consent to be true or false", () => {
    const withMarketing = completeProfileSchema.safeParse({
      ...validPayload,
      marketing_consent: true,
    });
    expect(withMarketing.success).toBe(true);

    const withoutMarketing = completeProfileSchema.safeParse({
      ...validPayload,
      marketing_consent: false,
    });
    expect(withoutMarketing.success).toBe(true);
  });

  it("rejects name shorter than 2 characters or longer than 80", () => {
    const shortName = completeProfileSchema.safeParse({
      ...validPayload,
      full_name: "A",
    });
    expect(shortName.success).toBe(false);

    const longName = completeProfileSchema.safeParse({
      ...validPayload,
      full_name: "A".repeat(81),
    });
    expect(longName.success).toBe(false);
  });
});

describe("Phase 1: Error Mapping", () => {
  it("maps rate limit error to 429 RATE_LIMITED", () => {
    const err = toAppError({ message: "email rate limit exceeded", status: 429 });
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.statusCode).toBe(429);
  });

  it("maps expired otp token error to 400 CODE_EXPIRED", () => {
    const err = toAppError({ message: "Token has expired", status: 400 });
    expect(err.code).toBe("CODE_EXPIRED");
    expect(err.statusCode).toBe(400);
  });

  it("maps invalid otp token error to 400 INVALID_CODE", () => {
    const err = toAppError({ message: "Invalid verification code", status: 400 });
    expect(err.code).toBe("INVALID_CODE");
    expect(err.statusCode).toBe(400);
  });

  it("preserves existing AppError instances", () => {
    const custom = new AppError("ACCOUNT_DISABLED", 403, "Deactivated account");
    const mapped = toAppError(custom);
    expect(mapped.code).toBe("ACCOUNT_DISABLED");
    expect(mapped.statusCode).toBe(403);
    expect(mapped.message).toBe("Deactivated account");
  });
});
