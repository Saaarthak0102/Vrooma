import { NextRequest, NextResponse } from "next/server";
import { getLeadById } from "@/server/repositories/leads";
import { generateLeadCopilot } from "@/server/ai/lead-copilot";
import { guardRole } from "@/server/auth/api-guard";

export async function POST(request: NextRequest) {
  const session = await guardRole("consultant", "manager", "admin");
  if (!session.ok) return session.response;

  try {
    const { leadId } = await request.json();
    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json({ ok: false, error: "leadId required" }, { status: 400 });
    }

    const lead = await getLeadById(leadId);
    // A consultant may only brief themselves on their own leads (404 hides other people's leads)
    if (!lead || (session.profile?.role === "consultant" && lead.assigned_to !== session.user.id)) {
      return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
    }

    const result = await generateLeadCopilot(lead);
    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    console.error("[api/ai/lead-copilot] failed:", err?.message);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
