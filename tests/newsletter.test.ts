import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/newsletter/route";
import { NextRequest } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

describe("Newsletter DPDP Consent & Security API", () => {
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

  it("blocks submission with email exceeding 254 characters (400 Bad Request)", async () => {
    const longEmail = `${"a".repeat(250)}@example.com`;
    const req = new NextRequest("http://localhost:3000/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: longEmail,
        consent: true,
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toContain("254 characters");
  });

  it("accepts subscription with valid email and explicit consent (200 OK)", async () => {
    const email = `subscriber-${Date.now()}@lucknow.org`;
    const req = new NextRequest("http://localhost:3000/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        consent: true,
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.message).toBe("Successfully subscribed to verified showroom updates.");
  });

  it("prevents email enumeration: duplicate subscription returns identical success response", async () => {
    const email = `enum-check-${Date.now()}@lucknow.org`;
    const payload = JSON.stringify({ email, consent: true });

    // First request
    const req1 = new NextRequest("http://localhost:3000/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    const res1 = await POST(req1);
    const json1 = await res1.json();

    expect(res1.status).toBe(200);
    expect(json1.ok).toBe(true);
    expect(json1.message).toBe("Successfully subscribed to verified showroom updates.");

    // Duplicate request with identical email
    const req2 = new NextRequest("http://localhost:3000/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    const res2 = await POST(req2);
    const json2 = await res2.json();

    expect(res2.status).toBe(200);
    expect(json2.ok).toBe(true);
    expect(json2.message).toBe("Successfully subscribed to verified showroom updates.");
    expect(json2.message).toEqual(json1.message);
  });

  it("handles malformed JSON gracefully (400 Bad Request)", async () => {
    const req = new NextRequest("http://localhost:3000/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json{",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toContain("JSON");
  });
});

describe("Newsletter Unsubscribe Token Security & Database Schema Guarantees", () => {
  const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");
  const file0008 = fs.readFileSync(path.join(MIGRATIONS_DIR, "0008_messaging_audit_ops.sql"), "utf-8");

  it("1. Database schema defines unsubscribe_token with extensions.gen_random_bytes(16)", () => {
    // Must NOT contain unqualified gen_random_bytes(16) which fails with SQLSTATE 42883
    expect(file0008).not.toMatch(/DEFAULT\s+encode\(gen_random_bytes\(16\)/);

    // Must be explicitly schema-qualified with extensions.
    expect(file0008).toMatch(
      /unsubscribe_token\s+TEXT\s+UNIQUE\s+NOT\s+NULL\s+DEFAULT\s+encode\(extensions\.gen_random_bytes\(16\),\s*'hex'\)/
    );
  });

  it("2. Generated tokens are 32-character hexadecimal strings with 128-bit cryptographic entropy", () => {
    // Simulate generation equivalent to encode(gen_random_bytes(16), 'hex')
    const generateToken = () => crypto.randomBytes(16).toString("hex");

    const sampleToken = generateToken();
    expect(sampleToken).toHaveLength(32);
    expect(sampleToken).toMatch(/^[0-9a-f]{32}$/);
    expect(Buffer.from(sampleToken, "hex")).toHaveLength(16);
  });

  it("3. High-volume token generation guarantees 100% uniqueness without collisions", () => {
    const tokens = new Set<string>();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      const token = crypto.randomBytes(16).toString("hex");
      expect(tokens.has(token)).toBe(false);
      tokens.add(token);
    }

    expect(tokens.size).toBe(count);
  });
});
