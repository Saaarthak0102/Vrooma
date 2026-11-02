import { NextRequest, NextResponse } from "next/server";
import { createLeadSchema } from "@/lib/validation/lead";
import { createLead, listLeads } from "@/server/repositories/leads";

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
    const parsed = createLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const lead = await createLead(parsed.data);
    return NextResponse.json({ ok: true, data: lead }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
