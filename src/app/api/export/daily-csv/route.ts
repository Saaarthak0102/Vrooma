import { NextRequest, NextResponse } from "next/server";
import { memoryStore } from "@/server/store";
import Papa from "papaparse";

export async function GET(request: NextRequest) {
  try {
    const leads = memoryStore.leads.map((l) => ({
      lead_id: l.id,
      customer_name: l.name,
      phone: l.phone,
      email: l.email || "",
      model_interest: l.model_name || "",
      status: l.status,
      assigned_consultant: l.assigned_consultant_name || "",
      created_at: l.created_at,
    }));

    const csv = Papa.unparse(leads);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vrooma-dms-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

