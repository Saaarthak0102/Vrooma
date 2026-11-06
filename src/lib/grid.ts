/**
 * Pure helpers behind the spreadsheet-style DataGrid (sorting, filtering, CSV export).
 * Kept free of React so they are unit-testable.
 */

export type GridValue = string | number | boolean | null | undefined;

export interface GridColumnMeta<T> {
  id: string;
  header: string;
  /** Plain value used for sorting, filtering and CSV export. */
  accessor: (row: T) => GridValue;
  sortable?: boolean;
  /** "select" renders a dropdown of the distinct values in this column. */
  filter?: "select";
}

export interface GridSort {
  columnId: string;
  direction: "asc" | "desc";
}

function toComparable(value: GridValue): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  return value.toLowerCase();
}

/** Stable sort: equal rows keep their original order. Empty values always sort last. */
export function sortRows<T>(rows: T[], columns: GridColumnMeta<T>[], sort: GridSort | null): T[] {
  if (!sort) return rows;
  const column = columns.find((c) => c.id === sort.columnId);
  if (!column) return rows;
  const dir = sort.direction === "asc" ? 1 : -1;

  return rows
    .map((row, index) => ({ row, index, value: toComparable(column.accessor(row)) }))
    .sort((a, b) => {
      const aEmpty = a.value === "";
      const bEmpty = b.value === "";
      if (aEmpty && bEmpty) return a.index - b.index;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      if (a.value < b.value) return -1 * dir;
      if (a.value > b.value) return 1 * dir;
      return a.index - b.index;
    })
    .map((x) => x.row);
}

/** Global text search across every column, AND per-column exact-match filters. */
export function filterRows<T>(
  rows: T[],
  columns: GridColumnMeta<T>[],
  search: string,
  columnFilters: Record<string, string>
): T[] {
  const query = search.trim().toLowerCase();
  const active = Object.entries(columnFilters).filter(([, v]) => v && v !== "all");

  return rows.filter((row) => {
    for (const [columnId, wanted] of active) {
      const column = columns.find((c) => c.id === columnId);
      if (!column) continue;
      if (String(column.accessor(row) ?? "") !== wanted) return false;
    }
    if (!query) return true;
    return columns.some((c) => String(c.accessor(row) ?? "").toLowerCase().includes(query));
  });
}

/** Distinct, sorted, non-empty values of a column (for select filters). */
export function distinctValues<T>(rows: T[], column: GridColumnMeta<T>): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const v = column.accessor(row);
    if (v !== null && v !== undefined && String(v) !== "") set.add(String(v));
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * CSV for the rows currently shown. Cells starting with = + - @ are prefixed with an apostrophe so that
 * opening the file in Excel can never execute a formula smuggled in through user-entered text.
 */
export function toCsv<T>(rows: T[], columns: GridColumnMeta<T>[]): string {
  const escape = (raw: GridValue): string => {
    let s = raw === null || raw === undefined ? "" : String(raw);
    if (/^[=+\-@\t\r]/.test(s) && !(typeof raw === "number")) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => escape(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escape(c.accessor(row))).join(","));
  return [header, ...lines].join("\r\n");
}
