import { addDaysToDateString, istDateString } from "@/lib/ist-format";
import { alertEmail } from "@/server/automations/alerts";
import type { OutboxRow } from "@/server/automations/types";

/**
 * T8 / T9 / T13: things that expire. Alerts go to the shared alert mailbox, once per item.
 *  - Price rules: a rule that has ended (or ends within 7 days) with no successor for the same scope. Without a
 *    rule the on-road price for that model and city cannot be shown, so this is the one that costs sales.
 *  - Offers ending within 3 days.
 *  - Data-rights requests whose 30-day DPDP deadline is within 5 days.
 */

export interface PriceRuleRow {
  id: string;
  city_id: string;
  model_id: string | null;
  variant_id: string | null;
  fuel: string | null;
  valid_from: string;
  valid_until: string;
  label: string;
}

const sameScope = (a: PriceRuleRow, b: PriceRuleRow) =>
  a.city_id === b.city_id && a.model_id === b.model_id && a.variant_id === b.variant_id && a.fuel === b.fuel;

/** Rules that have ended in the last 30 days or end within 7 days, and nothing takes over from them. */
export function findUncoveredPriceRules(rules: PriceRuleRow[], today: string): PriceRuleRow[] {
  const from = addDaysToDateString(today, -30);
  const to = addDaysToDateString(today, 7);
  return rules.filter((r) => {
    if (r.valid_until < from || r.valid_until > to) return false;
    const nextDay = addDaysToDateString(r.valid_until, 1);
    return !rules.some((s) => s.id !== r.id && sameScope(r, s) && s.valid_until > r.valid_until && s.valid_from <= nextDay);
  });
}

export interface ExpiryInput {
  priceRules: PriceRuleRow[];
  offers: { id: string; title: string; valid_until: string; is_active: boolean }[];
  requests: { id: string; kind: string; due_at: string; status: string }[];
}

export function planExpiryAlerts(input: ExpiryInput, now: Date, env?: Record<string, string | undefined>): OutboxRow[] {
  const to = alertEmail(env) ?? "manager@vrooma.in";
  const today = istDateString(now);
  const rows: OutboxRow[] = [];

  for (const r of findUncoveredPriceRules(input.priceRules, today)) {
    const ended = r.valid_until < today;
    rows.push({
      channel: "email",
      to_address: to,
      template: "price_rule_expiry_alert",
      body:
        `The on-road price rule for ${r.label} ${ended ? `ended on ${r.valid_until}` : `ends on ${r.valid_until}`} and no newer rule covers it. ` +
        `${ended ? "On-road prices for this model and city cannot be shown right now. " : "After that date the on-road price cannot be shown. "}` +
        `Add the next rule in Admin > Catalog > Price rules.`,
      idempotency_key: `pricerule:${r.id}`,
    });
  }

  const offerLimit = addDaysToDateString(today, 3);
  for (const o of input.offers) {
    if (!o.is_active || o.valid_until < today || o.valid_until > offerLimit) continue;
    rows.push({
      channel: "email",
      to_address: to,
      template: "offer_expiry_alert",
      body: `The offer "${o.title}" ends on ${o.valid_until}. Extend it or plan its replacement in Admin > Catalog > Offers.`,
      idempotency_key: `offer:${o.id}`,
    });
  }

  const dueLimit = now.getTime() + 5 * 24 * 3600_000;
  for (const q of input.requests) {
    if (q.status !== "received" && q.status !== "in_progress") continue;
    if (new Date(q.due_at).getTime() > dueLimit) continue;
    rows.push({
      channel: "email",
      to_address: to,
      template: "dpdp_deadline_alert",
      body: `A buyer's data ${q.kind} request is due by ${q.due_at.slice(0, 10)} under the DPDP Act and is still ${q.status.replace("_", " ")}. Please process it in Admin.`,
      idempotency_key: `dpdp:${q.id}`,
    });
  }
  return rows;
}

export async function selectExpiryInput(admin: any, now: Date): Promise<ExpiryInput> {
  const today = istDateString(now);
  const [rules, offers, requests] = await Promise.all([
    admin
      .from("price_rules")
      .select("id, city_id, model_id, variant_id, fuel, valid_from, valid_until, cities:city_id ( name ), models:model_id ( name ), variants:variant_id ( name )")
      .gte("valid_until", addDaysToDateString(today, -400)),
    admin.from("offers").select("id, title, valid_until, is_active").gte("valid_until", today).lte("valid_until", addDaysToDateString(today, 3)),
    admin.from("data_requests").select("id, kind, due_at, status").in("status", ["received", "in_progress"]),
  ]);
  for (const r of [rules, offers, requests]) if (r.error) throw new Error(`expiry query failed: ${r.error.message}`);

  return {
    priceRules: (rules.data ?? []).map((r: any) => ({
      id: r.id,
      city_id: r.city_id,
      model_id: r.model_id,
      variant_id: r.variant_id,
      fuel: r.fuel,
      valid_from: r.valid_from,
      valid_until: r.valid_until,
      label: `${r.variants?.name ? `${r.models?.name ?? ""} ${r.variants.name}`.trim() : (r.models?.name ?? "a model")} in ${r.cities?.name ?? "a city"}`,
    })),
    offers: offers.data ?? [],
    requests: requests.data ?? [],
  };
}
