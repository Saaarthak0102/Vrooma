import { Lead } from "@/types/domain";
import { findForbiddenDiscountWord } from "@/lib/validation/discount";

// Used when a generated draft trips the dealership policy filter (never quote discounts, price cuts or waivers).
const SAFE_DRAFT = (name: string) =>
  `Namaste ${name}, thank you for contacting Vrooma. I am your dedicated specialist and will share the official on-road price breakup and available test drive slots with you shortly.`;

function guardDraft(draft: string, name: string): string {
  return findForbiddenDiscountWord(draft) === null ? draft : SAFE_DRAFT(name);
}

export interface CopilotGenerationResult {
  summary: string;
  draftReply: string;
  suggestedAction: string;
}

/**
 * Generates an AI summary and first-reply draft for an inbound lead.
 * In Phase 1 mock mode, returns contextual responses adhering to guardrails.
 */
export async function generateLeadCopilot(lead: Lead): Promise<CopilotGenerationResult> {
  const isUsed = !!lead.used_car_id;
  
  if (isUsed) {
    return {
      summary: `Inbound prospect for Certified Pre-Owned ${lead.model_name || "vehicle"}. Customer has confirmed contact consent. Focus on 140-point inspection certification and showroom viewing.`,
      draftReply: guardDraft(
        `Namaste ${lead.name}, thank you for your interest in our certified ${lead.model_name || "used car"}. The vehicle has passed our 140-point mechanical inspection. May I reserve an exclusive viewing slot for you today at our Hazratganj showroom?`,
        lead.name
      ),
      suggestedAction: "Lock a showroom inspection slot within 2 hours",
    };
  }

  return {
    summary: `New car enquiry for ${lead.model_name || "Brand X lineup"}. Customer requested on-road pricing and test drive options in Lucknow.`,
    draftReply: guardDraft(
      `Namaste ${lead.name}, thank you for choosing Vrooma. I have the official Lucknow on-road price breakup ready for you. Would you prefer a showroom demo at Hazratganj or an executive doorstep test drive tomorrow?`,
      lead.name
    ),
    suggestedAction: "Schedule a 45-minute home test drive",
  };
}

