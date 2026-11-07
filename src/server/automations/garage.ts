import { daysUntil } from "@/lib/garage";
import { addDaysToDateString, istDateString } from "@/lib/ist-format";
import type { OutboxRow } from "@/server/automations/types";

/**
 * T10 / T11: service-due, and insurance / PUC / warranty expiry reminders for owners.
 *
 * Consent gate: these are not about a booking the buyer just made, so a message is only sent to owners whose latest
 * `service_contact` consent is granted (the unticked "Send me service and insurance reminders" box under My cars).
 * Unticking it later appends a granted=false event and the next run stops. Every message says how to switch off.
 *
 * Windows (each fires once, the first run inside it; the date is part of the idempotency key so a new service date
 * or renewed document starts a fresh cycle):
 *   service due:           14 days and 3 days before
 *   insurance / PUC / warranty: 30 days and 7 days before
 */

export interface GarageVehicle {
  id: string;
  userId: string;
  modelName: string;
  regMasked: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  nextServiceOn: string | null;
  insuranceExpiry: string | null;
  pucExpiry: string | null;
  warrantyEnd: string | null;
}

const REAL_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const OPT_OUT = "To stop these reminders, untick the reminders box under My cars in your Vrooma dashboard.";

interface Window {
  key: string;
  /** Fires while daysUntil is in (above, upTo]. */
  above: number;
  upTo: number;
}
const SERVICE_WINDOWS: Window[] = [
  { key: "d14", above: 3, upTo: 14 },
  { key: "d3", above: -1, upTo: 3 },
];
const DOCUMENT_WINDOWS: Window[] = [
  { key: "d30", above: 7, upTo: 30 },
  { key: "d7", above: -1, upTo: 7 },
];

function inWindow(days: number, w: Window) {
  return days > w.above && days <= w.upTo;
}

function channelsFor(v: GarageVehicle, template: string, body: string, key: string): OutboxRow[] {
  const rows: OutboxRow[] = [];
  if (v.email && REAL_EMAIL.test(v.email)) {
    rows.push({ channel: "email", to_address: v.email, template, body, idempotency_key: `${key}:email` });
  }
  if (v.whatsapp) {
    rows.push({ channel: "whatsapp", to_address: v.whatsapp, template, body, idempotency_key: `${key}:wa` });
  }
  return rows;
}

const DOCUMENTS: { field: "insuranceExpiry" | "pucExpiry" | "warrantyEnd"; code: string; label: string }[] = [
  { field: "insuranceExpiry", code: "ins", label: "insurance" },
  { field: "pucExpiry", code: "puc", label: "PUC certificate" },
  { field: "warrantyEnd", code: "war", label: "warranty" },
];

export function planGarageReminders(vehicles: GarageVehicle[], consentedUserIds: Set<string>, today: string): OutboxRow[] {
  const rows: OutboxRow[] = [];
  for (const v of vehicles) {
    if (!consentedUserIds.has(v.userId)) continue;
    const first = (v.name ?? "").trim().split(/\s+/)[0] || "there";
    const car = `${v.modelName} (${v.regMasked})`;

    if (v.nextServiceOn) {
      const days = daysUntil(v.nextServiceOn, today);
      const w = SERVICE_WINDOWS.find((x) => inWindow(days, x));
      if (w) {
        const when = days <= 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`;
        const body = `Hi ${first}, your ${car} is due for its service ${when} (${v.nextServiceOn}). Book a slot at vrooma.in/book/service in about a minute. ${OPT_OUT}`;
        rows.push(...channelsFor(v, "service_due", body, `svc${w.key}:${v.id}:${v.nextServiceOn}`));
      }
    }

    for (const doc of DOCUMENTS) {
      const date = v[doc.field];
      if (!date) continue;
      const days = daysUntil(date, today);
      const w = DOCUMENT_WINDOWS.find((x) => inWindow(days, x));
      if (!w) continue;
      const when = days <= 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`;
      const body = `Hi ${first}, the ${doc.label} for your ${car} ends ${when} (${date}). Renew it on time to stay covered. ${OPT_OUT}`;
      rows.push(...channelsFor(v, "insurance_expiry", body, `${doc.code}${w.key}:${v.id}:${date}`));
    }
  }
  return rows;
}

/** Loads cars with a service or document date in the next 30 days, plus their owners' reminder consent. */
export async function selectGarageInput(admin: any, now: Date): Promise<{ vehicles: GarageVehicle[]; consented: Set<string>; today: string }> {
  const today = istDateString(now);
  const d30 = addDaysToDateString(today, 30);
  const d14 = addDaysToDateString(today, 14);

  const [docRes, dueRes] = await Promise.all([
    admin
      .from("owner_vehicles")
      .select("id")
      .or(
        `and(insurance_expiry.gte.${today},insurance_expiry.lte.${d30}),and(puc_expiry.gte.${today},puc_expiry.lte.${d30}),and(warranty_end.gte.${today},warranty_end.lte.${d30})`,
      )
      .limit(2000),
    admin.from("service_records").select("vehicle_id").gte("next_due_on", today).lte("next_due_on", d14).limit(2000),
  ]);
  if (docRes.error) throw new Error(`garage query failed: ${docRes.error.message}`);
  if (dueRes.error) throw new Error(`garage query failed: ${dueRes.error.message}`);

  const ids = [...new Set<string>([...(docRes.data ?? []).map((r: any) => r.id), ...(dueRes.data ?? []).map((r: any) => r.vehicle_id)])];
  if (ids.length === 0) return { vehicles: [], consented: new Set(), today };

  const { data: rows, error } = await admin
    .from("owner_vehicles")
    .select("id, user_id, model_name, reg_masked, insurance_expiry, puc_expiry, warranty_end, user:user_id ( full_name, email, phone, whatsapp )")
    .in("id", ids);
  if (error) throw new Error(`garage query failed: ${error.message}`);

  // Only the latest service record decides the next due date (an older one is superseded by a newer visit).
  const { data: records } = await admin
    .from("service_records")
    .select("vehicle_id, serviced_on, next_due_on")
    .in("vehicle_id", ids)
    .order("serviced_on", { ascending: false });
  const latestDue = new Map<string, string | null>();
  for (const r of records ?? []) if (!latestDue.has(r.vehicle_id)) latestDue.set(r.vehicle_id, r.next_due_on);

  const userIds = [...new Set<string>((rows ?? []).map((r: any) => r.user_id))];
  const { data: consents } = await admin
    .from("current_consents")
    .select("user_id, granted")
    .eq("purpose", "service_contact")
    .in("user_id", userIds);
  const consented = new Set<string>((consents ?? []).filter((c: any) => c.granted === true).map((c: any) => c.user_id));

  const vehicles: GarageVehicle[] = (rows ?? []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    modelName: r.model_name,
    regMasked: r.reg_masked,
    name: r.user?.full_name ?? null,
    email: r.user?.email ?? null,
    whatsapp: r.user?.whatsapp || r.user?.phone || null,
    nextServiceOn: latestDue.get(r.id) ?? null,
    insuranceExpiry: r.insurance_expiry,
    pucExpiry: r.puc_expiry,
    warrantyEnd: r.warranty_end,
  }));
  return { vehicles, consented, today };
}
