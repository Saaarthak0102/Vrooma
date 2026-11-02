"use client";

import React, { useState, useMemo } from "react";
import { LeadTable } from "@/components/staff/LeadTable";
import { SearchBox } from "@/components/cars/SearchBox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { memoryStore } from "@/server/store";
import { FileSpreadsheet, RotateCcw } from "lucide-react";

export default function StaffLeadsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const filteredLeads = useMemo(() => {
    let list = [...memoryStore.leads];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          (l.model_name && l.model_name.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((l) => l.status === statusFilter);
    }

    if (sourceFilter !== "all") {
      list = list.filter((l) => l.source === sourceFilter);
    }

    return list;
  }, [search, statusFilter, sourceFilter]);

  const handleReset = () => {
    setSearch("");
    setStatusFilter("all");
    setSourceFilter("all");
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-ink">Inbound Lead Inbox</h1>
          <p className="text-xs text-ink-soft">
            Live auto-assigned customer leads. Strict 5-minute initial contact SLA enforced.
          </p>
        </div>

        <Button asChild size="sm" variant="outline" className="text-xs gap-1.5 self-start sm:self-auto">
          <Link href="/staff/leads/import">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Import Portal CSV</span>
          </Link>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-white border border-border shadow-sm">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Filter by customer name, phone, model..."
          className="w-full sm:w-64"
        />

        <div className="w-36">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Statuses
              </SelectItem>
              <SelectItem value="new" className="text-xs">
                New (Due Now)
              </SelectItem>
              <SelectItem value="contacted" className="text-xs">
                Contacted
              </SelectItem>
              <SelectItem value="test_drive_booked" className="text-xs">
                Demo Booked
              </SelectItem>
              <SelectItem value="negotiating" className="text-xs">
                In Negotiation
              </SelectItem>
              <SelectItem value="won" className="text-xs">
                Delivered
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-36">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-11 text-xs">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Sources
              </SelectItem>
              <SelectItem value="web" className="text-xs">
                Website
              </SelectItem>
              <SelectItem value="portal" className="text-xs">
                Portal CSV
              </SelectItem>
              <SelectItem value="trade_in" className="text-xs">
                Trade-In Request
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(statusFilter !== "all" || sourceFilter !== "all" || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-11 px-3 text-xs gap-1 text-ink-soft hover:text-ink ml-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </Button>
        )}
      </div>

      <LeadTable leads={filteredLeads} />
    </div>
  );
}
