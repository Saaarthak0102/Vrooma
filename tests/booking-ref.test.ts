import { describe, it, expect } from "vitest";
import { bookingRef } from "@/lib/booking-ref";

describe("bookingRef", () => {
  it("converts sample booking id correctly", () => {
    expect(bookingRef("book-sample-1")).toBe("VR-BOOKSA");
  });

  it("handles uuid formats", () => {
    expect(bookingRef("550e8400-e29b-41d4-a716-446655440000")).toBe("VR-550E84");
  });

  it("handles short IDs by right-padding with zeroes", () => {
    expect(bookingRef("b-1")).toBe("VR-B10000");
  });

  it("handles empty or falsy inputs gracefully", () => {
    expect(bookingRef("")).toBe("VR-000000");
  });

  it("uppercases lowercase letters and ignores hyphens/underscores", () => {
    expect(bookingRef("vr_test_99")).toBe("VR-VRTEST");
  });
});

