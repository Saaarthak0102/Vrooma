import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { calculateEmi } from "@/lib/emi";
import { formatINR } from "@/lib/money";
import { listOffers } from "@/server/repositories/offers";
import { listBookings } from "@/server/repositories/bookings";
import { getModelBySlug, listModels } from "@/server/repositories/models";
import { listShowrooms, listWorkshops } from "@/server/repositories/showrooms";
import { listSlots } from "@/server/repositories/slots";
import { listUsedCars } from "@/server/repositories/used-cars";
import { loadVehicleSummaries } from "@/server/services/garage";
import type { VehicleSummary } from "@/lib/garage";

/**
 * Read-only tools the buyer chatbot may call. They are the ONLY source of facts, prices and dates in an answer
 * (guard.ts rejects any rupee amount that is not in a tool result).
 *
 * What is deliberately not here:
 *  - On-road prices. The itemised on-road breakup is gated behind the lead form and comes from the price engine;
 *    the bot gives ex-showroom prices and points to the model page for the rest.
 *  - Registration numbers (only the masked form is ever in a result), inspection reports, valuations, lead data.
 *  - Anything that writes. Booking, handoff and everything else go through the existing screens and routes.
 *
 * Per-user tools take the user id from the session closure, never from a model argument, so the model cannot ask
 * for someone else's data.
 */

export interface ChatToolDeps {
  listModels: typeof listModels;
  getModelBySlug: typeof getModelBySlug;
  listUsedCars: typeof listUsedCars;
  listOffers: typeof listOffers;
  listSlots: typeof listSlots;
  listShowrooms: typeof listShowrooms;
  listWorkshops: typeof listWorkshops;
  listBookings: typeof listBookings;
  listVehicles: (userId: string) => Promise<VehicleSummary[]>;
  now: () => Date;
}

const realDeps: ChatToolDeps = {
  listModels,
  getModelBySlug,
  listUsedCars,
  listOffers,
  listSlots,
  listShowrooms,
  listWorkshops,
  listBookings,
  listVehicles: loadVehicleSummaries,
  now: () => new Date(),
};

const FUELS = ["petrol", "diesel", "cng", "ev", "hybrid"] as const;
const DEFAULT_LOAN_RATE_PCT = 9.5;
const MAX_RESULTS = 5;

const rupees = (n: number | null | undefined) => (n == null ? null : formatINR(n));

