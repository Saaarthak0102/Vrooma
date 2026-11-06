/**
 * Dealership financial leakage constants derived directly from the brief.
 * Lives outside the "use server" action file because such files may only export async functions.
 */
export const BRIEF_LEAK_CONSTANTS = {
  carsLostPerMonthDelayed: 54, // 1,350 delayed leads × 4% delta
  dealerMarginPerCarINR: 25000,
  monthlySalesLeakINR: 1350000, // ₹13.5 Lakh / month
  annualSalesLeakINR: 16200000, // ₹1.62 Crore / year
  avgServiceBillINR: 4500,
  serviceMarginPct: 30,
  monthlyServiceLeakINR: 405000, // ₹4.05 Lakh / month
  annualServiceLeakINR: 4860000, // ₹48.6 Lakh / year
  totalAnnualLeakINR: 21060000, // ₹2.11 Crore / year
};
