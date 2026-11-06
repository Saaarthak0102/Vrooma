import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/server/auth/viewer";
import { authorizeCron } from "@/lib/cron-auth";
import { getISTDayRangeUTC } from "@/server/repositories/slots";
import { escapeCsvCellForExport } from "@/server/services/csv-import";
import { maskVehicleReg } from "@/lib/validation/vehicle";

function formatISTDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

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
    const todayIST = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    const dateParam = searchParams.get("date") || todayIST;
    // The value ends up in the SQL range and the download filename: accept only a real YYYY-MM-DD date.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam) || Number.isNaN(Date.parse(`${dateParam}T00:00:00Z`))) {
      return NextResponse.json({ ok: false, error: "date must be YYYY-MM-DD" }, { status: 400 });
    }

    const { startUTC, endUTC } = getISTDayRangeUTC(dateParam);
    const admin = createAdminClient();

    // 3. Fetch Leads and Bookings for the IST day
    const [{ data: leads }, { data: bookings }] = await Promise.all([
      admin
        .from("leads")
        .select(`
          ref,
          name,
          phone,
          email,
          source,
          status,
          created_at,
          showrooms ( name ),
          models ( name ),
          profiles:assigned_to ( full_name )
        `)
        .gte("created_at", startUTC)
        .lte("created_at", endUTC)
        .order("created_at", { ascending: true }),

      admin
        .from("bookings")
        .select(`
          ref,
          kind,
          status,
          vehicle_info,
          created_at,
          slots (
            starts_at,
            ends_at,
            showrooms ( name ),
            workshops ( name )
          ),
          profiles:user_id (
            full_name,
            phone
          )
        `)
        .gte("created_at", startUTC)
        .lte("created_at", endUTC)
        .order("created_at", { ascending: true }),
    ]);

    // 4. Construct CSV rows with CSV injection protection
    const csvRows: string[] = [];

    // Header Section 1: Inbound Leads
    csvRows.push("RECORD_TYPE,REFERENCE,CUSTOMER_NAME,PHONE,EMAIL,SHOWROOM,MODEL,SOURCE,STATUS,ASSIGNED_CONSULTANT,CREATED_AT_IST");

    for (const lead of leads || []) {
      const leadRow = [
        "LEAD",
        lead.ref || "",
        lead.name || "",
        lead.phone || "",
        lead.email || "",
        (lead.showrooms as any)?.name || "Hazratganj Flagship",
        (lead.models as any)?.name || "General Enquiry",
        lead.source || "web",
        lead.status || "new",
        (lead.profiles as any)?.full_name || "Unassigned",
        formatISTDate(lead.created_at),
      ];
      csvRows.push(leadRow.map(escapeCsvCellForExport).join(","));
    }

    // Header Section 2: Bookings
    csvRows.push("");
    csvRows.push("RECORD_TYPE,BOOKING_REF,KIND,CUSTOMER_NAME,PHONE,FACILITY,VEHICLE_INFO,APPOINTMENT_TIME_IST,STATUS,CREATED_AT_IST");

    for (const b of bookings || []) {
      const slot: any = b.slots;
      const userProf: any = b.profiles;
      const vInfo: any = b.vehicle_info || {};
      const facilityName = slot?.showrooms?.name || slot?.workshops?.name || "Vrooma Facility";
      const vehicleDesc = vInfo.reg_no
        ? `${vInfo.model_name || "Vehicle"} (${maskVehicleReg(vInfo.reg_no)})`
        : vInfo.model_name || "Demo Vehicle";

      const timeRange = slot?.starts_at
        ? `${formatISTDate(slot.starts_at)} - ${formatISTDate(slot.ends_at).slice(-8)}`
        : "Standard Slot";

      const bookingRow = [
        "BOOKING",
        b.ref || "",
        b.kind || "test_drive",
        userProf?.full_name || "Customer",
        userProf?.phone || "",
        facilityName,
        vehicleDesc,
        timeRange,
        b.status || "confirmed",
        formatISTDate(b.created_at),
      ];
      csvRows.push(bookingRow.map(escapeCsvCellForExport).join(","));
    }

    const csvContent = csvRows.join("\r\n");

    // 5. Record export event in audit_log
    try {
      await admin.from("audit_log").insert({
        actor_id: actorId === "system_cron" ? null : actorId,
        table_name: "dms_export",
        record_id: dateParam,
        action: "export_daily_csv",
        new_values: {
          date: dateParam,
          lead_count: leads?.length || 0,
          booking_count: bookings?.length || 0,
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
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
