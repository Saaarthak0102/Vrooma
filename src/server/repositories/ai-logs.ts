import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";

export interface AiReplyAuditEntry {
  id: string;
  leadId: string | null;
  customerName: string | null;
  leadRef: string | null;
  /** The AI-generated draft the consultant started from. */
  draft: string;
  /** What the consultant actually sent. */
  finalSent: string;
  edited: boolean;
  createdAt: string;
}

export interface AiAuditSummary {
  draftsGenerated: number;
  repliesSent: number;
  repliesEdited: number;
}

/**
 * Admin-only audit trail of AI first-reply drafts against what consultants sent.
 * Rows are written by ensureLeadCopilot (generation) and sendLeadReplyAction (send).
 */
export async function listAiReplyAudit(limit = 100): Promise<{
  entries: AiReplyAuditEntry[];
  summary: AiAuditSummary;
}> {
  const admin = createAdminClient();

  const [rows, generated] = await Promise.all([
    admin
      .from("ai_logs")
      .select("id, lead_id, action, prompt, response, created_at, leads:lead_id ( name, ref )")
      .in("action", ["reply_sent_unedited", "reply_sent_edited"])
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 200)),
    admin.from("ai_logs").select("id", { count: "exact", head: true }).eq("action", "copilot_generated"),
  ]);

  if (rows.error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to load AI audit logs: ${rows.error.message}`);
  }

  const entries: AiReplyAuditEntry[] = (rows.data ?? []).map((row: any) => ({
    id: row.id,
    leadId: row.lead_id,
    customerName: row.leads?.name ?? null,
    leadRef: row.leads?.ref ?? null,
    draft: row.prompt ?? "",
    finalSent: row.response ?? "",
    edited: row.action === "reply_sent_edited",
    createdAt: row.created_at,
  }));

  return {
    entries,
    summary: {
      draftsGenerated: generated.count ?? 0,
      repliesSent: entries.length,
      repliesEdited: entries.filter((e) => e.edited).length,
    },
  };
}
