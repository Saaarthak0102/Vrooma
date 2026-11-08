"use client";

import React, { useState, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { sendLeadReplyAction } from "@/server/actions/leads";
import { findForbiddenDiscountWord } from "@/lib/validation/discount";
import { formatIndianPhoneDisplay } from "@/lib/phone";
import { toast } from "sonner";
import { Send, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";

export interface ReplyDraftEditorProps {
  leadId: string;
  leadPhone: string;
  /** The buyer's email, when we have one. */
  leadEmail?: string | null;
  /** How the reply will go out (decided on the server): email until WhatsApp keys exist. */
  channel?: "email" | "whatsapp";
  customerName: string;
  initialDraft: string;
  onSent?: () => void;
  className?: string;
}

export function ReplyDraftEditor({
  leadId,
  leadPhone,
  leadEmail = null,
  channel = "email",
  customerName,
  initialDraft,
  onSent,
  className,
}: ReplyDraftEditorProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [sentSuccess, setSentSuccess] = useState(false);

  // Check for forbidden discount words using dealership boundary engine
  const detectedForbiddenWord = useMemo(() => findForbiddenDiscountWord(draft), [draft]);
  const hasDiscountWarning = Boolean(detectedForbiddenWord);

  const handleSend = async () => {
    if (hasDiscountWarning) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 600);
      toast.error(
        "Action Blocked: Dealership policy strictly prohibits quoting unapproved discounts, price cuts, or waivers. Remove it before sending."
      );
      return;
    }

    setSending(true);
    setStatus("loading");
    try {
      const res = await sendLeadReplyAction(leadId, draft);
      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to send message");
      }

      setStatus("success");
      setSentSuccess(true);
      if (res.data.statusUpdated) {
        toast.success(`Reply sent ${res.data.channel === "email" ? "by email" : "via WhatsApp"}. SLA timer stopped.`);
      } else {
        toast.warning("Reply queued, but the lead status could not be updated. Please mark it Contacted manually.");
      }
      onSent?.();
    } catch (err: any) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 600);
      toast.error(err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`rounded-xl border border-border bg-white p-5 shadow-card space-y-4 ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center text-accent-ink">
            <Sparkles className="h-4 w-4" />
          </span>
          <h4 className="text-sm font-bold text-ink">AI First-Reply Assistant</h4>
        </div>
        <span className="text-[11px] text-ink-mute">
          Channel: {channel === "email" ? `Email (${leadEmail ?? "no address on file"})` : `WhatsApp (${formatIndianPhoneDisplay(leadPhone)})`}
        </span>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-ink-soft block">
          Review & Edit Draft Message
        </label>
        <Textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setSentSuccess(false);
            // Typing a new message must bring the normal "Approve & Send" label back (it stayed on "Dispatched!").
            setStatus("idle");
          }}
          className="text-xs min-h-[110px] leading-relaxed bg-ink/[0.015]"
          placeholder="Draft message to customer..."
        />
      </div>

      {/* Strict Discount Guardrail Banner */}
      {hasDiscountWarning && (
        <div className="flex items-start gap-2.5 rounded-lg bg-danger/10 border border-danger/30 p-3 text-xs text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Dealership Policy Warning</p>
            <p className="text-[11px] leading-tight">
              Company policy strictly prohibits quoting unapproved discounts (&ldquo;{detectedForbiddenWord}&rdquo;) in initial messages. Please remove this reference before sending.
            </p>
          </div>
        </div>
      )}

      {sentSuccess && (
        <div className="flex items-center gap-2 text-xs font-semibold text-accent-ink bg-accent/15 p-2.5 rounded-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Message successfully dispatched to {customerName}. Lead status updated to Contacted.</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-[11px] text-ink-mute">
          {channel === "email" && !leadEmail
            ? "No email on file for this lead. Call them or ask for an address."
            : "Drafts must always be reviewed by a certified consultant."}
        </p>
        <Button
          onClick={handleSend}
          disabled={sending || hasDiscountWarning || !draft.trim() || (channel === "email" && !leadEmail)}
          status={status}
          loadingText="Sending..."
          successText="Dispatched!"
          size="sm"
          className="gap-1.5 text-xs h-10 px-5"
          leftIcon={<Send className="h-3.5 w-3.5" />}
        >
          {channel === "email" ? "Approve & Send by email" : "Approve & Send via WhatsApp"}
        </Button>
      </div>
    </div>
  );
}

