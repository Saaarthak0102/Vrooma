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

