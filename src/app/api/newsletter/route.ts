import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { memoryStore } from "@/server/store";
import { createAdminClient } from "@/lib/supabase/admin";

const DPDP_POLICY_VERSION = "2026.1";
const GENERIC_SUCCESS_MESSAGE = "Successfully subscribed to verified showroom updates.";

const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254, "Email address exceeds maximum length (254 characters)")
    .email("Please enter a valid email address"),
  consent: z.literal(true, {
    errorMap: () => ({ message: "You must provide explicit consent to receive updates" }),
  }),
});

// In-memory sliding window rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  entry.count += 1;
  return false;
}

function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown-client";
}

export async function POST(request: NextRequest) {
  try {
    const clientId = getClientIdentifier(request);
    if (clientId !== "unknown-client" && isRateLimited(clientId)) {
      return NextResponse.json(
        { ok: false, error: "Too many subscription requests. Please try again later." },
        { status: 429 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const parsed = newsletterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();

    // Mock Mode Execution
    if (env.NEXT_PUBLIC_USE_MOCK) {
      const exists = memoryStore.subscribers.some(
        (s) => s.email.toLowerCase() === email
      );

      if (!exists) {
        memoryStore.subscribers.push({
          id: `sub-${Date.now()}`,
          email,
          created_at: new Date().toISOString(),
        });
      }

      // Return identical generic success message to prevent email enumeration
      return NextResponse.json({
        ok: true,
        message: GENERIC_SUCCESS_MESSAGE,
      });
    }

    // Supabase Mode: Execute via Service Role Admin Client
    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { ok: false, error: "Newsletter service unavailable" },
        { status: 500 }
      );
    }

    // 1. Record DPDP consent in public.consents
    const { data: consentRecord, error: consentError } = await adminClient
      .from("consents")
      .insert({
        subject_email: email,
        purpose: "newsletter",
        granted: true,
        policy_version: DPDP_POLICY_VERSION,
        source: "newsletter",
      })
      .select("id")
      .maybeSingle();

    if (consentError) {
      console.error("[newsletter] Failed to record consent:", consentError.message);
    }

    const consentId = consentRecord?.id || null;

    // 2. Check for existing subscriber
    const { data: existingSub, error: selectError } = await adminClient
      .from("newsletter_subscribers")
      .select("id, unsubscribed_at")
      .eq("email", email)
      .maybeSingle();

    if (selectError && selectError.code !== "PGRST116") {
      return NextResponse.json(
        { ok: false, error: "Failed to check subscription status" },
        { status: 500 }
      );
    }

    if (existingSub) {
      // Reactivate if unsubscribed
      if (existingSub.unsubscribed_at) {
        await adminClient
          .from("newsletter_subscribers")
          .update({
            unsubscribed_at: null,
            consent_id: consentId,
          })
          .eq("id", existingSub.id);
      }
      // Return identical generic success message to prevent email enumeration
      return NextResponse.json({
        ok: true,
        message: GENERIC_SUCCESS_MESSAGE,
      });
    }

    // 3. New subscriber insert
    const { error: insertError } = await adminClient
      .from("newsletter_subscribers")
      .insert({
        email,
        consent_id: consentId,
      });

    if (insertError) {
      // 23505 is PostgreSQL unique_violation
      if (insertError.code === "23505") {
        return NextResponse.json({
          ok: true,
          message: GENERIC_SUCCESS_MESSAGE,
        });
      }
      return NextResponse.json(
        { ok: false, error: "Subscription could not be processed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: GENERIC_SUCCESS_MESSAGE,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
