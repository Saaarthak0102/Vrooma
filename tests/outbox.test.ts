import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendEmail } from "@/server/services/outbox";

describe("Outbox Worker & Email Delivery Integrity", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("strictly throws in production when RESEND_API_KEY is missing, preventing fake success", async () => {
    process.env.APP_ENV = "production";
    delete process.env.RESEND_API_KEY;

    await expect(
      sendEmail("customer@example.com", "test_drive_booking", "Your test drive is booked.")
    ).rejects.toThrow(/Missing RESEND_API_KEY in production/);
  });

  it("allows simulated delivery in development/test environments when key is absent", async () => {
    process.env.APP_ENV = "development";
    delete process.env.RESEND_API_KEY;

    await expect(
      sendEmail("customer@example.com", "test_drive_booking", "Your test drive is booked.")
    ).resolves.toBeUndefined();
  });
});

