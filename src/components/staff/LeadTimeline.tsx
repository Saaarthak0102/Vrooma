import React from "react";
import type { LeadEventView } from "@/server/repositories/leads";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  test_drive_booked: "Test drive booked",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
};

function describe(event: LeadEventView): string {
  const p = event.payload;
  switch (event.type) {
    case "created":
      return "Lead received";
    case "assigned":
      return "Auto-assigned to a consultant";
    case "reassigned":
      return typeof p.reason === "string" && p.reason ? `Reassigned. Reason: ${p.reason}` : "Reassigned";
    case "contacted":
      return `First reply sent${typeof p.channel === "string" ? ` via ${p.channel}` : ""}`;
    case "status_changed":
      return `Stage changed to ${STATUS_LABELS[String(p.status)] ?? String(p.status ?? "")}`;
    case "repeat_enquiry":
      return "Repeat enquiry from the same buyer";
    case "sla_breached":
      return "5-minute response target missed";
    case "ai_draft_generated":
      return "AI draft prepared";
    case "note_added":
      return "Note added";
    default:
      return event.type.replace(/_/g, " ");
  }
}

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export function LeadTimeline({ events }: { events: LeadEventView[] }) {
  return (
    <section
      aria-labelledby="lead-timeline-heading"
      className="rounded-2xl border border-border bg-surface p-5 shadow-card"
    >
      <h2 id="lead-timeline-heading" className="text-sm font-bold text-ink">
        Activity
      </h2>

      {events.length === 0 ? (
        <p className="mt-3 text-xs text-ink-soft">No activity recorded yet.</p>
      ) : (
        <ol className="mt-4 space-y-4 border-l border-border pl-4">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span
                aria-hidden
                className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-accent"
              />
              <p className="text-xs font-semibold text-ink">{describe(event)}</p>
              <p className="text-[11px] text-ink-mute">
                {timeFmt.format(new Date(event.created_at))}
                {event.actor_name ? ` · ${event.actor_name}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
