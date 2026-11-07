import fs from "node:fs";
import { describe, expect, it } from "vitest";

import {
  daysUntil,
  isPlausibleReg,
  normaliseReg,
  serviceVisitSchema,
  suggestNextService,
  vehicleInputSchema,
} from "@/lib/garage";
import { planGarageReminders, type GarageVehicle } from "@/server/automations/garage";
import { findForbiddenDiscountWord } from "@/lib/validation/discount";

describe("garage rules", () => {
  it("normalises and validates registration numbers", () => {
    expect(normaliseReg(" up32 ab-1234 ")).toBe("UP32AB1234");
    for (const ok of ["UP32AB1234", "DL1CAB1234", "UP321234", "MH12DE1433"]) expect(isPlausibleReg(ok)).toBe(true);
    for (const bad of ["", "1234", "UP32", "ABCDEFGH", "UP32AB12345X"]) expect(isPlausibleReg(bad)).toBe(false);
  });

  it("validates a vehicle form, treating blanks as null and rejecting bad dates and registrations", () => {
    const ok = vehicleInputSchema.parse({ regNo: "up32 ab 1234", modelName: " Model H ", variantName: "", odometerKm: "18250", insuranceExpiry: "2026-12-01", pucExpiry: "", boughtFromVrooma: true });
    expect(ok).toMatchObject({ regNo: "UP32AB1234", modelName: "Model H", variantName: null, odometerKm: 18250, insuranceExpiry: "2026-12-01", pucExpiry: null });
    expect(vehicleInputSchema.safeParse({ regNo: "nope", modelName: "X" }).success).toBe(false);
    expect(vehicleInputSchema.safeParse({ regNo: "UP32AB1234", modelName: "X", insuranceExpiry: "2026-13-45" }).success).toBe(false);
    expect(vehicleInputSchema.safeParse({ regNo: "UP32AB1234", modelName: "X", odometerKm: "9999999" }).success).toBe(false);
    expect(vehicleInputSchema.safeParse({ regNo: "UP32AB1234", modelName: "" }).success).toBe(false);
  });

  it("validates a service visit and suggests the usual next service", () => {
    expect(serviceVisitSchema.parse({ odometerKm: "18250", nextDueOn: "", summary: "" })).toMatchObject({ odometerKm: 18250, nextDueOn: null, summary: null });
    expect(serviceVisitSchema.safeParse({ odometerKm: -5 }).success).toBe(false);
    expect(suggestNextService("2026-11-08", 18250)).toEqual({ nextDueOn: "2027-05-08", nextDueKm: 28250 });
    expect(suggestNextService("2026-08-31", 100)).toMatchObject({ nextDueKm: 10100 });
  });

  it("counts days between dates", () => {
    expect(daysUntil("2026-11-20", "2026-11-08")).toBe(12);
    expect(daysUntil("2026-11-08", "2026-11-08")).toBe(0);
    expect(daysUntil("2026-11-01", "2026-11-08")).toBe(-7);
  });
});

describe("service and expiry reminders", () => {
  const car = (over: Partial<GarageVehicle> = {}): GarageVehicle => ({
    id: "v1", userId: "u1", modelName: "Model H", regMasked: "UP32 ** **** 1234", name: "Asha Verma",
    email: "asha@example.com", whatsapp: "+919876543210",
    nextServiceOn: null, insuranceExpiry: null, pucExpiry: null, warrantyEnd: null, ...over,
  });
  const today = "2026-11-08";
  const yes = new Set(["u1"]);

  it("sends nothing to an owner who has not opted in, or who has since switched reminders off", () => {
    const due = car({ nextServiceOn: "2026-11-15", insuranceExpiry: "2026-11-20" });
    expect(planGarageReminders([due], new Set(), today)).toEqual([]);
    expect(planGarageReminders([due], new Set(["someone-else"]), today)).toEqual([]);
    expect(planGarageReminders([due], yes, today).length).toBeGreaterThan(0);
  });

  it("sends the service-due reminder at 14 days and again at 3 days, once per window and date", () => {
    const at14 = planGarageReminders([car({ nextServiceOn: "2026-11-20" })], yes, today);
    expect(at14.map((r) => [r.channel, r.template, r.idempotency_key])).toEqual([
      ["email", "service_due", "svcd14:v1:2026-11-20:email"],
      ["whatsapp", "service_due", "svcd14:v1:2026-11-20:wa"],
    ]);
    expect(at14[0].body).toContain("in 12 days");
    const at3 = planGarageReminders([car({ nextServiceOn: "2026-11-10" })], yes, today);
    expect(at3[0].idempotency_key).toBe("svcd3:v1:2026-11-10:email");
    expect(planGarageReminders([car({ nextServiceOn: "2026-12-30" })], yes, today)).toEqual([]);
    expect(planGarageReminders([car({ nextServiceOn: "2026-11-01" })], yes, today)).toEqual([]); // already past
    // a new service date is a new cycle
    expect(planGarageReminders([car({ nextServiceOn: "2027-05-08" })], yes, "2027-04-30")[0].idempotency_key).toContain("2027-05-08");
  });

  it("reminds about insurance, PUC and warranty at 30 and 7 days, naming the document", () => {
    const rows = planGarageReminders([car({ insuranceExpiry: "2026-11-30", pucExpiry: "2026-11-12", warrantyEnd: "2027-03-01" })], yes, today);
    const email = rows.filter((r) => r.channel === "email");
    expect(email.map((r) => r.idempotency_key)).toEqual(["insd30:v1:2026-11-30:email", "pucd7:v1:2026-11-12:email"]);
    expect(email[0].template).toBe("insurance_expiry");
    expect(email[0].body).toContain("insurance");
    expect(email[1].body).toContain("PUC certificate");
  });

  it("uses only the channels the owner has, always says how to switch off, and never contains a discount word", () => {
    const rows = planGarageReminders([car({ nextServiceOn: "2026-11-10", insuranceExpiry: "2026-11-12", email: "not-an-email", whatsapp: null })], yes, today);
    expect(rows).toEqual([]);
    const all = planGarageReminders([car({ nextServiceOn: "2026-11-10", insuranceExpiry: "2026-11-12" })], yes, today);
    for (const r of all) {
      expect(r.body).toContain("untick the reminders box under My cars");
      expect(findForbiddenDiscountWord(r.body)).toBeNull();
      expect(r.body).not.toContain("UP32AB1234");
    }
  });
});

describe("migration 0039", () => {
  const sql = fs.readFileSync("supabase/migrations/0039_owner_garage.sql", "utf8");

  it("protects both tables with RLS and owner-only policies, and keeps one record per booking", () => {
    expect(sql).toContain("ALTER TABLE public.owner_vehicles ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("USING (user_id = auth.uid())");
    expect(sql).toMatch(/booking_id UUID UNIQUE REFERENCES public\.bookings/);
    expect(sql).toContain("uq_owner_vehicles_reg");
  });

  it("erases the garage when an account is anonymised (the profile row is kept, so cascade alone is not enough)", () => {
    expect(sql).toContain("AFTER UPDATE OF anonymised_at ON public.profiles");
    expect(sql).toContain("DELETE FROM public.owner_vehicles WHERE user_id = NEW.id");
  });
});
