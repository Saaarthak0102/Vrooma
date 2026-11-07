import { addDaysToDateString, istDateString } from "@/lib/ist-format";
import type { OutboxRow } from "@/server/automations/types";

/**
 * T14: a gentle email to someone who saved a new car 7-14 days ago and has not enquired or booked since.
 * Marketing, so it needs the buyer's `marketing` consent twice over: checked here when queuing, and again by the
 * outbox worker when sending (consent-gate.ts), so an unsubscribe also stops messages already queued.
 * Email only (a WhatsApp marketing template costs money per message); at most 50 per run; once per saved item.
 */
export interface SavedCarItem {
  savedId: string;
  userId: string;
  name: string | null;
  email: string | null;
  modelName: string;
  modelSlug: string;
  savedOn: string;
}

const REAL_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const NUDGE_LIMITS = { fromDays: 7, toDays: 14, perRun: 50 } as const;

export function planSavedCarNudges(items: SavedCarItem[], consentedUserIds: Set<string>, engagedUserIds: Set<string>): OutboxRow[] {
  const rows: OutboxRow[] = [];
  for (const it of items) {
    if (rows.length >= NUDGE_LIMITS.perRun) break;
    if (!consentedUserIds.has(it.userId) || engagedUserIds.has(it.userId)) continue;
    if (!it.email || !REAL_EMAIL.test(it.email)) continue;
    const first = (it.name ?? "").trim().split(/\s+/)[0] || "there";
    rows.push({
      channel: "email",
      to_address: it.email,
      template: "saved_car_nudge",
      body:
        `Hi ${first}, you saved the ${it.modelName} on Vrooma. See its variants and book a test drive at vrooma.in/cars/${it.modelSlug}. ` +
        `We will have the car ready at the showroom of your choice. To stop these emails, untick marketing messages in your Vrooma profile.`,
      idempotency_key: `saved:${it.savedId}`,
    });
  }
  return rows;
}

export async function selectSavedCarInput(
  admin: any,
  now: Date,
): Promise<{ items: SavedCarItem[]; consented: Set<string>; engaged: Set<string> }> {
  const today = istDateString(now);
  const from = new Date(`${addDaysToDateString(today, -NUDGE_LIMITS.toDays)}T00:00:00+05:30`).toISOString();
  const to = new Date(`${addDaysToDateString(today, -NUDGE_LIMITS.fromDays)}T00:00:00+05:30`).toISOString();

  const { data, error } = await admin
    .from("saved_items")
    .select("id, user_id, created_at, models:model_id!inner ( name, slug ), user:user_id ( full_name, email )")
    .not("model_id", "is", null)
    .gte("created_at", from)
    .lt("created_at", to)
    .order("created_at", { ascending: true })
    .limit(300);
  if (error) throw new Error(`saved-car query failed: ${error.message}`);

  const items: SavedCarItem[] = (data ?? []).map((r: any) => ({
    savedId: r.id,
    userId: r.user_id,
    name: r.user?.full_name ?? null,
    email: r.user?.email ?? null,
    modelName: r.models.name,
    modelSlug: r.models.slug,
    savedOn: String(r.created_at).slice(0, 10),
  }));
  const userIds = [...new Set(items.map((i) => i.userId))];
  if (userIds.length === 0) return { items, consented: new Set(), engaged: new Set() };

  const [consents, leads, bookings] = await Promise.all([
    admin.from("current_consents").select("user_id, granted").eq("purpose", "marketing").in("user_id", userIds),
    admin.from("leads").select("user_id").in("user_id", userIds).gte("created_at", from),
    admin.from("bookings").select("user_id").in("user_id", userIds).gte("created_at", from),
  ]);
  return {
    items,
    consented: new Set<string>((consents.data ?? []).filter((c: any) => c.granted === true).map((c: any) => c.user_id)),
    engaged: new Set<string>([...(leads.data ?? []), ...(bookings.data ?? [])].map((r: any) => r.user_id)),
  };
}
