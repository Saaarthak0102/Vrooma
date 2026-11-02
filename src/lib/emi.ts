export interface AmortisationEntry {
  month: number;
  openingBalance: number;
  emi: number;
  principal: number;
  interest: number;
  closingBalance: number;
}

/**
 * Calculates monthly EMI given principal amount, annual interest rate (e.g. 8.5 for 8.5%), and tenure in months.
 * Gracefully handles 0% rate.
 */
export function calculateEmi(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (annualRatePct <= 0) {
    return Math.round(principal / months);
  }

  const monthlyRate = annualRatePct / (12 * 100);
  const factor = Math.pow(1 + monthlyRate, months);
  const emi = (principal * monthlyRate * factor) / (factor - 1);

  return Math.round(emi);
}

/**
 * Generates an amortisation schedule for a loan.
 */
export function calculateAmortisation(
  principal: number,
  annualRatePct: number,
  months: number
): {
  monthlyEmi: number;
  totalInterest: number;
  totalPayment: number;
  schedule: AmortisationEntry[];
} {
  const monthlyEmi = calculateEmi(principal, annualRatePct, months);
  if (monthlyEmi <= 0) {
    return { monthlyEmi: 0, totalInterest: 0, totalPayment: 0, schedule: [] };
  }

  const monthlyRate = annualRatePct > 0 ? annualRatePct / (12 * 100) : 0;
  let balance = principal;
  let totalInterest = 0;
  const schedule: AmortisationEntry[] = [];

  for (let m = 1; m <= months; m++) {
    const interest = Math.round(balance * monthlyRate);
    const principalPaid = m === months ? balance : Math.min(balance, monthlyEmi - interest);
    const closing = Math.max(0, balance - principalPaid);
    totalInterest += interest;

    schedule.push({
      month: m,
      openingBalance: balance,
      emi: monthlyEmi,
      principal: principalPaid,
      interest,
      closingBalance: closing,
    });

    balance = closing;
  }

  return {
    monthlyEmi,
    totalInterest,
    totalPayment: principal + totalInterest,
    schedule,
  };
}
