import Papa from "papaparse";
import { csvLeadRowSchema, CsvLeadRowInput } from "@/lib/validation/csv-row";
import { createLead } from "@/server/repositories/leads";
import { memoryStore } from "@/server/store";

export interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: string[];
}

/**
 * Parses and imports CSV rows into leads, deduplicating by phone.
 */
export async function processLeadCsv(csvString: string): Promise<ImportResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let created = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (let i = 0; i < results.data.length; i++) {
          const row = results.data[i];
          const parsed = csvLeadRowSchema.safeParse(row);

          if (!parsed.success) {
            errors.push(`Row ${i + 1}: ${parsed.error.errors.map((e) => e.message).join(", ")}`);
            skipped++;
            continue;
          }

          const data: CsvLeadRowInput = parsed.data;

          // Deduplicate by phone
          const existing = memoryStore.leads.find((l) => l.phone === data.phone);
          if (existing) {
            skipped++;
            continue;
          }

          try {
            await createLead({
              name: data.name,
              phone: data.phone,
              email: data.email || null,
              showroom_id: "sr-hazratganj",
              message: data.notes || "Imported from portal CSV",
              source: "portal",
            });
            created++;
          } catch (err: any) {
            errors.push(`Row ${i + 1}: ${err?.message || "Failed to save lead"}`);
            skipped++;
          }
        }

        resolve({
          total: results.data.length,
          created,
          skipped,
          errors,
        });
      },
      error: (error) => {
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
