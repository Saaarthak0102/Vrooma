import { describe, it, expect } from "vitest";
import { getBuyerEnquiryStatus, BUYER_STATUS_MAP } from "@/lib/enquiry-status";

describe("getBuyerEnquiryStatus", () => {
  it("maps 'new' to 'Received' with active tone", () => {
    const s = getBuyerEnquiryStatus("new");
    expect(s.labelEn).toBe("Received");
    expect(s.tone).toBe("active");
    expect(s.isActive).toBe(true);
  });

  it("maps 'contacted' to 'In touch' with active tone", () => {
    const s = getBuyerEnquiryStatus("contacted");
    expect(s.labelEn).toBe("In touch");
    expect(s.tone).toBe("active");
  });

  it("maps 'test_drive_booked' to 'Test drive booked' with active tone", () => {
    const s = getBuyerEnquiryStatus("test_drive_booked");
    expect(s.labelEn).toBe("Test drive booked");
    expect(s.tone).toBe("active");
  });

  it("maps 'negotiating' to 'In discussion' with active tone", () => {
    const s = getBuyerEnquiryStatus("negotiating");
    expect(s.labelEn).toBe("In discussion");
    expect(s.tone).toBe("active");
  });

  it("maps 'won' to 'Completed' with neutral tone", () => {
    const s = getBuyerEnquiryStatus("won");
    expect(s.labelEn).toBe("Completed");
    expect(s.tone).toBe("neutral");
    expect(s.isActive).toBe(false);
  });

  it("maps 'lost' to 'Closed' with neutral tone", () => {
    const s = getBuyerEnquiryStatus("lost");
    expect(s.labelEn).toBe("Closed");
    expect(s.tone).toBe("neutral");
    expect(s.isActive).toBe(false);
  });

  it("contains zero amber or red tones across all statuses", () => {
    Object.values(BUYER_STATUS_MAP).forEach((config) => {
      expect(["active", "neutral"]).toContain(config.tone);
    });
  });

  it("falls back gracefully for unknown status", () => {
    const s = getBuyerEnquiryStatus("some_unknown_status");
    expect(s.labelEn).toBe("Received");
    expect(s.tone).toBe("active");
  });
});

