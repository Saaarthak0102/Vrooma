import { describe, it, expect, vi } from "vitest";

// These tests run the real import code, which creates leads through the create_lead RPC. Against the real DEV
// database that left hundreds of fake leads behind on every run, so the database is faked here.
const rpcCalls = vi.hoisted(() => [] as { name: string; args: Record<string, unknown> }[]);
vi.mock("@/lib/supabase/admin", () => {
  const rows = (table: string) =>
    table === "showrooms" ? [{ id: "a0000001-0000-0000-0000-000000000001", name: "Hazratganj" }] : table === "models" ? [] : null;
  return {
    createAdminClient: () => ({
      from: (table: string) => {
        const c: any = {
          select: () => c,
          eq: () => c,
          insert: () => c,
          single: async () => ({ data: { id: "csv-import-test" }, error: null }),
          then: (resolve: (v: unknown) => void) => resolve({ data: rows(table), error: null }),
        };
        return c;
      },
      rpc: async (name: string, args: Record<string, unknown>) => {
        rpcCalls.push({ name, args });
        return { data: { id: `lead-${rpcCalls.length}`, ref: `LD-MOCK-${rpcCalls.length}`, created_at: new Date().toISOString() }, error: null };
      },
    }),
  };
});

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

    it("handles all required Indian phone formats without stripping leading plus", async () => {
      const csv = `name,phone,email,notes
Customer One,+919876543210,cust1@example.com,Interested in SUV
Customer Two,+91 98765 43211,cust2@example.com,Wants automatic
Customer Three,09876543212,cust3@example.com,Looking for petrol
Customer Four,919876543213,cust4@example.com,Test drive required`;

      const result = await processLeadCsv(csv);
      expect(result.total).toBe(4);
      // All 4 phone formats must be valid (no errors on phone normalization)
      const phoneErrors = result.errors.filter((e) => e.includes("Invalid Indian phone number"));
      expect(phoneErrors).toHaveLength(0);
    });

    it("parses CSV with BOM, semicolon delimiter, and formula cell in message field", async () => {
      const complexCsv = `\uFEFFname;phone;email;notes
Sanjay Gupta;+919876543214;sanjay@example.com;=1+1`;

      const result = await processLeadCsv(complexCsv);
      expect(result.total).toBe(1);
      const phoneErrors = result.errors.filter((e) => e.includes("Invalid Indian phone number"));
      expect(phoneErrors).toHaveLength(0);

      // Verify that when exported, formula cells in notes/messages are safely escaped with single quote
      const exportedNote = escapeCsvCellForExport("=1+1");
      expect(exportedNote).toBe("\"'=1+1\"");
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

  it("never touches the real database: every lead goes through the fake create_lead", async () => {
    const before = rpcCalls.length;
    await processLeadCsv("name,phone,email\nFake Person,9876543299,fake@example.com");
    expect(rpcCalls.length).toBe(before + 1);
    expect(rpcCalls.every((c) => c.name === "create_lead")).toBe(true);
  });
});

