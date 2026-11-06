"use client";

import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  distinctValues,
  filterRows,
  sortRows,
  toCsv,
  type GridColumnMeta,
  type GridSort,
} from "@/lib/grid";

export interface GridColumn<T> extends GridColumnMeta<T> {
  /** Custom cell. Interactive cells (selects, buttons) must stop click propagation themselves. */
  cell?: (row: T) => React.ReactNode;
  align?: "left" | "right";
  /** Tailwind width/min-width classes for the column. */
  className?: string;
}

export interface DataGridProps<T> {
  columns: GridColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Highlights the row whose key matches (e.g. the one open in a drawer). */
  activeRowKey?: string | null;
  searchPlaceholder?: string;
  /** File name (without extension) for the CSV export. Omit to hide the export button. */
  exportName?: string;
  emptyMessage?: string;
  /** Extra controls placed on the right of the toolbar (buttons, dialogs). */
  toolbar?: React.ReactNode;
  className?: string;
}

/**
 * Excel-style table: dense rows, sticky header, click-to-sort, global search, per-column select filters
 * and CSV export. Pure presentation over the rows it is given; editing happens through custom cells.
 */
export function DataGrid<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  activeRowKey,
  searchPlaceholder = "Search all columns…",
  exportName,
  emptyMessage = "No records match.",
  toolbar,
  className,
}: DataGridProps<T>) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<GridSort | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filterColumns = columns.filter((c) => c.filter === "select");

  const visible = useMemo(
    () => sortRows(filterRows(rows, columns, search, filters), columns, sort),
    [rows, columns, search, filters, sort]
  );

  const toggleSort = (id: string) =>
    setSort((prev) => {
      if (!prev || prev.columnId !== id) return { columnId: id, direction: "asc" };
      if (prev.direction === "asc") return { columnId: id, direction: "desc" };
      return null;
    });

  const exportCsv = () => {
    if (!exportName) return;
    const blob = new Blob(["﻿" + toCsv(visible, columns)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("rounded-xl border border-border bg-surface shadow-card", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2.5">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-mute" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search table"
            className="h-9 w-full rounded-md border border-border bg-bg pl-8 pr-2 text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        {filterColumns.map((column) => (
          <label key={column.id} className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft">
            <span className="sr-only sm:not-sr-only">{column.header}</span>
            <select
              value={filters[column.id] ?? "all"}
              onChange={(e) => setFilters((prev) => ({ ...prev, [column.id]: e.target.value }))}
              className="h-9 rounded-md border border-border bg-bg px-2 text-xs font-medium text-ink outline-none focus:border-accent"
              aria-label={`Filter by ${column.header}`}
            >
              <option value="all">All</option>
              {distinctValues(rows, column).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        ))}

        <span className="ml-auto text-[11px] tabular-nums text-ink-mute" aria-live="polite">
          {visible.length} of {rows.length}
        </span>
        {toolbar}
        {exportName && (
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-bg px-3 text-xs font-semibold text-ink hover:bg-ink/5"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        )}
      </div>

      <div className="max-h-[68vh] overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-bg-sheen">
            <tr>
              {columns.map((column) => {
                const sorted = sort?.columnId === column.id ? sort.direction : null;
                const sortable = column.sortable !== false;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "whitespace-nowrap border-b border-border px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-ink-soft",
                      column.align === "right" && "text-right",
                      column.className
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.id)}
                        className="inline-flex items-center gap-1 uppercase hover:text-ink"
                      >
                        {column.header}
                        {sorted === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : sorted === "desc" ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-ink-mute">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visible.map((row) => {
                const key = rowKey(row);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                    className={cn(
                      "border-b border-border/70 even:bg-ink/[0.015] hover:bg-accent/5 focus-visible:bg-accent/10 focus-visible:outline-none",
                      onRowClick && "cursor-pointer",
                      activeRowKey === key && "bg-accent/10"
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={cn(
                          "whitespace-nowrap px-3 py-2 align-middle",
                          column.align === "right" && "text-right tabular-nums",
                          column.className
                        )}
                      >
                        {column.cell ? column.cell(row) : String(column.accessor(row) ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
