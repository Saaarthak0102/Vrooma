import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { generateLeadCopilot } from "@/server/ai/lead-copilot";
import { Lead } from "@/types/domain";

/**
 * Makes sure a lead carries an AI buyer summary and a first-reply draft.
 *
 * - Only fills columns that are still empty, so a consultant's later edits are never overwritten
 *   and repeated page opens are cheap no-ops.
 * - Drafts come from generateLeadCopilot, which already passes them through the discount-word guard.
 * - Each generation is written to ai_logs (action "copilot_generated"; prompt = the lead context,
 *   response = the draft) so /admin/ai-logs has a real audit trail.
 *
 * Returns the lead with ai_summary / ai_draft populated. Never throws: if persistence fails the
 * in-memory copy is still returned so the desk keeps working.
 */
export async function ensureLeadCopilot(lead: Lead): Promise<Lead> {
  if (lead.ai_summary && lead.ai_draft) return lead;

  const startedAt = Date.now();
  const copilot = await generateLeadCopilot(lead);
  const summary = lead.ai_summary || copilot.summary;
  const draft = lead.ai_draft || copilot.draftReply;

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("leads")
      .update({ ai_summary: summary, ai_draft: draft })
      .eq("id", lead.id);

    if (!error) {
      await admin.from("ai_logs").insert({
        lead_id: lead.id,
        action: "copilot_generated",
        prompt: `Lead ${lead.ref ?? lead.id} · ${lead.model_name || "general enquiry"} · source ${lead.source}`,
        response: draft,
        latency_ms: Date.now() - startedAt,
      });
    } else {
      console.warn(`[copilot] Could not persist AI fields for lead ${lead.id}: ${error.message}`);
    }
  } catch (err: any) {
    console.warn(`[copilot] Persistence skipped for lead ${lead.id}: ${err?.message}`);
  }

  return { ...lead, ai_summary: summary, ai_draft: draft };
}
