import { describe, it, expect } from "vitest";
import { sortRows, filterRows, distinctValues, toCsv, GridColumnMeta } from "@/lib/grid";

interface Row {
  name: string;
  stage: string;
  amount: number | null;
}

const columns: GridColumnMeta<Row>[] = [
  { id: "name", header: "Name", accessor: (r) => r.name },
  { id: "stage", header: "Stage", accessor: (r) => r.stage, filter: "select" },
  { id: "amount", header: "Amount", accessor: (r) => r.amount },
];

const rows: Row[] = [
  { name: "Bela", stage: "new", amount: 200 },
  { name: "asha", stage: "won", amount: 50 },
  { name: "Chirag", stage: "new", amount: null },
  { name: "Dev", stage: "lost", amount: 1000 },
];

describe("sortRows", () => {
  it("sorts numbers numerically, not as text", () => {
    const sorted = sortRows(rows, columns, { columnId: "amount", direction: "asc" });
    expect(sorted.map((r) => r.amount)).toEqual([50, 200, 1000, null]);
  });

  it("keeps empty values last in both directions", () => {
    const desc = sortRows(rows, columns, { columnId: "amount", direction: "desc" });
    expect(desc.map((r) => r.amount)).toEqual([1000, 200, 50, null]);
  });

  it("sorts text case-insensitively", () => {
    const sorted = sortRows(rows, columns, { columnId: "name", direction: "asc" });
    expect(sorted.map((r) => r.name)).toEqual(["asha", "Bela", "Chirag", "Dev"]);
  });

  it("returns the original order with no sort", () => {
    expect(sortRows(rows, columns, null)).toBe(rows);
  });
});

describe("filterRows", () => {
  it("searches across all columns, case-insensitively", () => {
    expect(filterRows(rows, columns, "CHI", {}).map((r) => r.name)).toEqual(["Chirag"]);
  });

  it("applies exact column filters and ignores 'all'", () => {
    expect(filterRows(rows, columns, "", { stage: "new" })).toHaveLength(2);
    expect(filterRows(rows, columns, "", { stage: "all" })).toHaveLength(4);
  });

  it("combines search and filters", () => {
    expect(filterRows(rows, columns, "bela", { stage: "won" })).toHaveLength(0);
  });
});

describe("distinctValues", () => {
  it("returns sorted unique non-empty values", () => {
    expect(distinctValues(rows, columns[1])).toEqual(["lost", "new", "won"]);
  });
});

describe("toCsv", () => {
  it("writes a header and quotes cells with commas or quotes", () => {
    const csv = toCsv([{ name: 'A, "B"', stage: "new", amount: 5 }], columns);
    expect(csv).toBe('Name,Stage,Amount\r\n"A, ""B""",new,5');
  });

  it("neutralises spreadsheet formulas in text", () => {
    const csv = toCsv([{ name: "=HYPERLINK(\"x\")", stage: "@cmd", amount: -5 }], columns);
    const dataLine = csv.split("\r\n")[1];
    expect(dataLine.startsWith("\"'=HYPERLINK")).toBe(true);
    expect(dataLine).toContain("'@cmd");
    // Real negative numbers stay numeric.
    expect(dataLine.endsWith(",-5")).toBe(true);
  });
});
