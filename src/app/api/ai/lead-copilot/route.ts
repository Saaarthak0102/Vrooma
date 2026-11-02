import { NextRequest, NextResponse } from "next/server";
import { getLeadById } from "@/server/repositories/leads";
import { generateLeadCopilot } from "@/server/ai/lead-copilot";

export async function POST(request: NextRequest) {
  try {
    const { leadId } = await request.json();
    if (!leadId) {
      return NextResponse.json({ ok: false, error: "leadId required" }, { status: 400 });
    }

    const lead = await getLeadById(leadId);
    if (!lead) {
      return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
    }

    const result = await generateLeadCopilot(lead);
    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
