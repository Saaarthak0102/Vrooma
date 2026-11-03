export const BRAND_NAME = "Vrooma";
export const BRAND_TAGLINE = "Lucknow's Premier Car Destination";
export const DEALER_NAME = "Vrooma Automobiles Pvt. Ltd.";
export const DEALER_CITY = "Lucknow";

export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "hi"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const CITIES = [
  { id: "city-lucknow", name: "Lucknow", state: "Uttar Pradesh", slug: "lucknow" },
  { id: "city-kanpur", name: "Kanpur", state: "Uttar Pradesh", slug: "kanpur" },
] as const;

export const DEFAULT_CITY = CITIES[0];

export const FUEL_TYPES = [
  { label: "Petrol", value: "petrol" },
  { label: "Diesel", value: "diesel" },
  { label: "CNG", value: "cng" },
  { label: "Electric (EV)", value: "ev" },
  { label: "Hybrid", value: "hybrid" },
] as const;

export const TRANSMISSION_TYPES = [
  { label: "Automatic", value: "automatic" },
  { label: "Manual", value: "manual" },
] as const;

export const BODY_TYPES = [
  { label: "Sedan", value: "sedan" },
  { label: "SUV", value: "suv" },
  { label: "Hatchback", value: "hatchback" },
  { label: "EV", value: "ev" },
  { label: "MPV", value: "mpv" },
] as const;

export const SLA_MINUTES = 5;
export const SLA_SECONDS = SLA_MINUTES * 60;

export const NEW_ARRIVAL_DAYS = 60;
export const JUST_LISTED_DAYS = 14;
export const LOW_KM_THRESHOLD = 25000;

export const SUV_EV_TAG_OVERRIDES_OTHERS = true;

export const COMPANY_FACTS = {
  staff: 340,
  newCarsYear: 6000,
  usedCarsYear: 900,
  annualRevenue: "₹550–650 Cr",
} as const;

export const EMI_DEFAULTS = {
  annualRatePct: 8.5,
  tenureMonths: 60,
  downPaymentPct: 20,
} as const;

export * from "@/constants/vehicle-assets";


