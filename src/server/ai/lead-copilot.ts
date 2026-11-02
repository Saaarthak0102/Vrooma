import { Lead } from "@/types/domain";

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
      draftReply: `Namaste ${lead.name}, thank you for your interest in our certified ${lead.model_name || "used car"}. The vehicle has passed our 140-point mechanical inspection. May I reserve an exclusive viewing slot for you today at our Hazratganj showroom?`,
      suggestedAction: "Lock a showroom inspection slot within 2 hours",
    };
  }

  return {
    summary: `New car enquiry for ${lead.model_name || "Brand X lineup"}. Customer requested on-road pricing and test drive options in Lucknow.`,
    draftReply: `Namaste ${lead.name}, thank you for choosing Vrooma. I have the official Lucknow on-road price breakup ready for you. Would you prefer a showroom demo at Hazratganj or an executive doorstep test drive tomorrow?`,
    suggestedAction: "Schedule a 45-minute home test drive",
  };
}
