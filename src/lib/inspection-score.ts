/**
 * A compact inspection scorecard for the Used-Car Manager: eight categories rated 1 to 5 each,
 * summarised as a 0-100 score. (The full 140-point report stays an upload; this replaces typing raw JSON.)
 */

export const INSPECTION_CATEGORIES = [
  "Engine",
  "Transmission",
  "Suspension & brakes",
  "Body & paint",
  "Interior",
  "Electricals",
  "Tyres",
  "Documents",
] as const;

export type InspectionCategory = (typeof INSPECTION_CATEGORIES)[number];
export type Scorecard = Partial<Record<InspectionCategory, number>>;

/** True only when every category carries a whole rating from 1 to 5. */
export function isScorecardComplete(card: Scorecard): boolean {
  return INSPECTION_CATEGORIES.every((c) => {
    const v = card[c];
    return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;
  });
}

/** 0-100, or null while the card is incomplete (an unscored car must never show an invented score). */
export function scoreFromScorecard(card: Scorecard): number | null {
  if (!isScorecardComplete(card)) return null;
  const total = INSPECTION_CATEGORIES.reduce((sum, c) => sum + (card[c] as number), 0);
  return Math.round((total / (INSPECTION_CATEGORIES.length * 5)) * 100);
}

/** Reads a previously saved scorecard out of the stored inspection JSON. */
export function readScorecard(inspection: Record<string, unknown> | null | undefined): Scorecard {
  const raw = inspection?.scorecard;
  if (!raw || typeof raw !== "object") return {};
  const card: Scorecard = {};
  for (const c of INSPECTION_CATEGORIES) {
    const v = (raw as Record<string, unknown>)[c];
    if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5) card[c] = v;
  }
  return card;
}
