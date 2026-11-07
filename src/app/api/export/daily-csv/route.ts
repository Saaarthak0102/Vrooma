import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/server/auth/viewer";
import { authorizeCron } from "@/lib/cron-auth";
import { buildDailyCsv, isValidISTDate, istDateString } from "@/server/services/dms-export";

export async function GET(request: NextRequest) {
  try {
    // 1. Authorization check: CRON_SECRET or Admin/Manager session
    let actorId = "system_cron";

    if ((request.headers.get("authorization") ?? "").startsWith("Bearer ")) {
      // Machine caller: shared timing-safe check (fails closed in production when CRON_SECRET is unset).
      const denied = authorizeCron(request);
      if (denied) return denied;
    } else {
      const viewer = await getViewer();
      if (!viewer.isAuthenticated || !viewer.profile) {
        return NextResponse.json({ ok: false, error: "Unauthorized access" }, { status: 401 });
      }
      if (!["admin", "manager"].includes(viewer.profile.role)) {
        return NextResponse.json({ ok: false, error: "Forbidden: Dealership admin privilege required" }, { status: 403 });
      }
      actorId = viewer.user?.id || "admin_user";
    }

    // 2. Parse date parameter (defaults to today in IST)
    const { searchParams } = new URL(request.url);
    const todayIST = istDateString();
    const dateParam = searchParams.get("date") || todayIST;
    // The value ends up in the SQL range and the download filename: accept only a real YYYY-MM-DD date.
    if (!isValidISTDate(dateParam)) {
      return NextResponse.json({ ok: false, error: "date must be YYYY-MM-DD" }, { status: 400 });
    }

    const { csv: csvContent, leadCount, bookingCount } = await buildDailyCsv(dateParam);
    const admin = createAdminClient();

    // 5. Record export event in audit_log
    try {
      await admin.from("audit_log").insert({
        actor_id: actorId === "system_cron" ? null : actorId,
        table_name: "dms_export",
        record_id: dateParam,
        action: "export_daily_csv",
        new_values: {
          date: dateParam,
          lead_count: leadCount,
          booking_count: bookingCount,
        },
      });
    } catch (auditErr: any) {
      console.warn(`[export] Audit log failed: ${auditErr?.message}`);
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vrooma-dms-${dateParam}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[api/export/daily-csv] failed:", err?.message);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
