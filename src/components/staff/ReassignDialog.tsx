"use client";

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
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleReassign = async () => {
    setLoading(true);
    setStatus("loading");
    try {
      const res = await reassignLeadAction(leadId, selectedConsultant, "Manager reassignment via staff console");
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
                  {c.full_name} ({c.city_id === "city-kanpur" ? "Kanpur" : "Lucknow"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

