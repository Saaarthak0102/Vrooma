"use client";

import React, { useState } from "react";
import { Link } from "@/i18n/navigation";
import type { ImportResult } from "@/server/services/csv-import";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";

export default function LeadImportPage() {
  const [csvContent, setCsvContent] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const sampleCsv = `name,phone,email,model,source,notes
Rajesh Sharma,9876543210,rajesh.sharma@example.com,Model H,portal,Interested in ZX Automatic Petrol test drive this weekend
Priya Verma,9876543211,priya.v@example.com,Model C,portal,Enquired about delivery timeline and festive offers
Amit Patel,9876543212,amit.patel@example.com,Model S,portal,Looking for base variant with exchange of 2018 car
Sunita Singh,9876543213,sunita.singh@example.com,Model H,portal,Wants corporate discount details and on-road price in Lucknow`;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) {
      toast.error("Please paste or upload CSV data first.");
      return;
    }

    setLoading(true);
    setStatus("loading");
    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvContent, filename: "portal_leads.csv" }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to parse CSV file.");
      }

      const result: ImportResult = json.data;
      setImportResult(result);
      if (result.created > 0) {
        setStatus("success");
        setTimeout(() => setStatus("idle"), 1400);
        toast.success(`Successfully imported ${result.created} leads! Deduplicated ${result.skipped} entries.`);
      } else {
        setStatus("idle");
        toast.info(`0 new leads created. ${result.skipped} duplicates or errors.`);
      }
    } catch (err: any) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 600);
      toast.error(err?.message || "Failed to parse CSV file.");
    } finally {
      setLoading(false);
    }
  };

  const loadSample = () => {
    setCsvContent(sampleCsv);
    setImportResult(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-ink">Import Portal Leads (CSV)</h1>
          <p className="text-xs text-ink-soft">
            Bulk ingestion from CarDekho, CarWale, or social campaigns. Automatically deduplicates by phone number.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
          <Link href="/staff/leads">
            <ArrowLeft className="h-4 w-4" />
            <span>Lead Inbox</span>
          </Link>
        </Button>
      </div>

      {/* Upload & Paste Controls */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border bg-ink/5 px-4 py-2 text-xs font-semibold hover:bg-ink/10 transition-colors">
            <Upload className="h-4 w-4" />
            <span>Upload .CSV File</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
          <Button variant="ghost" size="sm" onClick={loadSample} className="text-xs text-accent-ink">
            Load Sample Portal Leads
          </Button>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-ink-soft block mb-1.5">
            CSV Content (Header: name, phone, email, model, source, notes)
          </label>
          <textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="Paste raw CSV string here..."
            className="w-full h-44 rounded-lg border border-border p-3 font-mono text-xs text-ink bg-ink/[0.015] focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleImport}
            disabled={loading || !csvContent.trim()}
            status={status}
            loadingText="Processing Deduplication..."
            successText="Leads Imported!"
            className="gap-2"
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
          >
            Parse & Import Leads
          </Button>
        </div>
      </div>

      {/* Import Results Box */}
      {importResult && (
        <div className="rounded-2xl border border-border bg-white p-6 shadow-card space-y-4 animate-in fade-in">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
            Import Summary & Deduplication Report
          </h3>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg bg-ink/5 p-3 text-center">
              <span className="text-[10px] text-ink-mute uppercase font-semibold block">Total Rows</span>
              <span className="text-xl font-black text-ink">{importResult.total}</span>
            </div>
            <div className="rounded-lg bg-accent/15 p-3 text-center text-accent-ink">
              <span className="text-[10px] uppercase font-semibold block">Created Leads</span>
              <span className="text-xl font-black">{importResult.created}</span>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-center text-amber-700">
              <span className="text-[10px] uppercase font-semibold block">Skipped / Deduped</span>
              <span className="text-xl font-black">{importResult.skipped}</span>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="rounded-lg bg-danger/10 border border-danger/20 p-3 text-xs text-danger space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Validation Errors:
              </span>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                {importResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button asChild size="sm" variant="primary">
              <Link href="/staff/leads">View Live Leads in Inbox</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

