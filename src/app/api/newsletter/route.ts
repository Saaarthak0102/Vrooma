import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordConsent, generateUnsubscribeToken } from "@/server/privacy/consent";
import { getTrustedClientIp } from "@/lib/network";
import { env } from "@/lib/env";

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
  website: z.string().optional(), // Honeypot trap
  botCheck: z.string().optional(), // Honeypot trap
});

// Sliding window rate limiter for IPs and emails
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

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

export async function POST(request: NextRequest) {
  try {
    const clientId = getTrustedClientIp(request);
    if (clientId && isRateLimited(`ip:${clientId}`)) {
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

    // Honeypot check: automated spambots filling hidden fields
    if (body.website || body.botCheck) {
      // Silently return generic success without inserting
      return NextResponse.json({ ok: true, message: GENERIC_SUCCESS_MESSAGE });
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

    const email = parsed.data.email.toLowerCase().trim();

    if (isRateLimited(`email:${email}`)) {
      return NextResponse.json(
        { ok: false, error: "Too many requests for this email. Please try again later." },
        { status: 429 }
      );
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { ok: false, error: "Newsletter service unavailable" },
        { status: 500 }
      );
    }

    // 1. Record immutable DPDP consent in public.consents
    let consentId: string | null = null;
    try {
      consentId = await recordConsent({
        email,
        purpose: "newsletter",
        granted: true,
        source: "newsletter",
        consentText: "I consent to receive showroom updates, launch notifications, and festive offers from Vrooma under the DPDP Act 2023.",
      });
    } catch (cErr: any) {
      console.warn(`[newsletter] Consent record warning: ${cErr?.message}`);
    }

    const unsubToken = generateUnsubscribeToken(email);

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
            unsubscribe_token: unsubToken,
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
        unsubscribe_token: unsubToken,
      });

    if (insertError && insertError.code !== "23505") {
      return NextResponse.json(
        { ok: false, error: "Subscription could not be processed" },
        { status: 500 }
      );
    }

    // 4. Queue double opt-in / confirmation welcome email with statutory unsubscribe link
    try {
      const siteUrl = env.NEXT_PUBLIC_SITE_URL || "https://vrooma.in";
      const unsubLink = `${siteUrl}/unsubscribe/${unsubToken}`;

      await adminClient.from("messages_outbox").insert({
        channel: "email",
        to_address: email,
        template: "newsletter_subscription_confirmed",
        body: `Namaste! You are confirmed for Vrooma showroom updates and price notifications. To manage preferences or unsubscribe anytime in compliance with the DPDP Act 2023, click here: ${unsubLink}`,
        idempotency_key: `newsletter_confirm_${email}_${Date.now()}`,
        status: "pending",
      });
    } catch (outboxErr: any) {
      console.warn(`[newsletter] Outbox queue warning: ${outboxErr?.message}`);
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
