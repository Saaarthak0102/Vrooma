import { enqueueOnce, enqueueTasksOnce } from "@/server/automations/enqueue";
import { planEscalations, selectWaiting } from "@/server/automations/escalations";
import { planExpiryAlerts, selectExpiryInput } from "@/server/automations/expiry";
import { planFollowUps, selectFollowUps } from "@/server/automations/followups";
import { planGarageReminders, selectGarageInput } from "@/server/automations/garage";
import { planSavedCarNudges, selectSavedCarInput } from "@/server/automations/nudges";
import { planOutcomeReminders, selectUnmarkedBookings } from "@/server/automations/outcomes";
import { planReminders, selectReminderBookings } from "@/server/automations/reminders";
import type { OutboxRow, RuleResult, TaskRow } from "@/server/automations/types";

interface Rule {
  name: string;
  plan: (admin: any, now: Date) => Promise<OutboxRow[] | { rows: OutboxRow[]; tasks: TaskRow[] }>;
}

const RULES: Rule[] = [
  { name: "booking_reminders", plan: async (a, now) => planReminders(await selectReminderBookings(a, now), now) },
  { name: "booking_outcomes", plan: async (a, now) => planOutcomeReminders(await selectUnmarkedBookings(a, now)) },
  { name: "escalations", plan: async (a, now) => planEscalations(await selectWaiting(a, now)) },
  {
    name: "garage_reminders",
    plan: async (a, now) => {
      const { vehicles, consented, today } = await selectGarageInput(a, now);
      return planGarageReminders(vehicles, consented, today);
    },
  },
  { name: "lead_followups", plan: async (a, now) => planFollowUps(await selectFollowUps(a, now), now) },
  {
    name: "saved_car_nudges",
    plan: async (a, now) => {
      const { items, consented, engaged } = await selectSavedCarInput(a, now);
      return planSavedCarNudges(items, consented, engaged);
    },
  },
  { name: "expiry_alerts", plan: async (a, now) => planExpiryAlerts(await selectExpiryInput(a, now), now) },
];

/**
 * Runs every date-driven rule. Rules are independent: one failing (say a bad query) is reported in the result and
 * never stops the others. Safe to run as often as you like, because each queued message has an idempotency key.
 */
export async function runAutomations(admin: any, now: Date = new Date()): Promise<RuleResult[]> {
  const results: RuleResult[] = [];
  for (const rule of RULES) {
    try {
      const out = await rule.plan(admin, now);
      const rows = Array.isArray(out) ? out : out.rows;
      const tasks = Array.isArray(out) ? [] : out.tasks;
      // Tasks first: the email tells the consultant to open a task that should already exist.
      await enqueueTasksOnce(admin, tasks);
      await enqueueOnce(admin, rows);
      results.push({ rule: rule.name, planned: rows.length + tasks.length });
    } catch (err: any) {
      console.error(`[automations] ${rule.name} failed: ${err?.message}`);
      results.push({ rule: rule.name, planned: 0, error: String(err?.message ?? err) });
    }
  }
  return results;
}
