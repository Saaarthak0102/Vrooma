import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import type { AiActivityRow } from "@/lib/ai-activity";
import { istDayStart } from "@/server/ai/budget";
import { aiEnabled, pickModelId, type AiProvider } from "@/server/ai/provider";

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

export interface AiActivitySettings {
  enabled: boolean;
  provider: string;
  fastModel: string;
  smartModel: string;
  dailyCapPerFeature: number;
  /** 0 = no per-minute ceiling set. */
  maxRpm: number;
  timeoutFastMs: number;
  timeoutSmartMs: number;
}

export interface AiActivityData {
  rows: AiActivityRow[];
  /** True when more rows exist than were loaded (the oldest are left out). */
  truncated: boolean;
  settings: AiActivitySettings;
}

const ACTIVITY_DAYS = 30;
const ACTIVITY_LIMIT = 1000;

/** Admin-only: every AI call of the last 30 days (chat, briefings, agent, digests, notes), newest first. */
export async function listAiActivity(now: Date = new Date()): Promise<AiActivityData> {
  const admin = createAdminClient();
  const since = new Date(istDayStart(now).getTime() - (ACTIVITY_DAYS - 1) * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("ai_logs")
    .select(
      "id, created_at, feature, action, status, model, latency_ms, input_tokens, output_tokens, prompt, response, lead_id, leads:lead_id ( name, ref )",
    )
    .not("action", "in", "(reply_sent_unedited,reply_sent_edited)")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(ACTIVITY_LIMIT + 1);
  if (error) throw new AppError("INTERNAL_ERROR", 500, `Failed to load AI activity: ${error.message}`);

  const all = (data ?? []) as any[];
  const rows: AiActivityRow[] = all.slice(0, ACTIVITY_LIMIT).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    feature: row.feature ?? "unknown",
    action: row.action ?? "",
    status: (row.status ?? "ok") as AiActivityRow["status"],
    model: row.model ?? null,
    latencyMs: row.latency_ms ?? null,
    inputTokens: row.input_tokens ?? null,
    outputTokens: row.output_tokens ?? null,
    prompt: row.prompt ?? "",
    response: row.response ?? "",
    leadId: row.lead_id ?? null,
    leadRef: row.leads?.ref ?? null,
    customerName: row.leads?.name ?? null,
  }));

  const provider = env.AI_PROVIDER as AiProvider;
  const overrides = { fast: env.AI_MODEL_FAST, smart: env.AI_MODEL_SMART };
  return {
    rows,
    truncated: all.length > ACTIVITY_LIMIT,
    settings: {
      enabled: aiEnabled(),
      provider,
      fastModel: pickModelId(provider, "fast", overrides),
      smartModel: pickModelId(provider, "smart", overrides),
      dailyCapPerFeature: env.AI_DAILY_CALL_CAP,
      maxRpm: env.AI_MAX_RPM,
      timeoutFastMs: env.AI_TIMEOUT_FAST_MS,
      timeoutSmartMs: env.AI_TIMEOUT_SMART_MS,
    },
  };
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
