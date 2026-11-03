import {
  NEW_ARRIVAL_DAYS,
  JUST_LISTED_DAYS,
  LOW_KM_THRESHOLD,
  SUV_EV_TAG_OVERRIDES_OTHERS,
} from "./constants";

export interface NewCarTagInput {
  isFeatured?: boolean;
  hasActiveOffer?: boolean;
  createdAt?: string | Date | null;
  bodyType: string;
  variants?: { fuel?: string }[];
  now?: Date | string;
  overrideSuvEv?: boolean;
}

export type NewCarTagResult =
  | "featured"
  | "offer"
  | "newArrival"
  | "familyFriendly"
  | "ecoFriendly"
  | { bodyType: string };

export interface UsedCarTagInput {
  listedAt?: string | Date | null;
  km: number;
  owners: number;
  inspectionScore?: number | null;
  now?: Date | string;
}

export type UsedCarTagResult =
  | "justListed"
  | "lowKms"
  | "oneOwner"
  | "inspected"
  | null;

/**
 * Returns date string YYYY-MM-DD in Asia/Kolkata timezone.
 */
export function getKolkataDateString(date: Date | string | number): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Computes calendar day difference (now - past) in Asia/Kolkata timezone.
 */
export function diffDaysKolkata(
  pastDate: Date | string,
  nowDate: Date | string = new Date()
): number {
  const dPast = typeof pastDate === "string" ? new Date(pastDate) : pastDate;
  const dNow = typeof nowDate === "string" ? new Date(nowDate) : nowDate;

  if (isNaN(dPast.getTime()) || isNaN(dNow.getTime())) {
    return Infinity;
  }

  const pastStr = getKolkataDateString(dPast);
  const nowStr = getKolkataDateString(dNow);

  const pastUtc = Date.UTC(
    Number(pastStr.slice(0, 4)),
    Number(pastStr.slice(5, 7)) - 1,
    Number(pastStr.slice(8, 10))
  );
  const nowUtc = Date.UTC(
    Number(nowStr.slice(0, 4)),
    Number(nowStr.slice(5, 7)) - 1,
    Number(nowStr.slice(8, 10))
  );

  return Math.round((nowUtc - pastUtc) / (1000 * 60 * 60 * 24));
}

/**
 * Determines whether a model is an EV.
 * EV is true if bodyType is 'ev' (or 'electric'), or if all variants have fuel 'ev'.
 */
export function isEvModel(bodyType: string, variants?: { fuel?: string }[]): boolean {
  const normalizedBody = bodyType?.toLowerCase().trim();
  if (normalizedBody === "ev" || normalizedBody === "electric") {
    return true;
  }
  if (variants && variants.length > 0 && variants.every((v) => v.fuel?.toLowerCase().trim() === "ev")) {
    return true;
  }
  return false;
}

/**
 * Determines whether a model is an SUV.
 */
export function isSuvModel(bodyType: string): boolean {
  const normalizedBody = bodyType?.toLowerCase().trim();
  return normalizedBody === "suv";
}

/**
 * Tag resolution for new models in priority order:
 * When SUV_EV_TAG_OVERRIDES_OTHERS is true:
 * 1. EV -> "ecoFriendly"
 * 2. SUV -> "familyFriendly" (EV beats SUV)
 * 3. isFeatured -> "featured"
 * 4. hasActiveOffer -> "offer"
 * 5. createdAt within NEW_ARRIVAL_DAYS (60) -> "newArrival"
 * 6. Fallback -> { bodyType }
 *
 * When SUV_EV_TAG_OVERRIDES_OTHERS is false:
 * 1. isFeatured -> "featured"
 * 2. hasActiveOffer -> "offer"
 * 3. createdAt within NEW_ARRIVAL_DAYS (60) -> "newArrival"
 * 4. EV -> "ecoFriendly"
 * 5. SUV -> "familyFriendly"
 * 6. Fallback -> { bodyType }
 */
export function newCarTag({
  isFeatured,
  hasActiveOffer,
  createdAt,
  bodyType,
  variants,
  now = new Date(),
  overrideSuvEv = SUV_EV_TAG_OVERRIDES_OTHERS,
}: NewCarTagInput): NewCarTagResult {
  const isEv = isEvModel(bodyType, variants);
  const isSuv = isSuvModel(bodyType);

  if (overrideSuvEv) {
    if (isEv) return "ecoFriendly";
    if (isSuv) return "familyFriendly";
  }

  if (isFeatured) {
    return "featured";
  }

  if (hasActiveOffer) {
    return "offer";
  }

  if (createdAt) {
    const days = diffDaysKolkata(createdAt, now);
    if (days >= 0 && days <= NEW_ARRIVAL_DAYS) {
      return "newArrival";
    }
  }

  if (!overrideSuvEv) {
    if (isEv) return "ecoFriendly";
    if (isSuv) return "familyFriendly";
  }

  return { bodyType };
}

/**
 * Tag resolution for certified pre-owned cars in priority order:
 * 1. listedAt within JUST_LISTED_DAYS (14) -> "justListed"
 * 2. km <= LOW_KM_THRESHOLD (25,000) -> "lowKms"
 * 3. owners === 1 -> "oneOwner"
 * 4. inspectionScore > 0 -> "inspected"
 * 5. Fallback -> null
 */
export function usedCarTag({
  listedAt,
  km,
  owners,
  inspectionScore,
  now = new Date(),
}: UsedCarTagInput): UsedCarTagResult {
  if (listedAt) {
    const days = diffDaysKolkata(listedAt, now);
    if (days >= 0 && days <= JUST_LISTED_DAYS) {
      return "justListed";
    }
  }

  if (km <= LOW_KM_THRESHOLD) {
    return "lowKms";
  }

  if (owners === 1) {
    return "oneOwner";
  }

  if (typeof inspectionScore === "number" && inspectionScore > 0) {
    return "inspected";
  }

  return null;
}

/**
 * Indicates whether a tag should display a 6px accent dot prefix.
 * Only "featured", "offer", and "justListed" receive the accent dot.
 */
export function hasAccentDot(tag: string | null | { bodyType: string }): boolean {
  return tag === "featured" || tag === "offer" || tag === "justListed";
}

