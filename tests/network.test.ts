import { describe, it, expect } from "vitest";
import { getTrustedClientIp, parseTrustedProxy, UNKNOWN_IP_BUCKET } from "@/lib/network";

const h = (init: Record<string, string>) => ({ headers: new Headers(init) });

describe("TRUSTED_PROXY parsing", () => {
  it("accepts vercel and cloudflare, case-insensitively", () => {
    expect(parseTrustedProxy("vercel")).toBe("vercel");
    expect(parseTrustedProxy(" Cloudflare ")).toBe("cloudflare");
  });

  it("fails closed to none for unset, empty or unknown values", () => {
    expect(parseTrustedProxy(undefined)).toBe("none");
    expect(parseTrustedProxy("")).toBe("none");
    expect(parseTrustedProxy("nginx")).toBe("none");
  });
});

describe("mode: vercel", () => {
  it("uses x-vercel-forwarded-for and ignores a spoofed cf-connecting-ip", () => {
    const ip = getTrustedClientIp(
      h({ "x-vercel-forwarded-for": "203.0.113.50", "cf-connecting-ip": "198.51.100.99" }),
      { proxy: "vercel" }
    );
    expect(ip).toBe("203.0.113.50");
  });

  it("ignores cf-connecting-ip, true-client-ip and x-real-ip when no vercel value exists", () => {
    const ip = getTrustedClientIp(
      h({ "cf-connecting-ip": "198.51.100.1", "true-client-ip": "198.51.100.2", "x-real-ip": "198.51.100.3" }),
      { proxy: "vercel" }
    );
    expect(ip).toBe(UNKNOWN_IP_BUCKET);
  });

  it("platform value beats a client-sent x-forwarded-for (documented assumption: Vercel overwrites both)", () => {
    const ip = getTrustedClientIp(
      h({ "x-vercel-forwarded-for": "203.0.113.50", "x-forwarded-for": "198.51.100.99, 203.0.113.50" }),
      { proxy: "vercel" }
    );
    expect(ip).toBe("203.0.113.50");
  });

  it("falls back to the first x-forwarded-for entry (Vercel-written) when the vercel header is absent", () => {
    const ip = getTrustedClientIp(h({ "x-forwarded-for": "203.0.113.7" }), { proxy: "vercel" });
    expect(ip).toBe("203.0.113.7");
  });

  it("rejects non-IP garbage in the header instead of using it as a rate-limit key", () => {
    const ip = getTrustedClientIp(h({ "x-vercel-forwarded-for": "not-an-ip; DROP TABLE" }), { proxy: "vercel" });
    expect(ip).toBe(UNKNOWN_IP_BUCKET);
  });
});

describe("mode: cloudflare", () => {
  it("uses cf-connecting-ip only", () => {
    const ip = getTrustedClientIp(
      h({ "cf-connecting-ip": "103.21.244.10", "x-forwarded-for": "198.51.100.99", "x-vercel-forwarded-for": "198.51.100.98" }),
      { proxy: "cloudflare" }
    );
    expect(ip).toBe("103.21.244.10");
  });

  it("ignores x-vercel-forwarded-for and x-forwarded-for when cf-connecting-ip is absent", () => {
    const ip = getTrustedClientIp(
      h({ "x-vercel-forwarded-for": "198.51.100.98", "x-forwarded-for": "198.51.100.99" }),
      { proxy: "cloudflare" }
    );
    expect(ip).toBe(UNKNOWN_IP_BUCKET);
  });
});

describe("mode: none (default)", () => {
  const spoofed = h({
    "x-forwarded-for": "198.51.100.99",
    "x-vercel-forwarded-for": "198.51.100.98",
    "cf-connecting-ip": "198.51.100.97",
    "x-real-ip": "198.51.100.96",
    "true-client-ip": "198.51.100.95",
  });

  it("ignores every forwarded header", () => {
    expect(getTrustedClientIp(spoofed, { proxy: "none" })).toBe(UNKNOWN_IP_BUCKET);
  });

  it("uses the socket address when the runtime supplies one", () => {
    expect(getTrustedClientIp(spoofed, { proxy: "none", socketIp: "49.36.120.45" })).toBe("49.36.120.45");
  });

  it("defaults to none when TRUSTED_PROXY is unset", () => {
    const previous = process.env.TRUSTED_PROXY;
    delete process.env.TRUSTED_PROXY;
    try {
      expect(getTrustedClientIp(spoofed)).toBe(UNKNOWN_IP_BUCKET);
    } finally {
      if (previous !== undefined) process.env.TRUSTED_PROXY = previous;
    }
  });

  it("rotating a spoofed header cannot create a fresh rate-limit bucket", () => {
    const keys = new Set(
      ["1.1.1.1", "2.2.2.2", "3.3.3.3"].map((ip) => getTrustedClientIp(h({ "x-forwarded-for": ip }), { proxy: "none" }))
    );
    expect(keys.size).toBe(1);
  });
});
