import { NextRequest, NextResponse } from "next/server";
import { updateLeadStatus, reassignLead, getLeadById } from "@/server/repositories/leads";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["new", "contacted", "test_drive_booked", "negotiating", "won", "lost"]).optional(),
  assigned_to: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) {
    return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: lead });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid patch payload" }, { status: 400 });
    }

    if (parsed.data.status) {
      await updateLeadStatus(id, parsed.data.status);
    }
    if (parsed.data.assigned_to) {
      await reassignLead(id, parsed.data.assigned_to);
    }

    const updated = await getLeadById(id);
    return NextResponse.json({ ok: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

