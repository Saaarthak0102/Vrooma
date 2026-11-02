import { describe, it, expect } from "vitest";
import { formatINR, formatLakh, parseMoney } from "../src/lib/money";

describe("money utilities", () => {
  it("formats integer amounts to INR correctly with Indian grouping", () => {
    expect(formatINR(1245000)).toBe("₹12,45,000");
    expect(formatINR(845000)).toBe("₹8,45,000");
    expect(formatINR(512000)).toBe("₹5,12,000");
    expect(formatINR(500)).toBe("₹500");
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(-50000)).toBe("-₹50,000");
  });

  it("formats amounts in Lakh and Crore format", () => {
    expect(formatLakh(1245000)).toBe("₹12.45 lakh");
    expect(formatLakh(21100000)).toBe("₹2.11 cr");
    expect(formatLakh(845000)).toBe("₹8.45 lakh");
    expect(formatLakh(512000)).toBe("₹5.12 lakh");
  });

  it("parses currency strings into integer rupee numbers", () => {
    expect(parseMoney("₹12,45,000")).toBe(1245000);
    expect(parseMoney("845000")).toBe(845000);
    expect(parseMoney("₹ 5,12,000.50")).toBe(512001);
  });
});
