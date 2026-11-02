/**
 * Formats an integer amount in Indian Rupee format.
 * Example: 1245000 -> "₹12,45,000"
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "₹0";
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));

  const str = absAmount.toString();
  if (str.length <= 3) {
    return `${isNegative ? "-" : ""}₹${str}`;
  }

  const lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);
  const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");

  return `${isNegative ? "-" : ""}₹${formattedOther},${lastThree}`;
}

/**
 * Formats an amount in Lakhs / Crores.
 * Example: 1245000 -> "₹12.45 lakh"
 * Example: 21100000 -> "₹2.11 cr"
 */
export function formatLakh(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "₹0";
  const abs = Math.abs(amount);
  const prefix = amount < 0 ? "-₹" : "₹";

  if (abs >= 10000000) {
    const cr = abs / 10000000;
    return `${prefix}${cr.toFixed(2).replace(/\.00$/, "")} cr`;
  }
  if (abs >= 100000) {
    const lakh = abs / 100000;
    return `${prefix}${lakh.toFixed(2).replace(/\.00$/, "")} lakh`;
  }
  return formatINR(amount);
}

/**
 * Parses a currency string or number input into an integer rupee value.
 */
export function parseMoney(input: string | number): number {
  if (typeof input === "number") return Math.round(input);
  const cleaned = input.replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed);
}
