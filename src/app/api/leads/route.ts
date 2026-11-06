import { NextRequest, NextResponse } from "next/server";
import { createLeadSchema } from "@/lib/validation/lead";
import { createLead, listLeads } from "@/server/repositories/leads";
import { getTrustedClientIp } from "@/lib/network";
import { guardRole } from "@/server/auth/api-guard";
import { recordConsent } from "@/server/privacy/consent";

const leadRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_LEADS_PER_IP_MINUTE = 10;
const MAX_LEADS_PER_PHONE_MINUTE = 5;

function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = leadRateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    leadRateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true; // Allowed
  }
  if (entry.count >= limit) {
    return false; // Exceeded
  }
  entry.count += 1;
  return true;
}

export async function GET(request: NextRequest) {
  // Staff only. Consultants see their own leads; managers and admins see all.
  const session = await guardRole("consultant", "manager", "admin");
  if (!session.ok) return session.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const source = searchParams.get("source") || undefined;
    const search = searchParams.get("search") || undefined;

    const leads = await listLeads({
      status,
      source,
      search,
      assignedTo: session.profile?.role === "consultant" ? session.user.id : undefined,
    });
    return NextResponse.json({ ok: true, data: leads });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Honeypot check: If the hidden honeypot website field is filled, reject silently
    if (body.website && String(body.website).trim().length > 0) {
      return NextResponse.json(
        { ok: false, error: "Spam detected." },
        { status: 400 }
      );
    }

    // 2. IP Rate Limiting
    const ip = getTrustedClientIp(request);
    if (!checkRateLimit(`ip_${ip}`, MAX_LEADS_PER_IP_MINUTE)) {
      return NextResponse.json(
        { ok: false, error: "Too many enquiry requests from this network. Please wait a moment." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
          },
        }
      );
    }

    // 3. Schema validation & normalisation
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    // 4. Phone Rate Limiting
    if (!checkRateLimit(`phone_${parsed.data.phone}`, MAX_LEADS_PER_PHONE_MINUTE)) {
      return NextResponse.json(
        { ok: false, error: "Too many enquiry attempts for this phone number. Please wait a moment." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
          },
        }
      );
    }

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(parsed.data.showroom_id)) {
      return NextResponse.json({ ok: false, error: "Please choose a valid showroom." }, { status: 400 });
    }

    // 5a. Record the explicit DPDP consent (immutable row) and link it to the lead
    let consentId: string;
    try {
      consentId = await recordConsent({
        email: parsed.data.email || null,
        phone: parsed.data.phone,
        purpose: "lead_contact",
        granted: true,
        source: "enquiry",
        consentText: "I consent to Vrooma contacting me about my enquiry under the DPDP Act 2023.",
        ipAddress: ip,
      });
    } catch {
      return NextResponse.json({ ok: false, error: "We could not record your consent. Please try again." }, { status: 500 });
    }

    // 5b. Create lead via RPC (handles deduplication and auto-assignment)
    const lead = await createLead({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      showroom_id: parsed.data.showroom_id,
      model_id: parsed.data.model_id || null,
      used_car_id: parsed.data.used_car_id || null,
      message: parsed.data.message || null,
      source: parsed.data.source,
      consent_id: consentId,
    });

    // Anonymous callers get a receipt only: never the stored row (phone, assignee id, AI fields, internal notes).
    return NextResponse.json(
      { ok: true, data: { ref: (lead as { ref?: string | null }).ref ?? null, assigned: Boolean(lead.assigned_to) } },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[api/leads] create failed:", err?.message);
    return NextResponse.json({ ok: false, error: "We could not submit your enquiry. Please try again." }, { status: 500 });
  }
}

