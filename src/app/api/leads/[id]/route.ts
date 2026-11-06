import { NextRequest, NextResponse } from "next/server";
import { getLeadById } from "@/server/repositories/leads";
import { updateLeadStatusAction, reassignLeadAction } from "@/server/actions/leads";
import { guardRole } from "@/server/auth/api-guard";
import { z } from "zod";

const patchSchema = z
  .object({
    status: z.enum(["new", "contacted", "test_drive_booked", "negotiating", "won", "lost"]).optional(),
    lost_reason: z.string().max(300).optional(),
    assigned_to: z.string().uuid().optional(),
    reason: z.string().trim().min(3).max(300).optional(),
  })
  .refine((v) => !v.assigned_to || v.reason, { message: "reason is required when reassigning", path: ["reason"] });

/** Staff only; a consultant may only touch a lead assigned to them. Managers and admins may touch any lead. */
async function authorizeLead(id: string) {
  const session = await guardRole("consultant", "manager", "admin");
  if (!session.ok) return { response: session.response } as const;

  const lead = await getLeadById(id);
  if (!lead) {
    return { response: NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 }) } as const;
  }
  if (session.profile?.role === "consultant" && lead.assigned_to !== session.user.id) {
    // 404, not 403: do not confirm that another consultant's lead exists
    return { response: NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 }) } as const;
  }
  return { lead } as const;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeLead(id);
  if ("response" in auth) return auth.response;
  return NextResponse.json({ ok: true, data: auth.lead });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await authorizeLead(id);
    if ("response" in auth) return auth.response;

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid patch payload" }, { status: 400 });
    }

    // Delegate to the server actions: they re-check the role and call the SECURITY DEFINER RPCs with the user's session.
    if (parsed.data.status) {
      const res = await updateLeadStatusAction(id, parsed.data.status, parsed.data.lost_reason);
      if (!res.ok) return NextResponse.json({ ok: false, error: res.error.message }, { status: 400 });
    }
    if (parsed.data.assigned_to) {
      const res = await reassignLeadAction(id, parsed.data.assigned_to, parsed.data.reason ?? "");
      if (!res.ok) return NextResponse.json({ ok: false, error: res.error.message }, { status: 400 });
    }

    const updated = await getLeadById(id);
    return NextResponse.json({ ok: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
