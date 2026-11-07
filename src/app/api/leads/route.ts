import { NextRequest, NextResponse } from "next/server";
import { createLeadSchema } from "@/lib/validation/lead";
import { createLead, listLeads } from "@/server/repositories/leads";
import { getTrustedClientIp } from "@/lib/network";
import { guardRole, guardOrigin } from "@/server/auth/api-guard";
import { rateLimit } from "@/server/security/rate-limit";
import { recordConsent } from "@/server/privacy/consent";

const MAX_LEADS_PER_IP_MINUTE = 10;
const MAX_LEADS_PER_PHONE_MINUTE = 5;

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
    console.error("[api/leads] failed:", err?.message);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const blocked = guardOrigin(request);
  if (blocked) return blocked;

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
    if (!(await rateLimit(`lead_ip_${ip}`, MAX_LEADS_PER_IP_MINUTE, 60))) {
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
    if (!(await rateLimit(`lead_phone_${parsed.data.phone}`, MAX_LEADS_PER_PHONE_MINUTE, 60))) {
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

