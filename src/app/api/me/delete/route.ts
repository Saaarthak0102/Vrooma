import { NextResponse, type NextRequest } from "next/server";
import { requestAccountDeletionAction, cancelAccountDeletionAction } from "@/server/actions/profile";
import { guardUser, guardOrigin } from "@/server/auth/api-guard";

/**
 * DPDP erasure request for the SIGNED-IN user. Delegates to requestAccountDeletionAction, which queues a
 * data_requests row (7-day cooling-off) and releases upcoming bookings. Signed-out visitors use
 * the verified public intake on /legal/data-rights instead.
 */
export async function POST(request: NextRequest) {
  const blocked = guardOrigin(request);
  if (blocked) return blocked;

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

/** Cancel a pending erasure request during the 7-day cooling-off window (restores the account). */
export async function DELETE(request: NextRequest) {
  const blocked = guardOrigin(request);
  if (blocked) return blocked;

  const session = await guardUser();
  if (!session.ok) return session.response;

  const result = await cancelAccountDeletionAction();
  if (!result.ok) {
    const status = result.error.code === "FORBIDDEN" ? 403 : result.error.code === "CONFLICT" ? 409 : 400;
    return NextResponse.json({ ok: false, error: result.error.message }, { status });
  }
  return NextResponse.json({ ok: true, data: { status: "erasure_cancelled", requestId: result.data.requestId } });
}
