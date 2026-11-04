import { describe, it, expect, vi } from "vitest";
import {
  sanitizeCsvCell,
  escapeCsvCellForExport,
  processLeadCsv,
} from "@/server/services/csv-import";

describe("Phase 4: CSV Import & Export Protections", () => {
  describe("CSV Injection Formula Neutralisation", () => {
    it("neutralises dangerous spreadsheet formula prefixes on import", () => {
      expect(sanitizeCsvCell("=CMD('calc')")).toBe("CMD('calc')");
      expect(sanitizeCsvCell("+1+2")).toBe("1+2");
      expect(sanitizeCsvCell("-5*10")).toBe("5*10");
      expect(sanitizeCsvCell("@SUM(A1:A10)")).toBe("SUM(A1:A10)");
      expect(sanitizeCsvCell("Normal Lead Name")).toBe("Normal Lead Name");
    });

    it("escapes formula triggers on export by prefixing with single quote", () => {
      expect(escapeCsvCellForExport("=1+1")).toBe("\"'=1+1\"");
      expect(escapeCsvCellForExport("+919876543210")).toBe("\"'+919876543210\"");
      expect(escapeCsvCellForExport("@SUM")).toBe("\"'@SUM\"");
      expect(escapeCsvCellForExport("Plain Value")).toBe("Plain Value");
      expect(escapeCsvCellForExport('Contains "Quotes"')).toBe('"Contains ""Quotes"""');
    });
  });

  describe("CSV Parsing Edge Cases", () => {
    it("strips UTF-8 BOM mark cleanly", async () => {
      const csvWithBom = "\uFEFFname,phone,email\nRajesh Sharma,9876543210,rajesh@example.com";
      const result = await processLeadCsv(csvWithBom);
      expect(result.total).toBe(1);
    });

    it("auto-detects semicolon delimiters", async () => {
      const semicolonCsv = "name;phone;email\nPriya Verma;9876543211;priya@example.com";
      const result = await processLeadCsv(semicolonCsv);
      expect(result.total).toBe(1);
    });

    it("rejects CSV exceeding 2,000 row hard limit", async () => {
      let largeCsv = "name,phone,email\n";
      for (let i = 0; i < 2005; i++) {
        largeCsv += `Lead ${i},9876543210,lead${i}@example.com\n`;
      }
      const result = await processLeadCsv(largeCsv);
      expect(result.created).toBe(0);
      expect(result.errors[0]).toContain("exceeds maximum limit of 2,000 rows");
    });

    it("deduplicates identical phone numbers inside the file batch", async () => {
      const duplicateCsv = `name,phone,email
Aditya Mishra,9876543210,aditya1@example.com
Aditya Mishra,9876543210,aditya2@example.com`;

      const result = await processLeadCsv(duplicateCsv);
      expect(result.total).toBe(2);
      expect(result.skipped).toBeGreaterThanOrEqual(1);
    });

    it("flags invalid phone numbers with row-level error reporting", async () => {
      const invalidPhoneCsv = `name,phone,email
Valid Name,12345,bad@example.com`;

      const result = await processLeadCsv(invalidPhoneCsv);
      expect(result.total).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors[0]).toContain("Invalid Indian phone number");
    });
  });
});

