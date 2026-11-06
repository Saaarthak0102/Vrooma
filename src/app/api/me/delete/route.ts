import { NextResponse } from "next/server";
import { requestAccountDeletionAction } from "@/server/actions/profile";
import { guardUser } from "@/server/auth/api-guard";

/**
 * DPDP erasure request for the SIGNED-IN user. Delegates to requestAccountDeletionAction, which queues a
 * data_requests row (7-day cooling-off) and releases upcoming bookings. Signed-out visitors use
 * the verified public intake on /legal/data-rights instead.
 */
export async function POST() {
  const session = await guardUser();
  if (!session.ok) return session.response;

  const result = await requestAccountDeletionAction();
  if (!result.ok) {
    const status = result.error.code === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ ok: false, error: result.error.message }, { status });
  }
  return NextResponse.json({
    ok: true,
    data: { status: "erasure_requested", gracePeriodDays: result.data.gracePeriodDays, requestId: result.data.requestId },
  });
}
