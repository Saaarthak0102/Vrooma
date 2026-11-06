"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, FileSpreadsheet, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ImportResult } from "@/server/services/csv-import";

const SAMPLE_CSV = `name,phone,email,model,source,notes
Rajesh Sharma,9876543210,rajesh.sharma@example.com,Model H,portal,Interested in ZX Automatic Petrol test drive this weekend
Priya Verma,9876543211,priya.v@example.com,Model C,portal,Enquired about delivery timeline and festive offers`;

/** Portal CSV import as a dialog on the Lead Desk (was its own page). Same API, same dedupe rules. */
export function LeadImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [filename, setFilename] = useState("portal_leads.csv");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsv(String(ev.target?.result ?? ""));
      setResult(null);
    };
    reader.readAsText(file);
  };

  const runImport = async () => {
    if (!csv.trim()) {
      toast.error("Paste or upload CSV data first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, filename }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not read that CSV file.");

      const data: ImportResult = json.data;
      setResult(data);
      if (data.created > 0) {
        toast.success(`Imported ${data.created} lead${data.created === 1 ? "" : "s"}. ${data.skipped} skipped.`);
        router.refresh();
      } else {
        toast.info(`No new leads. ${data.skipped} duplicates or errors.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not read that CSV file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setResult(null);
          setCsv("");
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Import portal leads (CSV)</DialogTitle>
          <DialogDescription>
            Columns: name, phone, email, model, source, notes. Duplicates are matched by phone number and skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-md border border-border bg-ink/5 px-4 text-xs font-semibold hover:bg-ink/10">
              <Upload className="h-4 w-4" />
              <span>Upload .csv</span>
              <input type="file" accept=".csv" onChange={handleFile} className="sr-only" />
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 text-xs"
              onClick={() => {
                setCsv(SAMPLE_CSV);
                setResult(null);
              }}
            >
              Load sample rows
            </Button>
          </div>

          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            aria-label="CSV content"
            placeholder="…or paste CSV text here"
            className="h-40 w-full rounded-md border border-border bg-ink/[0.015] p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-accent"
          />

          {result && (
            <div className="space-y-2 rounded-lg border border-border p-3 text-xs">
              <p className="font-bold text-ink">
                {result.total} rows · {result.created} created · {result.skipped} skipped
              </p>
              {result.errors.length > 0 && (
                <ul className="space-y-0.5 rounded-md bg-danger/10 p-2 text-[11px] text-danger">
                  <li className="flex items-center gap-1 font-bold">
                    <AlertTriangle className="h-3 w-3" /> Row problems
                  </li>
                  {result.errors.slice(0, 8).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="h-11 gap-2 px-5 text-xs"
              disabled={loading || !csv.trim()}
              onClick={runImport}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {loading ? "Importing…" : "Import leads"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
