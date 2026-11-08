import { istDateString } from "./ist-format";
export const TCS_THRESHOLD = 1_000_000;

export interface PriceEngineVariant {
  id: string;
  name: string;
  ex_showroom: number;
}

export interface PriceEngineRule {
  id: string;
  city_id: string;
  model_id?: string | null;
  variant_id?: string | null;
  fuel?: string | null;
  road_tax_pct: number;
  registration: number;
  insurance: number;
  handling: number;
  accessories: number;
  tcs_pct?: number | null;
  valid_from: string; // YYYY-MM-DD
  valid_until: string; // YYYY-MM-DD
  notes?: string | null;
}

export interface PriceLine {
  key: string;
  label: string;
  amount: number;
  optional?: boolean;
}

export interface OnRoadBreakup {
  lines: PriceLine[];
  total: number;
  validUntil: string;
  source: "price_rules";
  notes?: string | null;
}

export interface ComputeOnRoadParams {
  variant: PriceEngineVariant;
  rule: PriceEngineRule | null | undefined;
  includeAccessories?: boolean;
  date?: string | Date;
}

/**
 * Pure price engine function to compute on-road price breakup.
 * Returns null if no rule is provided or if current date is outside rule validity range.
 */
export function computeOnRoad({
  variant,
  rule,
  includeAccessories = true,
  date = new Date(),
}: ComputeOnRoadParams): OnRoadBreakup | null {
  if (!rule || !rule.valid_from || !rule.valid_until) {
    // No rule, or a rule without a validity window: never invent a price.
    return null;
  }

  // Check date validity
  const targetDate = typeof date === "string" ? new Date(date) : date;
  // The Indian calendar date: between midnight and 05:30 IST the UTC date is still yesterday, which would price a
  // rule that ended yesterday and ignore one that starts today.
  const targetIso = istDateString(targetDate);

  if (targetIso < rule.valid_from || targetIso > rule.valid_until) {
    return null;
  }

  const exShowroom = variant.ex_showroom;
  const roadTax = Math.round(exShowroom * (rule.road_tax_pct / 100));
  const registration = Math.round(rule.registration);
  const insurance = Math.round(rule.insurance);
  const handling = Math.round(rule.handling);
  const accessories = includeAccessories ? Math.round(rule.accessories) : 0;
  
  // TCS applies only above ₹10,00,000 ex-showroom (context.md §3.1); matches the get_onroad_* SQL functions.
  const tcsPct = rule.tcs_pct ?? 0;
  const tcs = tcsPct > 0 && exShowroom > TCS_THRESHOLD ? Math.round(exShowroom * (tcsPct / 100)) : 0;

  const lines: PriceLine[] = [
    { key: "ex_showroom", label: "Ex-Showroom Price", amount: exShowroom },
    { key: "road_tax", label: `Road Tax / RTO (${rule.road_tax_pct}%)`, amount: roadTax },
    { key: "registration", label: "Registration & Smart Card", amount: registration },
    { key: "insurance", label: "Comprehensive Insurance (1+3 Yr)", amount: insurance },
    { key: "handling", label: "Handling & Logistics Charges", amount: handling },
  ];

  if (accessories > 0) {
    lines.push({
      key: "accessories",
      label: "Essential Accessories Pack",
      amount: accessories,
      optional: true,
    });
  }

  if (tcs > 0) {
    lines.push({
      key: "tcs",
      label: `TCS (${tcsPct}%)`,
      amount: tcs,
    });
  }

  const total = lines.reduce((acc, curr) => acc + curr.amount, 0);

  return {
    lines,
    total,
    validUntil: rule.valid_until,
    source: "price_rules",
    notes: rule.notes,
  };
}

