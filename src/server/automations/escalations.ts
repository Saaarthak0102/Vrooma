import { alertEmail } from "@/server/automations/alerts";
import type { OutboxRow } from "@/server/automations/types";

/**
 * T6 / T7: escalation for people waiting too long.
 *  - A new lead still uncontacted 15 minutes after it arrived (the 5-minute SLA breach alert already went out).
 *  - A buyer who asked the chat for a consultant and has had no reply for 10 minutes.
 * Both notify the assigned consultant and the shared alert mailbox, once each.
 */

export interface WaitingItem {
  id: string;
  kind: "lead" | "chat";
  label: string;
  waitingMinutes: number;
  consultantEmail: string | null;
}

export function planEscalations(items: WaitingItem[], env?: Record<string, string | undefined>): OutboxRow[] {
  const rows: OutboxRow[] = [];
  const manager = alertEmail(env);
  for (const item of items) {
    const tag = item.kind === "lead" ? "sla15" : "chatwait";
    const template = item.kind === "lead" ? "lead_uncontacted_escalation" : "chat_waiting_alert";
    const body =
      item.kind === "lead"
        ? `${item.label} has been waiting ${item.waitingMinutes} minutes with no contact. Please call the buyer now, or reassign the lead if you cannot.`
        : `${item.label} has been waiting ${item.waitingMinutes} minutes for a reply in the support chat. Please open Staff > Chats and answer.`;
    const targets = [
      item.consultantEmail ? { to: item.consultantEmail, key: "cons" } : null,
      manager ? { to: manager, key: "mgr" } : null,
    ].filter(Boolean) as { to: string; key: string }[];
    // Nobody configured at all: keep the escalation visible rather than dropping it.
    if (targets.length === 0) targets.push({ to: "manager@vrooma.in", key: "mgr" });
    for (const t of targets) {
      rows.push({ channel: "email", to_address: t.to, template, body, idempotency_key: `${tag}:${item.id}:${t.key}` });
    }
  }
  return rows;
}

export async function selectWaiting(admin: any, now: Date): Promise<WaitingItem[]> {
  const items: WaitingItem[] = [];
  const day = new Date(now.getTime() - 24 * 3600_000).toISOString();

  const { data: leads, error: leadErr } = await admin
    .from("leads")
    .select("id, ref, name, created_at, assigned:assigned_to ( email )")
    .eq("status", "new")
    .is("first_contacted_at", null)
    .lt("created_at", new Date(now.getTime() - 15 * 60_000).toISOString())
    .gt("created_at", day)
    .limit(200);
  if (leadErr) throw new Error(`escalation lead query failed: ${leadErr.message}`);
  for (const l of leads ?? []) {
    items.push({
      id: l.id,
      kind: "lead",
      label: `Lead ${l.ref ?? l.id.slice(0, 8)} (${l.name})`,
      waitingMinutes: Math.round((now.getTime() - new Date(l.created_at).getTime()) / 60_000),
      consultantEmail: l.assigned?.email ?? null,
    });
  }

  const { data: chats, error: chatErr } = await admin
    .from("chat_conversations")
    .select("id, handoff_at, lead:lead_id ( ref, name ), consultant:assigned_to ( email )")
    .eq("status", "waiting")
    .is("first_staff_reply_at", null)
    .lt("handoff_at", new Date(now.getTime() - 10 * 60_000).toISOString())
    .gt("handoff_at", day)
    .limit(200);
  if (chatErr) throw new Error(`escalation chat query failed: ${chatErr.message}`);
  for (const c of chats ?? []) {
    items.push({
      id: c.id,
      kind: "chat",
      label: `Chat from ${c.lead?.name ?? "a buyer"}${c.lead?.ref ? ` (lead ${c.lead.ref})` : ""}`,
      waitingMinutes: Math.round((now.getTime() - new Date(c.handoff_at).getTime()) / 60_000),
      consultantEmail: c.consultant?.email ?? null,
    });
  }
  return items;
}
