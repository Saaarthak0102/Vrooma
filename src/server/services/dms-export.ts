import { createAdminClient } from "@/lib/supabase/admin";
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

export function isValidISTDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** Today's date in IST as YYYY-MM-DD, shifted by `offsetDays` (use -1 for yesterday). */
export function istDateString(offsetDays = 0, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(now.getTime() + offsetDays * 86_400_000));
}

export interface DailyCsv {
  csv: string;
  leadCount: number;
  bookingCount: number;
}

/** The daily DMS hand-off: every lead and booking created on one IST day, with CSV-injection protection. */
export async function buildDailyCsv(dateParam: string): Promise<DailyCsv> {
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

  return {
    csv: csvRows.join("\r\n"),
    leadCount: leads?.length || 0,
    bookingCount: bookings?.length || 0,
  };
}
