import { describe, it, expect } from "vitest";
import { calculateEmi, calculateAmortisation } from "../src/lib/emi";

describe("EMI calculator", () => {
  it("calculates monthly EMI for standard loan correctly", () => {
    // 10,00,000 at 8.5% for 60 months
    // Standard EMI formula gives ~20517
    const emi = calculateEmi(1000000, 8.5, 60);
    expect(emi).toBe(20517);
  });

  it("handles 0% interest promotional rate without dividing by zero", () => {
    const emi = calculateEmi(600000, 0, 36);
    expect(emi).toBe(16667);
  });

  it("returns 0 for non-positive principal or tenure", () => {
    expect(calculateEmi(0, 8.5, 60)).toBe(0);
    expect(calculateEmi(500000, 8.5, 0)).toBe(0);
  });

  it("generates valid amortisation schedule where principal paid closes balance", () => {
    const principal = 500000;
    const rate = 9.0;
    const months = 12;

    const result = calculateAmortisation(principal, rate, months);
    expect(result.schedule.length).toBe(12);
    expect(result.monthlyEmi).toBeGreaterThan(0);
    expect(result.schedule[0].openingBalance).toBe(principal);
    expect(result.schedule[months - 1].closingBalance).toBe(0);

    const totalPrincipal = result.schedule.reduce((acc, row) => acc + row.principal, 0);
    expect(totalPrincipal).toBe(principal);
  });
});
