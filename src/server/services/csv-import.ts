import Papa from "papaparse";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeIndianPhone } from "@/lib/phone";
import { AppError } from "@/lib/errors";

export interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: string[];
  importId?: string;
  errorsCsv?: string;
}

export interface CsvImportOptions {
  filename?: string;
  importedBy?: string | null;
}

/**
 * Strips CSV formula injection triggers (=, +, -, @).
 */
export function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();
  if (/^[=+\-@]/.test(str)) {
    str = str.replace(/^[=+\-@]+/, "");
  }
  return str;
}

/**
 * Escapes cell for CSV export to prevent spreadsheet formula injection.
 */
export function escapeCsvCellForExport(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Auto-detects delimiter from the first line of CSV data.
 */
function detectDelimiter(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;

  if (tabs > commas && tabs > semicolons) return "\t";
  if (semicolons > commas) return ";";
  return ",";
}

/**
 * Maps varying CSV column headers to canonical domain field names.
 */
function normalizeHeaderName(header: string): string {
  const clean = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (["name", "fullname", "customername", "leadname", "buyername"].includes(clean)) {
    return "name";
  }
  if (["phone", "mobile", "contact", "contactnumber", "phonenumber"].includes(clean)) {
    return "phone";
  }
  if (["email", "emailaddress"].includes(clean)) {
    return "email";
  }
  if (["model", "modelname", "car", "vehicle", "interestedin"].includes(clean)) {
    return "model";
  }
  if (["notes", "message", "remarks", "comments", "description"].includes(clean)) {
    return "notes";
  }
  if (["sourceref", "leadid", "portalid", "id", "ref"].includes(clean)) {
    return "source_ref";
  }
  if (["showroom", "showroomid", "city", "location"].includes(clean)) {
    return "showroom";
  }
  return header;
}

/**
 * Validates and imports portal lead CSV rows into the dealership database.
 * Enforces size limits, BOM stripping, injection protection, deduplication, and auto-assignment.
 */
export async function processLeadCsv(
  csvString: string,
  options: CsvImportOptions = {}
): Promise<ImportResult> {
  // 1. Strip UTF-8 BOM if present
  let cleanCsv = csvString.replace(/^\uFEFF/, "");

  // 2. Enforce max file size: 2 MB
  const byteLength = Buffer.byteLength(cleanCsv, "utf8");
  if (byteLength > 2 * 1024 * 1024) {
    throw new AppError("VALIDATION_FAILED", 400, "CSV file size exceeds 2 MB limit.");
  }

  // 3. Delimiter auto-detection
  const firstLine = cleanCsv.split(/\r\n|\n|\r/)[0] || "";
  const delimiter = detectDelimiter(firstLine);

  const supabase = createAdminClient();

  // 4. Fetch reference datasets: active models & showrooms
  const [{ data: models }, { data: showrooms }] = await Promise.all([
    supabase.from("models").select("id, name, slug").eq("is_active", true),
    supabase.from("showrooms").select("id, name").eq("is_active", true),
  ]);

  const defaultShowroomId = showrooms?.[0]?.id || "a0000001-0000-0000-0000-000000000001";

  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(cleanCsv, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      transformHeader: (header) => normalizeHeaderName(header),
      complete: async (results) => {
        const rows = results.data;

        // 5. Enforce max 2,000 rows
        if (rows.length > 2000) {
          resolve({
            total: rows.length,
            created: 0,
            skipped: rows.length,
            errors: [`Row count (${rows.length}) exceeds maximum limit of 2,000 rows per import.`],
          });
          return;
        }

        let createdCount = 0;
        let skippedCount = 0;
        const errorList: string[] = [];
        const seenInBatch = new Set<string>();

        // Process rows sequentially or in controlled batches
        for (let i = 0; i < rows.length; i++) {
          const rawRow = rows[i];
          const rowNum = i + 2; // +1 for 0-index, +1 for CSV header row

          // Sanitize cells against formula injection
          const name = sanitizeCsvCell(rawRow.name);
          const rawPhone = sanitizeCsvCell(rawRow.phone);
          const email = sanitizeCsvCell(rawRow.email).toLowerCase();
          const modelRaw = sanitizeCsvCell(rawRow.model);
          const notes = sanitizeCsvCell(rawRow.notes);
          const sourceRef = sanitizeCsvCell(rawRow.source_ref);

          // Validation
          if (!name || name.length < 2) {
            errorList.push(`Row ${rowNum}: Customer name is required (min 2 characters)`);
            skippedCount++;
            continue;
          }

          const normalizedPhone = normalizeIndianPhone(rawPhone);
          if (!normalizedPhone) {
            errorList.push(`Row ${rowNum}: Invalid Indian phone number "${rawPhone}"`);
            skippedCount++;
            continue;
          }

          // Match vehicle model
          let matchedModelId: string | null = null;
          if (modelRaw && models) {
            const mLower = modelRaw.toLowerCase();
            const matched = models.find(
              (m) =>
                m.name.toLowerCase() === mLower ||
                m.slug.toLowerCase() === mLower ||
                m.name.toLowerCase().includes(mLower)
            );
            if (matched) matchedModelId = matched.id;
          }

          // Deduplicate inside the current batch
          const batchDedupeKey = `${normalizedPhone}_${matchedModelId || "none"}`;
          if (seenInBatch.has(batchDedupeKey)) {
            skippedCount++;
            continue;
          }
          seenInBatch.add(batchDedupeKey);

          // Ingest via create_lead RPC (guarantees DB 24h dedupe and SLA assignment)
          try {
            const { data: leadRow, error: leadErr } = await supabase.rpc("create_lead", {
              p_name: name,
              p_phone: normalizedPhone,
              p_showroom_id: defaultShowroomId,
              p_model_id: matchedModelId,
              p_email: email && email.includes("@") ? email : null,
              p_message: notes || `Imported via portal CSV batch`,
              p_source: "portal",
              p_source_ref: sourceRef || null,
            });

            if (leadErr) {
              errorList.push(`Row ${rowNum}: ${leadErr.message}`);
              skippedCount++;
            } else if (leadRow) {
              createdCount++;
            }
          } catch (err: any) {
            errorList.push(`Row ${rowNum}: ${err?.message || "Failed to create lead"}`);
            skippedCount++;
          }
        }

        // Record summary in csv_imports table
        let importId: string | undefined;
        try {
          const { data: importRecord } = await supabase
            .from("csv_imports")
            .insert({
              filename: options.filename || "portal_leads.csv",
              row_count: rows.length,
              imported_by: options.importedBy || null,
            })
            .select("id")
            .single();

          if (importRecord) importId = importRecord.id;
        } catch (dbErr: any) {
          console.warn(`[csv-import] Could not record csv_imports summary: ${dbErr?.message}`);
        }

        resolve({
          total: rows.length,
          created: createdCount,
          skipped: skippedCount,
          errors: errorList,
          importId,
        });
      },
      error: (error: Error) => {
        resolve({
          total: 0,
          created: 0,
          skipped: 0,
          errors: [error.message],
        });
      },
    });
  });
}
