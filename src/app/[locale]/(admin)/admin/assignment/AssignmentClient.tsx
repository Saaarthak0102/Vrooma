"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, UserCheck, ShieldCheck } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";
import { Showroom, Profile } from "@/types/domain";

interface AssignmentClientProps {
  showrooms: Showroom[];
  consultants: Profile[];
}

export function AssignmentClient({ showrooms, consultants }: AssignmentClientProps) {
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
                        <UserCheck className="h-2.5 w-2.5 mr-1" />
                        {c.full_name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Round-Robin SLA
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={notWired(`Configure Pool for ${s.name}`, 3)}
                  >
                    Edit Pool
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-xl border border-border p-4 bg-bg-sheen/50 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-accent-ink shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-ink">5-Minute SLA Guarantee</h4>
          <p className="text-[11px] text-ink-mute mt-0.5">
            If an assigned sales consultant does not log first contact within 5 minutes, the system flags the lead in red on the executive dashboard and alerts the sales manager for re-routing.
          </p>
        </div>
      </div>
    </div>
  );
}

