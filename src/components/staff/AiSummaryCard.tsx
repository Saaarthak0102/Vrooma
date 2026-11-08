import React from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/ist-format";
import type { LeadAiProfile } from "@/server/ai/lead-context";

export interface AiSummaryCardProps {
  summary?: string | null;
  customerName: string;
  /** Structured buyer profile from leads.ai_profile (staff only). */
  profile?: LeadAiProfile | null;
  /** When the briefing was last written by the model (leads.ai_generated_at). */
  generatedAt?: string | null;
  /** When given, shows a Refresh button that rebuilds the briefing from the latest facts. */
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
}

const URGENCY: Record<LeadAiProfile["urgency"], { variant: "danger" | "warn" | "secondary"; label: string }> = {
  high: { variant: "danger", label: "High urgency" },
  medium: { variant: "warn", label: "Medium urgency" },
  low: { variant: "secondary", label: "Low urgency" },
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
  generatedAt,
  onRefresh,
  refreshing = false,
  className = "",
}: AiSummaryCardProps) {
  if (!summary) return null;

  const fromModel = !profile || profile.origin === "ai";

  return (
    <div
      aria-busy={refreshing}
      className={`fade-up-item space-y-3 rounded-xl border border-accent/30 bg-accent-soft/40 p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-ink">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {fromModel ? "AI Prospect Briefing" : "Prospect Briefing"} for {customerName}
            </span>
          </div>
          {fromModel && generatedAt ? (
            <p className="pl-6 text-[11px] text-ink-mute">Updated {timeAgo(generatedAt)}</p>
          ) : !fromModel ? (
            <div className="pl-6">
              <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                Rule-based
              </Badge>
            </div>
          ) : null}
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh briefing"
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-accent/10 [@media(hover:hover)_and_(pointer:fine)]:hover:text-ink"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} />
          </button>
        )}
      </div>

      <p className={`text-xs leading-relaxed text-ink transition-opacity duration-200 ${refreshing ? "opacity-50" : "opacity-100"}`}>{summary}</p>

      {profile && (
        <div className={`space-y-2 transition-opacity duration-200 ${refreshing ? "opacity-50" : "opacity-100"}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={URGENCY[profile.urgency].variant} className="px-2 py-0.5 text-[10px] uppercase tracking-wide">
              {URGENCY[profile.urgency].label}
            </Badge>
            {chips(profile).map((chip) => (
              <Badge key={chip} variant="outline" className="bg-white px-2 py-0.5 text-[10px] font-medium">
                {chip}
              </Badge>
            ))}
          </div>
          <p className="border-t border-accent/20 pt-2 text-xs text-ink">
            <span className="font-bold text-accent-ink">Next step:</span> {profile.suggestedAction}
          </p>
        </div>
      )}
    </div>
  );
}
