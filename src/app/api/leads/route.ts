import { NextRequest, NextResponse } from "next/server";
import { createLeadSchema } from "@/lib/validation/lead";
import { createLead, listLeads } from "@/server/repositories/leads";
import { getTrustedClientIp } from "@/lib/network";

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

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown-ip";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const source = searchParams.get("source") || undefined;
    const search = searchParams.get("search") || undefined;

    const leads = await listLeads({ status, source, search });
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

    // 5. Create lead via RPC (handles deduplication and auto-assignment)
    const lead = await createLead({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      showroom_id: parsed.data.showroom_id,
      model_id: parsed.data.model_id || null,
      used_car_id: parsed.data.used_car_id || null,
      message: parsed.data.message || null,
      source: parsed.data.source,
    });

    return NextResponse.json({ ok: true, data: lead }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

