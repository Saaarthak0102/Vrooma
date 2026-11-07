import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeCron } from "@/lib/cron-auth";
import { buildDailyCsv, isValidISTDate, istDateString } from "@/server/services/dms-export";

export const dynamic = "force-dynamic";

const BUCKET = "dms-exports";

/**
 * Daily DMS hand-off. Builds the CSV for one IST day (default: yesterday, so the day is complete) and stores it
 * in the private "dms-exports" bucket as vrooma-dms-YYYY-MM-DD.csv. Re-running the same day overwrites the file.
 * Admins download it from Storage or via GET /api/export/daily-csv?date=...
 */
export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  try {
    const dateParam = new URL(request.url).searchParams.get("date") || istDateString(-1);
    if (!isValidISTDate(dateParam)) {
      return NextResponse.json({ ok: false, error: "date must be YYYY-MM-DD" }, { status: 400 });
    }

    const { csv, leadCount, bookingCount } = await buildDailyCsv(dateParam);
    const admin = createAdminClient();
    const path = `vrooma-dms-${dateParam}.csv`;

    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(path, new Blob([csv], { type: "text/csv" }), { contentType: "text/csv", upsert: true });
    if (uploadErr) {
      console.error(`[cron/dms-export] Upload failed: ${uploadErr.message}`);
      return NextResponse.json({ ok: false, error: "Could not store the export." }, { status: 500 });
    }

    await admin.from("audit_log").insert({
      actor_id: null,
      table_name: "dms_export",
      record_id: dateParam,
      action: "export_daily_csv_stored",
      new_values: { date: dateParam, path, lead_count: leadCount, booking_count: bookingCount },
    });

    return NextResponse.json({ ok: true, data: { date: dateParam, path, leads: leadCount, bookings: bookingCount } });
  } catch (err: any) {
    console.error("[cron/dms-export] failed:", err?.message);
    return NextResponse.json({ ok: false, error: "Export failed." }, { status: 500 });
  }
}

export const POST = GET;
