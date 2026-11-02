import { describe, it, expect } from "vitest";
import { maskRegNo, maskPhone } from "../src/lib/masking";

describe("masking utilities for DPDP compliance", () => {
  it("masks Indian registration numbers per specification", () => {
    expect(maskRegNo("UP32AB1234")).toBe("UP32 ** **** 1234");
    expect(maskRegNo("UP-32-CD-5678")).toBe("UP32 ** **** 5678");
    expect(maskRegNo("up32ef9999")).toBe("UP32 ** **** 9999");
    expect(maskRegNo("UP321234")).toBe("UP32 ** **** 1234");
  });

  it("handles null, empty or short reg numbers safely", () => {
    expect(maskRegNo(null)).toBe("UP32 ** **** ****");
    expect(maskRegNo("")).toBe("UP32 ** **** ****");
    expect(maskRegNo("UP32")).toBe("UP32 ** **** ****");
  });

  it("masks phone numbers safely", () => {
    expect(maskPhone("9876543210")).toBe("******3210");
    expect(maskPhone("+919876543210")).toBe("+91 ******3210");
    expect(maskPhone(null)).toBe("******0000");
  });
});
