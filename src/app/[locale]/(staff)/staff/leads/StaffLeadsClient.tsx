"use client";

import React, { useState, useMemo } from "react";
import { LeadTable } from "@/components/staff/LeadTable";
import { SearchBox } from "@/components/cars/SearchBox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { FileSpreadsheet, RotateCcw } from "lucide-react";
import { Lead } from "@/types/domain";

interface StaffLeadsClientProps {
  initialLeads: Lead[];
}

export function StaffLeadsClient({ initialLeads }: StaffLeadsClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const filteredLeads = useMemo(() => {
    let list = [...initialLeads];

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
  }, [initialLeads, search, statusFilter, sourceFilter]);

  const handleReset = () => {
    setSearch("");
    setStatusFilter("all");
    setSourceFilter("all");
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-ink">Lead Desk Inbox</h1>
          <p className="text-xs text-ink-soft">
            Live auto-assigned customer enquiries with real-time 5-minute SLA timers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
            <Link href="/staff/import">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Import Portal CSV</span>
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
            <a href="/api/export/daily-csv" download>
              <span>Export DMS CSV</span>
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-border shadow-sm">
        <div className="sm:col-span-2">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by customer name, phone, or car model..."
          />
        </div>
        <div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs bg-bg-sheen/50">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New (Awaiting SLA)</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="test_drive_booked">Test Drive Fixed</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-9 text-xs bg-bg-sheen/50">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="web">Web Showroom</SelectItem>
              <SelectItem value="portal">Auto Portals</SelectItem>
              <SelectItem value="social">Social Ads</SelectItem>
              <SelectItem value="walkin">Walk-in Visit</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleReset}
            title="Reset filters"
          >
            <RotateCcw className="h-3.5 w-3.5 text-ink-mute" />
          </Button>
        </div>
      </div>

      <LeadTable leads={filteredLeads} />
    </div>
  );
}

