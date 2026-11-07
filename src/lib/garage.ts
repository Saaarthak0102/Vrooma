import { z } from "zod";

/**
 * Pure rules for the owner garage and service history. No I/O, so they are unit-tested directly and shared by the
 * buyer actions, the staff "attended" dialog and the reminder automations.
 */

/** Upper-case letters and digits only: "up32 ab-1234" -> "UP32AB1234". */
export function normaliseReg(input: string | null | undefined): string {
  return (input ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/** State (2 letters), RTO (1-2 digits), optional series (0-3 letters), 4 digits. */
export function isPlausibleReg(normalised: string): boolean {
  return /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/.test(normalised);
}

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-11-30")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), "Not a real date");

const optionalDate = z.preprocess((v) => (v === "" || v === undefined ? null : v), dateString.nullable());
const optionalKm = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
  z.number().int().min(0).max(999_999).nullable(),
);

export const vehicleInputSchema = z.object({
  id: z.string().uuid().optional(),
  regNo: z
    .string()
    .transform(normaliseReg)
    .refine(isPlausibleReg, "Enter a valid registration number, for example UP32AB1234"),
  modelName: z.string().trim().min(1, "Enter the model").max(80),
  variantName: z.preprocess((v) => (v === "" ? null : v), z.string().trim().max(80).nullable().optional()),
  purchaseDate: optionalDate.optional(),
  boughtFromVrooma: z.boolean().default(false),
  odometerKm: optionalKm.optional(),
  insuranceExpiry: optionalDate.optional(),
  pucExpiry: optionalDate.optional(),
  warrantyEnd: optionalDate.optional(),
});
export type VehicleInput = z.infer<typeof vehicleInputSchema>;

export const serviceVisitSchema = z.object({
  odometerKm: z.preprocess((v) => Number(v), z.number().int().min(0).max(999_999)),
  nextDueOn: optionalDate.optional(),
  nextDueKm: optionalKm.optional(),
  summary: z.preprocess((v) => (v === "" ? null : v), z.string().trim().max(300).nullable().optional()),
});
export type ServiceVisitInput = z.infer<typeof serviceVisitSchema>;

export const MAX_VEHICLES_PER_USER = 5;

/** Shown next to the unticked reminder checkbox and stored (as a hash) with the service_contact consent. */
export const REMINDER_CONSENT_TEXT =
  "I agree that Vrooma may message me by WhatsApp and email about my car's service due date and its insurance, PUC and warranty expiry. I can switch this off any time under My cars.";
const SERVICE_INTERVAL_MONTHS = 6;
const SERVICE_INTERVAL_KM = 10_000;

/** The usual next service: 6 months or 10,000 km after this one. Staff can change both. */
export function suggestNextService(servicedOn: string, odometerKm: number): { nextDueOn: string; nextDueKm: number } {
  const d = new Date(`${servicedOn}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + SERVICE_INTERVAL_MONTHS);
  return { nextDueOn: d.toISOString().slice(0, 10), nextDueKm: odometerKm + SERVICE_INTERVAL_KM };
}

/** Whole days from `today` to `date` (both YYYY-MM-DD); negative once past. */
export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export interface VehicleSummary {
  id: string;
  regMasked: string;
  modelName: string;
  variantName: string | null;
  odometerKm: number | null;
  insuranceExpiry: string | null;
  pucExpiry: string | null;
  warrantyEnd: string | null;
  lastService: { servicedOn: string; odometerKm: number } | null;
  nextService: { dueOn: string | null; dueKm: number | null } | null;
}
