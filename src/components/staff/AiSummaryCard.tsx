import React from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import type { LeadAiProfile } from "@/server/ai/lead-context";

export interface AiSummaryCardProps {
  summary?: string | null;
  customerName: string;
  /** Structured buyer profile from leads.ai_profile (staff only). */
  profile?: LeadAiProfile | null;
  /** When given, shows a Refresh button that rebuilds the briefing from the latest facts. */
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
}

const URGENCY_STYLE: Record<LeadAiProfile["urgency"], string> = {
  high: "bg-error/10 text-error border-error/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-bg-sheen text-ink-soft border-border",
};

function chips(profile: LeadAiProfile): string[] {
  const q = profile.qualification;
  const out: string[] = [];
  if (q.budget) out.push(`Budget ${q.budget}`);
  if (q.timeline) out.push(`Timeline: ${q.timeline}`);
  if (q.fuel) out.push(`Fuel: ${q.fuel}`);
  if (q.finance) out.push("Needs finance");
  if (q.trade_in) out.push("Has trade-in");
  return out;
}

export function AiSummaryCard({
  summary,
  customerName,
  profile,
  onRefresh,
  refreshing = false,
  className = "",
}: AiSummaryCardProps) {
  if (!summary) return null;

  const fromModel = !profile || profile.origin === "ai";

  return (
    <div className={`rounded-xl border border-accent/30 bg-accent-soft/30 p-5 space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-accent-ink font-bold text-xs uppercase tracking-wider">
          <Sparkles className="h-4 w-4" />
          <span>{fromModel ? "AI Prospect Briefing" : "Prospect Briefing"} for {customerName}</span>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh briefing"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-ink-soft hover:text-ink disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      <p className="text-xs text-ink leading-relaxed">{summary}</p>

      {profile && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${URGENCY_STYLE[profile.urgency]}`}
            >
              {profile.urgency} urgency
            </span>
            {chips(profile).map((chip) => (
              <span key={chip} className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-ink">
                {chip}
              </span>
            ))}
          </div>
          <p className="text-xs text-ink">
            <span className="font-bold">Next step:</span> {profile.suggestedAction}
          </p>
        </div>
      )}
    </div>
  );
}
