import "server-only";

import { calculateEmi } from "@/lib/emi";
import { formatIstDateTime } from "@/lib/ist-format";
import { formatINR } from "@/lib/money";
import type { VehicleSummary } from "@/lib/garage";
import { sanitizeUserText } from "@/server/ai/guard";
import type { SupportIntent } from "@/server/ai/support-bot";
import { listBookings } from "@/server/repositories/bookings";
import { listModels } from "@/server/repositories/models";
import { listOffers } from "@/server/repositories/offers";
import { listShowrooms, listWorkshops } from "@/server/repositories/showrooms";
import { listSlots } from "@/server/repositories/slots";
import { listUsedCars } from "@/server/repositories/used-cars";
import { loadVehicleSummaries } from "@/server/services/garage";
import type { Model } from "@/types/domain";

/**
 * The facts the buyer chatbot answers from. The server gathers them BEFORE the model is called and sends them in the
 * same request, so the model never calls tools (one request per chat turn, which matters on a small free quota, and no
 * dependence on a provider's tool-calling quirks). The facts are the ONLY source of prices, dates and links: the
 * grounding guard rejects any rupee amount in the answer that is not in this text.
 *
 * What is deliberately not here:
 *  - On-road prices. The itemised breakup is gated behind the lead form and comes from the price engine; the bot gives
 *    ex-showroom prices and points to the model page.
 *  - Full registration numbers (only the masked form), inspection reports, valuations, any lead data.
 *  - Another person's data: bookings and garage come from the signed-in session's user id, never from the message.
 *
 * EMI figures are computed here with the site's calculator; the model only quotes them.
 */

export interface ChatFactsDeps {
  listModels: typeof listModels;
  listUsedCars: typeof listUsedCars;
  listOffers: typeof listOffers;
  listSlots: typeof listSlots;
  listShowrooms: typeof listShowrooms;
  listWorkshops: typeof listWorkshops;
  listBookings: typeof listBookings;
  listVehicles: (userId: string) => Promise<VehicleSummary[]>;
  now: () => Date;
}

const realDeps: ChatFactsDeps = {
  listModels,
  listUsedCars,
  listOffers,
  listSlots,
  listShowrooms,
  listWorkshops,
  listBookings,
  listVehicles: loadVehicleSummaries,
  now: () => new Date(),
};

export const DEFAULT_LOAN_RATE_PCT = 9.5;
const FINANCED_SHARE = 0.8;

// --- Reading what the buyer typed (pure, unit tested) ------------------------------------------------------------

export interface LoanRequest {
  principal: number | null;
  tenureMonths: number | null;
  ratePct: number | null;
}

/** "EMI on 10 lakh for 5 years at 8.5%" -> { 1,000,000; 60; 8.5 }. Anything outside sensible bounds is ignored. */
export function parseLoanRequest(text: string): LoanRequest {
  const t = (text ?? "").toLowerCase();

  let principal: number | null = null;
  const unit = /(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr)\b/.exec(t);
  if (unit) {
    principal = Number(unit[1]) * (unit[2].startsWith("cr") ? 10_000_000 : 100_000);
  } else {
    const plain = /(?:₹|rs\.?\s*)?\s*(\d{1,3}(?:,\d{2,3})+|\d{5,9})\b/.exec(t);
    if (plain) principal = Number(plain[1].replace(/,/g, ""));
  }
  if (principal !== null && (principal < 50_000 || principal > 50_000_000)) principal = null;

  let tenureMonths: number | null = null;
  const tenure = /(\d+(?:\.\d+)?)\s*(years?|yrs?|months?|mos?)\b/.exec(t);
  if (tenure) tenureMonths = Math.round(Number(tenure[1]) * (tenure[2].startsWith("y") ? 12 : 1));
  if (tenureMonths !== null && (tenureMonths < 12 || tenureMonths > 84)) tenureMonths = null;

  let ratePct: number | null = null;
  const rate = /(\d+(?:\.\d+)?)\s*%/.exec(t);
  if (rate) ratePct = Number(rate[1]);
  if (ratePct !== null && (ratePct < 5 || ratePct > 20)) ratePct = null;

  return { principal, tenureMonths, ratePct };
}

