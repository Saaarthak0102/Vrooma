"use client";

import React from "react";
import { memoryStore } from "@/server/store";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, UserCheck, ShieldCheck } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

export default function AdminAssignmentPage() {
  const showrooms = memoryStore.showrooms;
  const consultants = memoryStore.users.filter((u) => u.role === "consultant");

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-ink">Lead Auto-Assignment Routing Rules</h1>
          <p className="text-xs text-ink-soft">
            Enforces immediate distribution of web & portal leads to consultant pools to hit the 5-minute response SLA.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={notWired("Add Routing Rule", 3)}>
          <Plus className="h-4 w-4" />
          <span>Add Routing Rule</span>
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Showroom Facility</TableHead>
              <TableHead className="text-xs">Vehicle Line</TableHead>
              <TableHead className="text-xs">Consultant Pool</TableHead>
              <TableHead className="text-xs">Algorithm</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showrooms.map((s, idx) => (
              <TableRow key={s.id}>
                <TableCell className="font-bold text-xs text-ink">{s.name}</TableCell>
                <TableCell className="text-xs">All Brand X Lineup</TableCell>
                <TableCell className="text-xs">
                  <div className="flex flex-wrap gap-1">
                    {consultants.slice(idx * 2, idx * 2 + 2).map((c) => (
                      <Badge key={c.id} variant="secondary" className="text-[10px]">
                        {c.full_name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-xs font-semibold text-accent-ink">
                  Round-Robin Active Load
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-ink-soft hover:text-ink"
                    onClick={notWired(`Configure Pool for ${s.name}`, 3)}
                  >
                    Configure
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
