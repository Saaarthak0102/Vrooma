import { LeadStatus } from "@/types/domain";

export type BuyerStatusTone = "active" | "neutral";

export interface BuyerStatusConfig {
  key: LeadStatus;
  labelEn: string;
  tone: BuyerStatusTone;
  isActive: boolean;
}

export const BUYER_STATUS_MAP: Record<LeadStatus, BuyerStatusConfig> = {
  new: {
    key: "new",
    labelEn: "Received",
    tone: "active",
    isActive: true,
  },
  contacted: {
    key: "contacted",
    labelEn: "In touch",
    tone: "active",
    isActive: true,
  },
  test_drive_booked: {
    key: "test_drive_booked",
    labelEn: "Test drive booked",
    tone: "active",
    isActive: true,
  },
  negotiating: {
    key: "negotiating",
    labelEn: "In discussion",
    tone: "active",
    isActive: true,
  },
  won: {
    key: "won",
    labelEn: "Completed",
    tone: "neutral",
    isActive: false,
  },
  lost: {
    key: "lost",
    labelEn: "Closed",
    tone: "neutral",
    isActive: false,
  },
};

/**
 * Returns buyer-safe status config without any amber/red states.
 */
export function getBuyerEnquiryStatus(status: string): BuyerStatusConfig {
  const normalized = status.toLowerCase() as LeadStatus;
  if (normalized in BUYER_STATUS_MAP) {
    return BUYER_STATUS_MAP[normalized];
  }
  // Safe default for unknown status
  return {
    key: "new",
    labelEn: "Received",
    tone: "active",
    isActive: true,
  };
}

