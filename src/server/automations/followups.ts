import { alertEmail } from "@/server/automations/alerts";
import type { OutboxRow, TaskRow } from "@/server/automations/types";

/**
 * T3 / T4 / T5: follow-up tasks for consultants, so leads do not go quiet after the first reply.
 *
 *  - stale lead:      contacted / negotiating with no activity for 3+ days (14 at most) -> task; at 7+ days the
 *                     shared alert mailbox is told too.
 *  - post test drive: a drive marked attended 3-48 h ago on an open lead -> "follow up after the drive".
 *  - no-show:         a drive marked no-show in the last 48 h on an open lead -> "offer to rebook".
 * Each item creates one task and one email to the consultant, keyed so a re-run adds nothing. Windows are bounded
 * so switching the rule on never creates a backlog of old tasks, and each run is capped.
 */

export const FOLLOWUP_LIMITS = { staleFromDays: 3, staleManagerDays: 7, staleMaxDays: 14, perRun: 50 } as const;

export interface StaleLead {
  leadId: string;
  ref: string | null;
  name: string;
  status: string;
  idleDays: number;
  /** The date the current stage began (YYYY-MM-DD); part of the key so a lead that moves on gets a fresh cycle. */
  stageDate: string;
  consultantId: string | null;
  consultantEmail: string | null;
}

export interface BookingFollowUp {
  bookingId: string;
  leadId: string;
  leadName: string;
  leadRef: string | null;
  car: string | null;
  consultantId: string | null;
  consultantEmail: string | null;
}

export function planFollowUps(
  input: { stale: StaleLead[]; postDrive: BookingFollowUp[]; noShows: BookingFollowUp[] },
  now: Date,
  env?: Record<string, string | undefined>,
): { rows: OutboxRow[]; tasks: TaskRow[] } {
  const rows: OutboxRow[] = [];
  const tasks: TaskRow[] = [];
  const manager = alertEmail(env);
  const due = (hours: number) => new Date(now.getTime() + hours * 3600_000).toISOString();

  const add = (task: TaskRow, email: string | null, subject: string) => {
    tasks.push(task);
    if (email) {
      rows.push({
        channel: "email",
        to_address: email,
        template: "lead_task_assigned",
        body: `${subject}\n\nOpen the lead in Staff > Lead Desk to see the details and suggested next steps.`,
        idempotency_key: `task:${task.idempotency_key}`,
        lead_id: task.lead_id,
      });
    }
  };

  for (const s of input.stale.slice(0, FOLLOWUP_LIMITS.perRun)) {
    const label = `${s.name}${s.ref ? ` (${s.ref})` : ""}`;
    add(
      {
        lead_id: s.leadId,
        assigned_to: s.consultantId,
        kind: "stale",
        title: `Follow up: ${s.name} has been quiet for ${s.idleDays} days`,
        reason: `No activity since the lead moved to ${s.status.replace(/_/g, " ")}.`,
        due_at: due(4),
        source: "automation",
        idempotency_key: `stale3:${s.leadId}:${s.stageDate}`,
      },
      s.consultantEmail,
      `Lead ${label} has had no activity for ${s.idleDays} days. A quick follow-up keeps it alive.`,
    );
    if (s.idleDays >= FOLLOWUP_LIMITS.staleManagerDays && manager) {
      rows.push({
        channel: "email",
        to_address: manager,
        template: "lead_stale_alert",
        body: `Lead ${label} has had no activity for ${s.idleDays} days (stage: ${s.status.replace(/_/g, " ")}).`,
        idempotency_key: `stale7:${s.leadId}:${s.stageDate}`,
        lead_id: s.leadId,
      });
    }
  }

  for (const b of input.postDrive.slice(0, FOLLOWUP_LIMITS.perRun)) {
    add(
      {
        lead_id: b.leadId,
        assigned_to: b.consultantId,
        kind: "post_drive",
        title: `Follow up after ${b.leadName}'s test drive`,
        reason: `They drove${b.car ? ` the ${b.car}` : ""}. Ask how it went and what the next step is.`,
        due_at: due(6),
        source: "automation",
        idempotency_key: `postdrive:${b.bookingId}`,
      },
      b.consultantEmail,
      `${b.leadName}${b.leadRef ? ` (${b.leadRef})` : ""} completed a test drive. Please follow up while it is fresh.`,
    );
  }

  for (const b of input.noShows.slice(0, FOLLOWUP_LIMITS.perRun)) {
    add(
      {
        lead_id: b.leadId,
        assigned_to: b.consultantId,
        kind: "no_show",
        title: `Offer ${b.leadName} a new test drive slot`,
        reason: "They did not attend the booked test drive.",
        due_at: due(4),
        source: "automation",
        idempotency_key: `noshow:${b.bookingId}`,
      },
      b.consultantEmail,
      `${b.leadName}${b.leadRef ? ` (${b.leadRef})` : ""} missed their test drive. Please offer to rebook.`,
    );
  }

  return { rows, tasks };
}

