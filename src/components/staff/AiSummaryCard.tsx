import React from "react";
import { Sparkles } from "lucide-react";

export interface AiSummaryCardProps {
  summary?: string | null;
  customerName: string;
  className?: string;
}

export function AiSummaryCard({
  summary,
  customerName,
  className,
}: AiSummaryCardProps) {
  if (!summary) return null;

  return (
    <div className={`rounded-xl border border-accent/30 bg-accent-soft/30 p-5 space-y-2 ${className}`}>
      <div className="flex items-center gap-2 text-accent-ink font-bold text-xs uppercase tracking-wider">
        <Sparkles className="h-4 w-4" />
        <span>AI Prospect Briefing for {customerName}</span>
      </div>
      <p className="text-xs text-ink leading-relaxed">
        {summary}
      </p>
    </div>
  );
}