function istText(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildChatTools(ctx: { userId: string | null }, deps: ChatToolDeps = realDeps) {
  const tools = {
    search_new_cars: tool({
      description:
        "Search Vrooma's new Brand X models. Returns up to 5 models with ex-showroom price range and page link. Use for questions like 'SUVs under 15 lakh' or 'diesel automatic'.",
      parameters: z.object({
        maxPrice: z.number().int().positive().optional().describe("Maximum ex-showroom price in rupees"),
        fuel: z.enum(FUELS).optional(),
        bodyType: z.string().max(30).optional().describe("e.g. suv, hatchback, sedan"),
        query: z.string().max(60).optional().describe("Model name words"),
      }),
      execute: async ({ maxPrice, fuel, bodyType, query }) => {
        const models = await deps.listModels({ search: query, bodyType, fuel, maxPrice });
        return {
          count: models.length,
          models: models.slice(0, MAX_RESULTS).map((m) => ({
            name: m.name,
            bodyType: m.body_type,
            tagline: m.tagline,
            exShowroomFrom: rupees(m.min_price),
            exShowroomTo: rupees(m.max_price),
            fuels: [...new Set((m.variants ?? []).map((v) => v.fuel))],
            page: `/cars/${m.slug}`,
          })),
          note: "Ex-showroom prices only. The full on-road price (road tax, insurance, registration, handling) is on the model page.",
        };
      },
    }),

    get_model_details: tool({
      description: "Variants of one new model: fuel, transmission and ex-showroom price. Use the slug from search_new_cars (the page path after /cars/).",
      parameters: z.object({ slug: z.string().min(2).max(80) }),
      execute: async ({ slug }) => {
        const model = await deps.getModelBySlug(slug.replace(/^\/?cars\//, ""));
        if (!model) return { found: false };
        return {
          found: true,
          name: model.name,
          tagline: model.tagline,
          page: `/cars/${model.slug}`,
          variants: (model.variants ?? []).map((v) => ({
            name: v.name,
            fuel: v.fuel,
            transmission: v.transmission,
            exShowroom: rupees(v.ex_showroom),
          })),
          note: "Ex-showroom prices. On-road price breakup for the buyer's city is on the model page.",
        };
      },
    }),

    search_used_cars: tool({
      description:
        "Search Vrooma's certified used cars. Returns up to 5 listings with year, km, owners, fuel and price. Registration numbers are always masked.",
      parameters: z.object({
        maxPrice: z.number().int().positive().optional(),
        fuel: z.enum(FUELS).optional(),
        minYear: z.number().int().min(2000).max(2100).optional(),
        maxKm: z.number().int().positive().optional(),
        query: z.string().max(60).optional().describe("Model name words"),
      }),
      execute: async ({ maxPrice, fuel, minYear, maxKm, query }) => {
        const cars = await deps.listUsedCars({ maxPrice, fuel, minYear, maxKm, search: query, limit: 20 });
        const available = cars.filter((c) => c.status === "available");
        return {
          count: available.length,
          cars: available.slice(0, MAX_RESULTS).map((c) => ({
            stockId: c.stock_id,
            name: `${c.year} ${c.model_name} ${c.variant_name}`,
            fuel: c.fuel,
            km: c.km,
            owners: c.owners,
            price: rupees(c.price),
            registration: c.reg_no_masked,
            page: `/used-cars/${c.stock_id}`,
          })),
        };
      },
    }),

    calculate_emi: tool({
      description:
        "Monthly EMI for a car loan. If the buyer gave no interest rate, leave annualRatePct out: 9.5% is used and the result says it is an assumption.",
      parameters: z.object({
        principal: z.number().int().min(50_000).max(50_000_000).describe("Loan amount in rupees"),
        tenureMonths: z.number().int().min(12).max(84),
        annualRatePct: z.number().min(5).max(20).optional(),
      }),
      execute: async ({ principal, tenureMonths, annualRatePct }) => {
        const rate = annualRatePct ?? DEFAULT_LOAN_RATE_PCT;
        const emi = calculateEmi(principal, rate, tenureMonths);
        const total = emi * tenureMonths;
        return {
          loanAmount: rupees(principal),
          tenureMonths,
          annualRatePct: rate,
          rateIsAssumption: annualRatePct === undefined,
          monthlyEmi: rupees(emi),
          totalInterest: rupees(Math.max(0, total - principal)),
          totalPayable: rupees(total),
          note: "Indicative only. The final rate depends on the lender. Full schedule at /emi-calculator.",
        };
      },
    }),

    list_offers: tool({
      description: "Current Vrooma offers with their validity dates.",
      parameters: z.object({}),
      execute: async () => {
        const today = deps.now().toISOString().slice(0, 10);
        const offers = (await deps.listOffers()).filter((o) => o.active && o.valid_until >= today);
        return {
          count: offers.length,
          offers: offers.slice(0, 6).map((o) => ({ title: o.title, details: o.body, validUntil: o.valid_until })),
          page: "/offers",
        };
      },
    }),

    list_open_slots: tool({
      description:
        "Next free test drive or service slots (IST). The buyer books on the booking page; you cannot book for them. Optional date as YYYY-MM-DD.",
      parameters: z.object({
        kind: z.enum(["test_drive", "service"]),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
      execute: async ({ kind, date }) => {
        const [slots, showrooms, workshops] = await Promise.all([
          deps.listSlots({ kind, date, limit: 40 }),
          deps.listShowrooms(),
          deps.listWorkshops(),
        ]);
        const names = new Map<string, string>([...showrooms, ...workshops].map((p) => [p.id, p.name]));
        const open = slots
          .filter((s) => s.capacity - s.booked_count > 0)
          .slice(0, 8)
          .map((s) => ({
            when: istText(s.starts_at),
            where: names.get(s.showroom_id ?? s.workshop_id ?? "") ?? "Vrooma",
            seatsLeft: s.capacity - s.booked_count,
          }));
        return {
          count: open.length,
          slots: open,
          bookingPage: kind === "test_drive" ? "/book/test-drive" : "/book/service",
          note: "Slots need at least 2 hours' notice.",
        };
      },
    }),

    list_locations: tool({
      description: "Vrooma showrooms and service workshops with address, phone and opening hours.",
      parameters: z.object({}),
      execute: async () => {
        const [showrooms, workshops] = await Promise.all([deps.listShowrooms(), deps.listWorkshops()]);
        const shape = (p: { name: string; address: string; phone: string; hours: Record<string, string> }) => ({
          name: p.name,
          address: p.address,
          phone: p.phone,
          hours: p.hours,
        });
        return { showrooms: showrooms.map(shape), workshops: workshops.map(shape), page: "/showrooms" };
      },
    }),
  };

  // Only for signed-in buyers; the user id comes from the session, never from the model.
  if (!ctx.userId) return tools;
  const userId = ctx.userId;
  return {
    ...tools,
    my_bookings: tool({
      description: "The signed-in buyer's own upcoming and recent test drive and service bookings.",
      parameters: z.object({}),
      execute: async () => {
        const now = deps.now().getTime();
        const all = await deps.listBookings(userId);
        const mine = all
          .filter((b) => b.status === "confirmed" && new Date(b.starts_at).getTime() >= now - 24 * 3600_000)
          .slice(0, 5)
          .map((b) => ({
            ref: b.ref ?? null,
            kind: b.kind === "test_drive" ? "test drive" : "service",
            when: istText(b.starts_at),
            where: b.showroom_or_workshop_name,
            car: b.vehicle_info?.model_name ?? null,
          }));
        return { count: mine.length, bookings: mine, page: "/dashboard" };
      },
    }),
    my_garage: tool({
      description:
        "The signed-in buyer's own cars: model, masked registration, last service, next service due, and insurance, PUC and warranty end dates. Use for 'when is my service due' or 'when does my insurance expire'.",
      parameters: z.object({}),
      execute: async () => {
        const cars = await deps.listVehicles(userId);
        return {
          count: cars.length,
          cars: cars.map((c) => ({
            car: `${c.modelName}${c.variantName ? ` ${c.variantName}` : ""}`,
            registration: c.regMasked,
            odometerKm: c.odometerKm,
            lastService: c.lastService?.servicedOn ?? null,
            nextServiceDueOn: c.nextService?.dueOn ?? null,
            nextServiceDueAtKm: c.nextService?.dueKm ?? null,
            insuranceEnds: c.insuranceExpiry,
            pucEnds: c.pucExpiry,
            warrantyEnds: c.warrantyEnd,
          })),
          page: "/dashboard",
          note: "Add or edit cars under My cars on the dashboard.",
        };
      },
    }),
  };
}

export type ChatTools = ReturnType<typeof buildChatTools>;