const DAY = 86_400_000;

export async function selectFollowUps(admin: any, now: Date): Promise<{ stale: StaleLead[]; postDrive: BookingFollowUp[]; noShows: BookingFollowUp[] }> {
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  // --- stale leads: stage unchanged for 3-14 days, and no timeline event in the last 3 days -------------------
  const { data: leads, error: leadErr } = await admin
    .from("leads")
    .select("id, ref, name, status, status_changed_at, created_at, assigned_to, assigned:assigned_to ( email )")
    .in("status", ["contacted", "negotiating"])
    .lt("status_changed_at", ago(FOLLOWUP_LIMITS.staleFromDays * DAY))
    .gt("status_changed_at", ago(FOLLOWUP_LIMITS.staleMaxDays * DAY))
    .order("status_changed_at", { ascending: true })
    .limit(200);
  if (leadErr) throw new Error(`stale lead query failed: ${leadErr.message}`);

  const ids = (leads ?? []).map((l: any) => l.id);
  const active = new Set<string>();
  if (ids.length) {
    const { data: events, error: evErr } = await admin
      .from("lead_events")
      .select("lead_id")
      .in("lead_id", ids)
      .gt("created_at", ago(FOLLOWUP_LIMITS.staleFromDays * DAY));
    if (evErr) throw new Error(`stale lead event query failed: ${evErr.message}`);
    for (const e of events ?? []) active.add(e.lead_id);
  }
  const stale: StaleLead[] = (leads ?? [])
    .filter((l: any) => !active.has(l.id))
    .map((l: any) => ({
      leadId: l.id,
      ref: l.ref ?? null,
      name: l.name,
      status: l.status,
      idleDays: Math.floor((now.getTime() - new Date(l.status_changed_at).getTime()) / DAY),
      stageDate: String(l.status_changed_at).slice(0, 10),
      consultantId: l.assigned_to ?? null,
      consultantEmail: l.assigned?.email ?? null,
    }));

  // --- bookings: attended 3-48 h ago, or no-show within 48 h, on a lead that is still open ---------------------
  const bookingSelect =
    "id, lead_id, vehicle_info, lead:lead_id!inner ( name, ref, status, assigned_to, assigned:assigned_to ( email ) ), slots:slot_id!inner ( ends_at )";
  const toFollowUp = (row: any): BookingFollowUp => ({
    bookingId: row.id,
    leadId: row.lead_id,
    leadName: row.lead?.name ?? "The buyer",
    leadRef: row.lead?.ref ?? null,
    car: row.vehicle_info?.model_name ?? null,
    consultantId: row.lead?.assigned_to ?? null,
    consultantEmail: row.lead?.assigned?.email ?? null,
  });
  const openLead = (row: any) => row.lead && !["won", "lost"].includes(row.lead.status);

  const [done, missed] = await Promise.all([
    admin.from("bookings").select(bookingSelect).eq("kind", "test_drive").eq("status", "completed").not("lead_id", "is", null)
      .lt("slots.ends_at", ago(3 * 3600_000)).gt("slots.ends_at", ago(48 * 3600_000)).limit(200),
    admin.from("bookings").select(bookingSelect).eq("kind", "test_drive").eq("status", "no_show").not("lead_id", "is", null)
      .gt("slots.ends_at", ago(48 * 3600_000)).limit(200),
  ]);
  if (done.error) throw new Error(`post-drive query failed: ${done.error.message}`);
  if (missed.error) throw new Error(`no-show query failed: ${missed.error.message}`);

  return {
    stale,
    postDrive: (done.data ?? []).filter(openLead).map(toFollowUp),
    noShows: (missed.data ?? []).filter(openLead).map(toFollowUp),
  };
}
