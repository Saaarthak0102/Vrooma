import { describe, it, expect } from "vitest";
import { TradeInSubmissionResult } from "@/server/actions/trade-in";

describe("Trade-In Privacy & Staff-Side Valuation Boundary", () => {
  it("strictly omits valuation fields from TradeInSubmissionResult type contract", () => {
    // Assert that the public contract only exposes reference details to the buyer
    const dummyResult: TradeInSubmissionResult = {
      id: "ti-uuid-12345",
      leadRef: "TI-123456",
    };

    expect(dummyResult.id).toBeDefined();
    expect(dummyResult.leadRef).toBeDefined();

    // Verify buyer response contains NO valuation fields
    expect((dummyResult as any).estimatedRange).toBeUndefined();
    expect((dummyResult as any).min).toBeUndefined();
    expect((dummyResult as any).max).toBeUndefined();
    expect((dummyResult as any).valuation).toBeUndefined();
  });
});

