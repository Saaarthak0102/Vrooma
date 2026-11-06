"use client";

import { KANPUR_CITY_ID } from "@/lib/cities";
import React, { useState } from "react";
import { Profile } from "@/types/domain";
import { reassignLeadAction } from "@/server/actions/leads";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";

export interface ReassignDialogProps {
  leadId: string;
  consultants: Profile[];
  currentAssignedId?: string | null;
  onReassigned?: () => void;
}

export function ReassignDialog({
  leadId,
  consultants,
  currentAssignedId,
  onReassigned,
}: ReassignDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState(
    currentAssignedId || consultants[0]?.id || ""
  );
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleReassign = async () => {
    if (!reason.trim()) {
      toast.error("Please give a short reason for reassigning this lead.");
      return;
    }
    setLoading(true);
    setStatus("loading");
    try {
      const res = await reassignLeadAction(leadId, selectedConsultant, reason.trim());
      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to reassign lead");
      }
      setStatus("success");
      toast.success("Lead successfully reassigned");
      setTimeout(() => {
        setOpen(false);
        onReassigned?.();
      }, 500);
    } catch (err: any) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 600);
      toast.error(err?.message || "Failed to reassign lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9">
          <UserCheck className="h-3.5 w-3.5" />
          <span>Reassign</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Reassign Lead to Specialist</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Available Sales Consultants (Lucknow & Kanpur)
          </label>
          <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
            <SelectTrigger>
              <SelectValue placeholder="Choose Consultant" />
            </SelectTrigger>
            <SelectContent>
              {consultants.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.full_name} ({c.city_id === KANPUR_CITY_ID ? "Kanpur" : "Lucknow"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft block pt-2">
            Reason (shown in the audit trail)
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer prefers Kanpur showroom"
            maxLength={300}
            className="min-h-[70px] text-xs"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleReassign}
            disabled={loading}
            status={status}
            loadingText="Reassigning..."
            successText="Reassigned!"
          >
            Confirm Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

