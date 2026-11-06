/**
 * Used-car price band from PAST SALES of the same model (brief: "suggests a price band for used cars from
 * past sales of the same model, year and kilometres"). Pure, so it can be tested and reasoned about.
 *
 * It is a suggestion for the Used-Car Manager only. The manager sets every final price.
 */

export interface PastSale {
  model_name: string;
  year: number;
  fuel: string;
  km: number;
  sold_price: number;
}

export interface BandSubject {
  model_name: string;
  year: number;
  fuel?: string | null;
  km: number;
}

export interface PriceBand {
  low: number;
  median: number;
  high: number;
  confidence: "high" | "medium" | "low";
  /** How many past sales the band is really based on. 0 means there was nothing comparable. */
  sampleSize: number;
  rationale: string;
}

/** Each year newer is worth about 7% more; every 10,000 km driven costs about 0.5%. */
const YEAR_STEP = 0.07;
const KM_STEP_PER_10K = 0.005;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Round to the nearest ₹1,000: a price band is guidance, not a quote. */
const round1000 = (n: number) => Math.round(n / 1000) * 1000;

export function computePriceBand(subject: BandSubject, history: PastSale[]): PriceBand | null {
  const wantedModel = subject.model_name.trim().toLowerCase();

  const comparable = history.filter(
    (s) =>
      s.model_name.trim().toLowerCase() === wantedModel &&
      Math.abs(s.year - subject.year) <= 2 &&
      (!subject.fuel || s.fuel === subject.fuel)
  );

  if (comparable.length === 0) return null;

  // Bring each past sale to the subject's year and mileage before comparing prices.
  const adjusted = comparable
    .map((s) => {
      const yearFactor = 1 + (subject.year - s.year) * YEAR_STEP;
      const kmFactor = 1 + ((s.km - subject.km) / 10_000) * KM_STEP_PER_10K;
      return s.sold_price * yearFactor * kmFactor;
    })
    .sort((a, b) => a - b);

  const n = adjusted.length;
  // With very few sales a percentile band is meaningless; use the plain spread instead.
  const low = n >= 4 ? percentile(adjusted, 0.25) : adjusted[0];
  const high = n >= 4 ? percentile(adjusted, 0.75) : adjusted[n - 1];
  const median = percentile(adjusted, 0.5);

  const confidence: PriceBand["confidence"] = n >= 5 ? "high" : n >= 3 ? "medium" : "low";

  return {
    low: round1000(low),
    median: round1000(median),
    high: round1000(high),
    confidence,
    sampleSize: n,
    rationale: `Based on ${n} past sale${n === 1 ? "" : "s"} of ${subject.model_name} (within 2 years of ${subject.year}), adjusted for year and kilometres.`,
  };
}
