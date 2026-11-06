"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  generateUserDataExportAction,
  submitPublicDataRequestAction,
} from "@/server/actions/data-rights";
import { requestAccountDeletionAction } from "@/server/actions/profile";
import { toast } from "sonner";
import { ShieldCheck, AlertTriangle, Download, Mail, CheckCircle2, FileText } from "lucide-react";

export function DataRightsPanel() {
  const { user, status: authStatus, signOut } = useAuth();
  const [optOutMarketing, setOptOutMarketing] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Signed-in deletion
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Signed-out public request
  const [publicEmail, setPublicEmail] = useState("");
  const [publicKind, setPublicKind] = useState<"export" | "delete">("export");
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicSuccessMessage, setPublicSuccessMessage] = useState<string | null>(null);

  const handleExportDownload = async () => {
    setExportLoading(true);
    try {
      const res = await generateUserDataExportAction();
      if (!res.ok) {
        throw new Error(res.error.message);
      }

      // Trigger client-side JSON docket download
      const jsonStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vrooma-dpdp-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Personal data docket downloaded successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate personal data export.");
    } finally {
      setExportLoading(false);
    }
  };

  const handleSignedInDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteInput !== "DELETE MY DATA") {
      toast.error("Please type DELETE MY DATA exactly to confirm.");
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await requestAccountDeletionAction();
      if (!res.ok) {
        throw new Error(res.error.message);
      }

      toast.success(
        "Account erasure requested. Future bookings cancelled. You will be signed out now."
      );
      setDeleteInput("");
      await signOut(); // navigates to the landing page
    } catch (err: any) {
      toast.error(err?.message || "Failed to process erasure request.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePublicRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicEmail || !publicEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setPublicLoading(true);
    try {
      const res = await submitPublicDataRequestAction(publicEmail, publicKind);
      if (!res.ok) {
        throw new Error(res.error.message);
      }

      setPublicSuccessMessage(res.data.message);
      toast.success("Request recorded.");
      setPublicEmail("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit data request.");
    } finally {
      setPublicLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Self-Service Data Export (Section 11) */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2.5">
          <FileText className="h-5 w-5 text-accent-ink" />
          <h4 className="text-sm font-bold text-ink">Right to Access & Data Portability (Section 11)</h4>
        </div>
        <p className="text-xs text-ink-soft leading-relaxed">
          You are legally entitled to receive a complete summary of your personal data held by Vrooma (Company A, Lucknow), including your profile details, past test drives, workshop bookings, statutory consent audit trails, and vehicle enquiries.
        </p>

        {user ? (
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportDownload}
              disabled={exportLoading}
              className="text-xs h-10 px-4 flex items-center gap-2"
            >
              <Download className="h-4 w-4 text-accent-ink" />
              <span>{exportLoading ? "Compiling Docket..." : "Download Personal Data Docket (.json)"}</span>
            </Button>
          </div>
        ) : (
          <p className="text-xs text-ink-mute bg-stone-50 p-3 rounded-lg border border-border">
            Please sign in to immediately download your personal data docket, or use the signed-out email verification portal below.
          </p>
        )}
      </div>

      {/* 2. Public / Guest Request Portal (Signed-Out users) */}
      {!user && (
        <div className="rounded-xl border border-border bg-white p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2.5">
            <Mail className="h-5 w-5 text-accent-ink" />
            <h4 className="text-sm font-bold text-ink">Signed-Out Visitor Data Rights Form</h4>
          </div>
          <p className="text-xs text-ink-soft leading-relaxed">
            If you do not have a signed-in session or submitted enquiries previously, enter your email address to submit a statutory data request. We will verify address control before compiling or purging records.
          </p>

          {publicSuccessMessage ? (
            <div className="rounded-lg bg-success-soft/30 border border-success/40 p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <p className="text-xs text-ink font-medium leading-relaxed">{publicSuccessMessage}</p>
            </div>
          ) : (
            <form onSubmit={handlePublicRequest} className="space-y-4 pt-1">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                  <input
                    type="radio"
                    name="reqKind"
                    checked={publicKind === "export"}
                    onChange={() => setPublicKind("export")}
                    className="accent-accent"
                  />
                  <span>Data Export Request</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                  <input
                    type="radio"
                    name="reqKind"
                    checked={publicKind === "delete"}
                    onChange={() => setPublicKind("delete")}
                    className="accent-accent"
                  />
                  <span>Erasure & Marketing Opt-Out</span>
                </label>
              </div>

              <div className="flex gap-2 max-w-md">
                <Input
                  type="email"
                  value={publicEmail}
                  onChange={(e) => setPublicEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="text-xs h-10"
                  required
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={publicLoading}
                  className="text-xs shrink-0 h-10 px-4"
                >
                  {publicLoading ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 3. Permanent Deletion & Erasure (Section 12) */}
      {user && (
        <div className="rounded-xl border border-danger/30 bg-danger/[0.02] p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-danger">
            <AlertTriangle className="h-5 w-5" />
            <h4 className="text-sm font-bold">Right to Erasure & Account Deletion (Section 12)</h4>
          </div>
          <p className="text-xs text-ink-soft leading-relaxed">
            Under Section 12 of the DPDP Act 2023, you have the right to request permanent deletion of your phone number, leads, and enquiry records from Vrooma systems. Any upcoming test drive or workshop bookings will be cancelled and slots released. A 7-day cooling off grace period applies.
          </p>

          <form onSubmit={handleSignedInDelete} className="space-y-3 pt-2">
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
                variant="destructive"
                size="sm"
                disabled={deleteLoading}
                className="text-xs shrink-0 h-10 px-4"
              >
                {deleteLoading ? "Queueing Erasure..." : "Request Erasure"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
