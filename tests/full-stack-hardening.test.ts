import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));

import { rateLimit, resetRateLimitFallback } from "@/server/security/rate-limit";
import { deliverMessage } from "@/server/services/message-providers";
import { emailSubject, renderEmail } from "@/server/services/email-template";
import { istDateString, isValidISTDate } from "@/server/services/dms-export";

describe("shared rate limiter", () => {
  beforeEach(() => {
    rpc.mockReset();
    resetRateLimitFallback();
  });

  it("uses the database answer when it is available", async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: false, error: null });
    expect(await rateLimit("k", 5, 60)).toBe(true);
    expect(await rateLimit("k", 5, 60)).toBe(false);
    expect(rpc).toHaveBeenCalledWith("check_rate_limit", { p_key: "k", p_limit: 5, p_window_seconds: 60 });
  });

  it("falls back to a local counter when the database call fails, still enforcing the limit", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "down" } });
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit("fallback-key", 3, 60));
    expect(results).toEqual([true, true, true, false]);
  });
});

describe("message providers", () => {
  it("never reports WhatsApp or SMS as sent while no provider is connected", async () => {
    const wa = await deliverMessage("whatsapp", "+919876500001", "booking_confirmation", "hi");
    const sms = await deliverMessage("sms", "+919876500001", "booking_confirmation", "hi");
    expect(wa.status).toBe("skipped");
    expect(sms.status).toBe("skipped");
  });
});

describe("email template", () => {
  it("has a subject per known template and a readable fallback", () => {
    expect(emailSubject("booking_confirmation")).toBe("Your Vrooma booking is confirmed");
    expect(emailSubject("dpdp_erasure_request_received")).toBe("We received your data request");
    expect(emailSubject("some_new_template")).toBe("Vrooma: Some new template");
  });

  it("escapes the body so user text cannot inject markup, and keeps line breaks", () => {
    const { html, text } = renderEmail("consultant_reply", '<script>alert(1)</script>\nline two');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<br>");
    expect(text).toContain("<script>");
  });
});

describe("daily DMS export dates", () => {
  it("validates real dates only", () => {
    expect(isValidISTDate("2026-11-07")).toBe(true);
    expect(isValidISTDate("2026-13-45")).toBe(false);
    expect(isValidISTDate("../../etc")).toBe(false);
  });

  it("computes IST day boundaries (yesterday after IST midnight)", () => {
    // 2026-11-07 19:00 UTC is already 2026-11-08 00:30 IST.
    const now = new Date("2026-11-07T19:00:00Z");
    expect(istDateString(0, now)).toBe("2026-11-08");
    expect(istDateString(-1, now)).toBe("2026-11-07");
  });
});
