import React from "react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

export interface SpecTableProps {
  specs?: Record<string, string>;
  features?: string[];
}

export function SpecTable({ specs = {}, features = [] }: SpecTableProps) {
  const specEntries = Object.entries(specs);

  return (
    <div className="space-y-6">
      {specEntries.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden bg-white">
          <Table>
            <TableBody>
              {specEntries.map(([key, val]) => (
                <TableRow key={key}>
                  <TableCell className="font-medium text-ink-soft text-xs w-1/3 bg-ink/[0.015]">
                    {key}
                  </TableCell>
                  <TableCell className="font-semibold text-ink text-xs">
                    {val}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {features.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-3">
            Key Variant Features
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-ink">
            {features.map((feat, i) => (
              <li key={i} className="flex items-center gap-2 rounded-md bg-white p-2.5 border border-border">
                <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

