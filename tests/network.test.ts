import { describe, it, expect } from "vitest";
import { getTrustedClientIp } from "@/lib/network";

describe("Network Security: Trusted Client IP Resolution", () => {
  it("prioritizes trusted x-vercel-forwarded-for header over spoofed x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.99, 10.0.0.1", // Attacker injected spoofed header
      "x-vercel-forwarded-for": "203.0.113.50",       // Authentic edge IP from Vercel
    });

    const ip = getTrustedClientIp({ headers });
    expect(ip).toBe("203.0.113.50");
  });

  it("prioritizes cf-connecting-ip when behind Cloudflare proxy", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.99",
      "cf-connecting-ip": "103.21.244.10",
    });

    const ip = getTrustedClientIp({ headers });
    expect(ip).toBe("103.21.244.10");
  });

  it("selects rightmost upstream proxy hop when evaluating multi-hop x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.1.1.1, 10.0.0.1, 192.168.1.10, 49.36.120.45",
    });

    const ip = getTrustedClientIp({ headers });
    expect(ip).toBe("49.36.120.45"); // Rightmost upstream reverse proxy IP
  });

  it("falls back to x-real-ip if edge headers are absent", () => {
    const headers = new Headers({
      "x-real-ip": "157.34.88.12",
    });

    const ip = getTrustedClientIp({ headers });
    expect(ip).toBe("157.34.88.12");
  });

  it("returns 127.0.0.1 fallback when no headers exist", () => {
    const headers = new Headers();
    const ip = getTrustedClientIp({ headers });
    expect(ip).toBe("127.0.0.1");
  });
});

