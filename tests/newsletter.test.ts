import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/newsletter/route";
import { NextRequest } from "next/server";

describe("Newsletter DPDP Consent API", () => {
  it("blocks submission without consent checkbox (400 Bad Request)", async () => {
    const req = new NextRequest("http://localhost:3000/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "buyer@example.com",
        consent: false,
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toContain("consent");
  });

  it("blocks submission with invalid email format (400 Bad Request)", async () => {
    const req = new NextRequest("http://localhost:3000/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "not-an-email",
        consent: true,
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toContain("valid email");
  });

  it("accepts subscription with valid email and explicit consent (200 OK)", async () => {
    const req = new NextRequest("http://localhost:3000/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `subscriber-${Date.now()}@lucknow.org`,
        consent: true,
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.message).toContain("subscribed");
  });
});
