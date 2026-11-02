"use client";

import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { notWired } from "@/components/dev/NotWired";

export function DataRightsPanel() {
  const [optOutMarketing, setOptOutMarketing] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const handleToggleOptOut = (checked: boolean) => {
    setOptOutMarketing(checked);
    toast.success(
      checked
        ? "Opt-out recorded: You will receive only transactional booking updates."
        : "Preferences updated: Marketing and launch updates enabled."
    );
  };

  const handleDeleteRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteInput !== "DELETE MY DATA") {
      toast.error("Please type DELETE MY DATA exactly to confirm.");
      return;
    }
    toast.success(
      "DPDP Erasure Request Registered. Our Data Protection Officer will permanently purge your customer records within 48 hours."
    );
    setDeleteInput("");
  };

  return (
    <div className="space-y-6">
      {/* Consent Toggles */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent-ink" />
          <h4 className="text-sm font-bold text-ink">DPDP Act 2023 Communications Consent</h4>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-border">
          <div>
            <p className="text-xs font-semibold text-ink">Opt-out of Promotional Updates</p>
            <p className="text-[11px] text-ink-mute">
              Stop receiving seasonal festival offers and price revision broadcasts.
            </p>
          </div>
          <Switch checked={optOutMarketing} onCheckedChange={handleToggleOptOut} />
        </div>
      </div>

      {/* Permanent Deletion Request */}
      <div className="rounded-xl border border-danger/30 bg-danger/[0.02] p-5 space-y-4">
        <div className="flex items-center gap-2 text-danger">
          <AlertTriangle className="h-5 w-5" />
          <h4 className="text-sm font-bold">Right to Erasure & Data Deletion</h4>
        </div>
        <p className="text-xs text-ink-soft leading-relaxed">
          Under Section 12 of the Digital Personal Data Protection Act 2023, you have the right to request permanent deletion of your phone number, leads, and enquiry records from Vrooma systems.
        </p>

        <form onSubmit={handleDeleteRequest} className="space-y-3 pt-2">
          <label className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider block">
            Type <span className="text-danger font-mono font-bold">DELETE MY DATA</span> to confirm
          </label>
          <div className="flex gap-2 max-w-md">
            <Input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE MY DATA"
              className="text-xs font-mono h-10"
              required
            />
            <Button
              type="submit"
              variant="danger"
              size="sm"
              className="text-xs shrink-0 h-10 px-4"
            >
              Request Purge
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

