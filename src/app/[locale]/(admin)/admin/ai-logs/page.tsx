"use client";

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bot, CheckCircle2, FileEdit } from "lucide-react";

interface AiAuditEntry {
  id: string;
  leadId: string;
  customerName: string;
  draft: string;
  finalSent: string;
  edited: boolean;
  timestamp: string;
}

export default function AdminAiLogsPage() {
  const [logs] = useState<AiAuditEntry[]>([
    {
      id: "log-1",
      leadId: "lead-101",
      customerName: "Dr. Alok Srivastava",
      draft: "Namaste Dr. Srivastava, thank you for choosing Vrooma Hazratganj. I have prepared the detailed Lucknow on-road price breakup for Model H ZX Automatic. May I call you now to confirm a test drive slot?",
      finalSent: "Namaste Dr. Srivastava, thank you for choosing Vrooma Hazratganj. I have prepared the detailed Lucknow on-road price breakup for Model H ZX Automatic. Would you prefer a home demo tomorrow at 11:30 AM?",
      edited: true,
      timestamp: "10 mins ago",
    },
    {
      id: "log-2",
      leadId: "lead-104",
      customerName: "Mohd. Tariq",
      draft: "Hello Tariq, great news: UP Government offers 100% road tax waiver on Model X EV. Connected via WhatsApp.",
      finalSent: "Hello Tariq, great news: UP Government offers 100% road tax waiver on Model X EV. Connected via WhatsApp.",
      edited: false,
      timestamp: "45 mins ago",
    },
  ]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-black text-ink">AI Copilot Transparency Logs</h1>
        <p className="text-xs text-ink-soft">
          Audit trail comparing AI-generated first reply drafts against consultant final sent messages. Ensures no discounts were quoted.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Customer / Lead</TableHead>
              <TableHead className="text-xs w-2/5">AI Generated Draft</TableHead>
              <TableHead className="text-xs w-2/5">Final Consultant Sent Message</TableHead>
              <TableHead className="text-xs">Audit Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="text-xs">
                <TableCell className="font-semibold text-ink">
                  <div>
                    <span>{log.customerName}</span>
                    <span className="text-[10px] text-ink-mute block font-mono">
                      {log.leadId} · {log.timestamp}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-ink-soft leading-relaxed italic bg-ink/[0.01]">
                  &ldquo;{log.draft}&rdquo;
                </TableCell>
                <TableCell className="text-ink leading-relaxed font-medium bg-accent/[0.03]">
                  &ldquo;{log.finalSent}&rdquo;
                </TableCell>
                <TableCell>
                  {log.edited ? (
                    <Badge variant="warn" className="text-[10px] gap-1">
                      <FileEdit className="h-3 w-3" />
                      <span>Edited by Consultant</span>
                    </Badge>
                  ) : (
                    <Badge variant="ok" className="text-[10px] gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Sent Verbatim</span>
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
