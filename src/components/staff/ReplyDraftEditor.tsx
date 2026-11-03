"use client";

import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { dispatchMessage } from "@/server/services/outbox";
import { updateLeadStatus } from "@/server/repositories/leads";
import { toast } from "sonner";
import { Send, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";

export interface ReplyDraftEditorProps {
  leadId: string;
  leadPhone: string;
  customerName: string;
  initialDraft: string;
  onSent?: () => void;
  className?: string;
}

const FORBIDDEN_DISCOUNT_WORDS = [
  "discount",
  "off",
  "% off",
  "cash discount",
  "छूट",
  "discounts",
];

export function ReplyDraftEditor({
  leadId,
  leadPhone,
  customerName,
  initialDraft,
  onSent,
  className,
}: ReplyDraftEditorProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [sentSuccess, setSentSuccess] = useState(false);

  // Check for forbidden discount words
  const lowerDraft = draft.toLowerCase();
  const detectedForbiddenWord = FORBIDDEN_DISCOUNT_WORDS.find((word) =>
    lowerDraft.includes(word)
  );

  const hasDiscountWarning = !!detectedForbiddenWord;

  const handleSend = async () => {
    if (hasDiscountWarning) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 600);
      toast.error(
        `Action Blocked: Dealership policy strictly prohibits quoting unapproved discounts ("${detectedForbiddenWord}"). Remove it before sending.`
      );
      return;
    }

    setSending(true);
    setStatus("loading");
    try {
      // 1. Dispatch outbox message
      await dispatchMessage({
        channel: "whatsapp",
        to: leadPhone,
        template: "first_reply_copilot",
        body: draft,
        leadId,
      });

      // 2. Mark lead as contacted (stops SLA timer)
      await updateLeadStatus(leadId, "contacted");

      setStatus("success");
      setSentSuccess(true);
      toast.success("First reply sent via WhatsApp! SLA timer stopped.");
      onSent?.();
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 600);
      toast.error("Failed to send message.");
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
        <span className="text-[11px] text-ink-mute">Channel: WhatsApp (+91 {leadPhone})</span>
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
          Drafts must always be reviewed by a certified consultant.
        </p>
        <Button
          onClick={handleSend}
          disabled={sending || hasDiscountWarning || !draft.trim()}
          status={status}
          loadingText="Sending..."
          successText="Dispatched!"
          size="sm"
          className="gap-1.5 text-xs h-10 px-5"
          leftIcon={<Send className="h-3.5 w-3.5" />}
        >
          Approve & Send via WhatsApp
        </Button>
      </div>
    </div>
  );
}

