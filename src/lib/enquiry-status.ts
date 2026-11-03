import { LeadStatus } from "@/types/domain";

export type BuyerStatusTone = "active" | "neutral";

export interface BuyerStatusConfig {
  key: LeadStatus;
  labelEn: string;
  labelHi: string;
  tone: BuyerStatusTone;
  isActive: boolean;
}

export const BUYER_STATUS_MAP: Record<LeadStatus, BuyerStatusConfig> = {
  new: {
    key: "new",
    labelEn: "Received",
    labelHi: "प्राप्त हुआ",
    tone: "active",
    isActive: true,
  },
  contacted: {
    key: "contacted",
    labelEn: "In touch",
    labelHi: "संपर्क में",
    tone: "active",
    isActive: true,
  },
  test_drive_booked: {
    key: "test_drive_booked",
    labelEn: "Test drive booked",
    labelHi: "टेस्ट ड्राइव बुक",
    tone: "active",
    isActive: true,
  },
  negotiating: {
    key: "negotiating",
    labelEn: "In discussion",
    labelHi: "बातचीत जारी",
    tone: "active",
    isActive: true,
  },
  won: {
    key: "won",
    labelEn: "Completed",
    labelHi: "पूर्ण हुआ",
    tone: "neutral",
    isActive: false,
  },
  lost: {
    key: "lost",
    labelEn: "Closed",
    labelHi: "बंद",
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
    labelHi: "प्राप्त हुआ",
    tone: "active",
    isActive: true,
  };
}

