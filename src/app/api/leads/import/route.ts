import { NextRequest, NextResponse } from "next/server";
import { processLeadCsv } from "@/server/services/csv-import";
import { getViewer } from "@/server/auth/viewer";

export async function POST(request: NextRequest) {
  try {
    const viewer = await getViewer();
    const contentType = request.headers.get("content-type") || "";

    let csvContent = "";
    let filename = "portal_leads.csv";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
      }
      csvContent = await file.text();
      filename = file.name || filename;
    } else {
      const body = await request.json();
      csvContent = body.csv || "";
      filename = body.filename || filename;
    }

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json({ ok: false, error: "CSV string required in body or file" }, { status: 400 });
    }

    const result = await processLeadCsv(csvContent, {
      filename,
      importedBy: viewer.user?.id || null,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