/** Models the buyer named ("Model H", "model-h"). */
export function mentionedModels<T extends Pick<Model, "name" | "slug">>(message: string, models: T[]): T[] {
  const t = (message ?? "").toLowerCase();
  return models.filter((m) => t.includes(m.name.toLowerCase()) || t.includes(m.slug.toLowerCase()));
}

const wants = (message: string, pattern: RegExp) => pattern.test(message);

const emiLine = (principal: number, months: number, rate: number) =>
  `${formatINR(principal)} over ${months} months at ${rate}%: ${formatINR(calculateEmi(principal, rate, months))} a month`;

// --- Building the fact text --------------------------------------------------------------------------------------

export interface ChatFacts {
  /** Goes into the system prompt. */
  text: string;
}

export async function buildChatFacts(
  input: { message: string; intent: SupportIntent; userId: string | null },
  deps: ChatFactsDeps = realDeps,
): Promise<ChatFacts> {
  const { message, intent, userId } = input;
  const today = deps.now().toISOString().slice(0, 10);
  const sections: string[] = [];

  const [models, offers] = await Promise.all([deps.listModels({}), deps.listOffers().catch(() => [])]);

  // New cars: always (small, and almost every question needs a model or a price).
  sections.push(
    "NEW CARS (ex-showroom prices):\n" +
      models
        .map((m) => {
          const variants = (m.variants ?? [])
            .map((v) => `${v.name} (${v.fuel}, ${v.transmission}) ${formatINR(v.ex_showroom)}`)
            .join("; ");
          return `- ${m.name}, ${m.body_type}: ${variants || "variants coming soon"}. Page: /cars/${m.slug}`;
        })
        .join("\n"),
  );

  const liveOffers = offers.filter((o) => o.active && o.valid_until >= today).slice(0, 4);
  if (liveOffers.length) {
    sections.push("CURRENT OFFERS (page /offers):\n" + liveOffers.map((o) => `- ${o.title}: ${o.body} (valid until ${o.valid_until})`).join("\n"));
  }

  // Used cars
  if (intent === "used_cars" || intent === "trade_in" || wants(message, /\b(used|pre[\s-]?owned|second[\s-]?hand|certified|uc-\d+)\b/i)) {
    const cars = (await deps.listUsedCars({ limit: 30 })).filter((c) => c.status === "available").slice(0, 8);
    sections.push(
      cars.length
        ? "CERTIFIED USED CARS (available now; registration numbers are always masked):\n" +
            cars
              .map((c) => `- ${c.stock_id}: ${c.year} ${c.model_name} ${c.variant_name}, ${c.fuel}, ${c.km.toLocaleString("en-IN")} km, ${c.owners} owner${c.owners === 1 ? "" : "s"}, ${formatINR(c.price)}, ${c.reg_no_masked}. Page: /used-cars/${c.stock_id}`)
              .join("\n")
        : "CERTIFIED USED CARS: none listed as available right now. Page: /used-cars",
    );
  }

  // Open slots
  const slotKind = intent === "service" ? "service" : intent === "test_drive" || wants(message, /\b(slot|available|availability|book|saturday|sunday|monday|tuesday|wednesday|thursday|friday|tomorrow|today|weekend)\b/i) ? "test_drive" : null;
  if (slotKind) {
    const [slots, showrooms, workshops] = await Promise.all([deps.listSlots({ kind: slotKind, limit: 40 }), deps.listShowrooms(), deps.listWorkshops()]);
    const names = new Map<string, string>([...showrooms, ...workshops].map((p) => [p.id, p.name]));
    const open = slots.filter((s) => s.capacity - s.booked_count > 0).slice(0, 6);
    sections.push(
      `NEXT FREE ${slotKind === "service" ? "SERVICE" : "TEST DRIVE"} SLOTS (India time, at least 2 hours' notice; the buyer books on the page, you cannot book for them):\n` +
        (open.length
          ? open.map((s) => `- ${formatIstDateTime(s.starts_at)} at ${names.get(s.showroom_id ?? s.workshop_id ?? "") ?? "Vrooma"}`).join("\n")
          : "- none open right now") +
        `\nBooking page: ${slotKind === "service" ? "/book/service" : "/book/test-drive"}`,
    );
  }

  // Locations
  if (intent === "test_drive" || intent === "service" || wants(message, /\b(where|address|location|hours|open|opening|timing|near|directions|phone|call)\b/i)) {
    const [showrooms, workshops] = await Promise.all([deps.listShowrooms(), deps.listWorkshops()]);
    const line = (p: { name: string; address: string; phone: string; hours: Record<string, string> }) =>
      `- ${p.name}: ${p.address}. Phone ${p.phone}. Hours ${Object.entries(p.hours ?? {}).map(([d, h]) => `${d} ${h}`).join(", ") || "see the page"}`;
    sections.push("SHOWROOMS:\n" + showrooms.map(line).join("\n") + "\nWORKSHOPS:\n" + workshops.map(line).join("\n") + "\nPage: /showrooms");
  }

  // EMI (computed here, quoted by the model)
  if (intent === "emi" || wants(message, /\b(emi|loan|finance|instal+ment|down\s?payment)\b/i)) {
    const req = parseLoanRequest(message);
    const rate = req.ratePct ?? DEFAULT_LOAN_RATE_PCT;
    const assumed = req.ratePct === null ? ` (${DEFAULT_LOAN_RATE_PCT}% is an assumed rate; the real rate depends on the lender)` : "";
    const lines: string[] = [];
    if (req.principal) {
      for (const months of req.tenureMonths ? [req.tenureMonths] : [36, 60, 84]) lines.push(emiLine(req.principal, months, rate));
    } else {
      const named = mentionedModels(message, models);
      const variants = named.flatMap((m) => m.variants ?? []).slice(0, 3);
      if (variants.length) {
        for (const v of variants) {
          const loan = Math.round((v.ex_showroom * FINANCED_SHARE) / 1000) * 1000;
          lines.push(`${v.name}: financing 80% of ${formatINR(v.ex_showroom)} = ${emiLine(loan, req.tenureMonths ?? 60, rate)}`);
        }
      } else {
        for (const months of req.tenureMonths ? [req.tenureMonths] : [36, 60, 84]) lines.push(emiLine(1_000_000, months, rate));
      }
    }
    sections.push(`EMI FIGURES${assumed}. Quote these exactly; do not calculate your own. Calculator page: /emi-calculator\n` + lines.map((l) => `- ${l}`).join("\n"));
  }

  // The signed-in buyer's own data
  if (userId) {
    if (intent === "test_drive" || intent === "service" || wants(message, /\b(my|booking|bookings|appointment|ref)\b/i)) {
      const now = deps.now().getTime();
      const mine = (await deps.listBookings(userId))
        .filter((b) => b.status === "confirmed" && new Date(b.starts_at).getTime() >= now - 24 * 3600_000)
        .slice(0, 5);
      sections.push(
        "THIS BUYER'S BOOKINGS:\n" +
          (mine.length
            ? mine.map((b) => `- ${b.ref ?? "booking"}: ${b.kind === "test_drive" ? "test drive" : "service"} on ${formatIstDateTime(b.starts_at)} at ${b.showroom_or_workshop_name}${b.vehicle_info?.model_name ? ` for ${sanitizeUserText(b.vehicle_info.model_name, 40, { redact: false })}` : ""}`).join("\n")
            : "- no upcoming bookings") +
          "\nManage them at /dashboard",
      );
    }
    if (intent === "service" || wants(message, /\b(my car|service due|due date|insurance|puc|warranty|odometer|next service)\b/i)) {
      const cars = await deps.listVehicles(userId);
      sections.push(
        "THIS BUYER'S CARS:\n" +
          (cars.length
            ? cars
                .map((c) => {
                  const name = sanitizeUserText(`${c.modelName}${c.variantName ? ` ${c.variantName}` : ""}`, 60, { redact: false });
                  return `- ${name} (${c.regMasked}): last service ${c.lastService?.servicedOn ?? "not recorded"}; next service due ${c.nextService?.dueOn ?? "not recorded"}${c.nextService?.dueKm ? ` or at ${c.nextService.dueKm.toLocaleString("en-IN")} km` : ""}; insurance ends ${c.insuranceExpiry ?? "not recorded"}; PUC ends ${c.pucExpiry ?? "not recorded"}; warranty ends ${c.warrantyEnd ?? "not recorded"}`;
                })
                .join("\n")
            : "- none added yet") +
          "\nAdd or edit cars under My cars on the Profile page: /profile",
      );
    }
  }

  return { text: sections.join("\n\n") };
}
