import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { aiEnabled } from "@/server/ai/provider";
import { hashInput, logAiCall } from "@/server/ai/log";
import { generateLeadCopilot, type GenerateLeadCopilotOptions } from "@/server/ai/lead-copilot";
import { leadFingerprint, type LeadAiChatLine, type LeadAiEvent, type LeadAiInput } from "@/server/ai/lead-context";
import { findConversationForLead, listMessages } from "@/server/repositories/chats";
import { getLeadAiMeta, listLeadEvents, type LeadEventView } from "@/server/repositories/leads";
import { listSavedVehicles } from "@/server/repositories/saved";
import { listShowrooms } from "@/server/repositories/showrooms";
import type { Database, Json } from "@/types/database.types";
import type { Lead } from "@/types/domain";

type LeadAiPatch = Pick<
  Database["public"]["Tables"]["leads"]["Update"],
  "ai_summary" | "ai_draft" | "ai_profile" | "ai_input_hash" | "ai_generated_at"
>;

/** An AI summary is not rewritten more often than this unless a consultant presses Refresh. */
const REGENERATE_AFTER_MS = 10 * 60 * 1000;
/** Manual Refresh is allowed this often, so a stuck button cannot burn the daily call cap. */
const MANUAL_REFRESH_MIN_MS = 30 * 1000;

const NOISE_EVENTS = new Set(["ai_draft_generated"]);

const firstWord = (value: string | null | undefined) => (value ?? "").trim().split(/\s+/)[0] ?? "";

function eventNote(event: LeadEventView): string | null {
  const p = event.payload ?? {};
  if (typeof p.note === "string" && p.note.trim()) return p.note;
  if (event.type === "status_changed" && p.to) return `${String(p.from ?? "?")} to ${String(p.to)}`;
  return null;
}

/** Gathers the facts a lead summary is built from. First name only: no phone, email or registration number. */
export async function loadLeadAiInput(lead: Lead, knownEvents?: LeadEventView[]): Promise<LeadAiInput> {
  const admin = createAdminClient() as any;

  const [events, showrooms, conversation, saved, bookings] = await Promise.all([
    knownEvents ? Promise.resolve(knownEvents) : listLeadEvents(lead.id).catch(() => [] as LeadEventView[]),
    listShowrooms().catch(() => []),
    findConversationForLead(lead.id).catch(() => null),
    lead.user_id ? listSavedVehicles(lead.user_id).catch(() => []) : Promise.resolve([]),
    admin
      .from("bookings")
      .select("kind, status, slots:slot_id ( starts_at )")
      .eq("lead_id", lead.id)
      .limit(5)
      .then((r: any) => r.data ?? [])
      .catch(() => []),
  ]);

  let chat: LeadAiChatLine[] = [];
  if (conversation) {
    const messages = await listMessages(conversation.id).catch(() => []);
    chat = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "user" ? "buyer" : m.role, text: m.content }) as LeadAiChatLine);
  }

  const aiEvents: LeadAiEvent[] = [...events]
    .filter((e) => !NOISE_EVENTS.has(e.type))
    .reverse()
    .map((e) => ({ type: e.type, note: eventNote(e), at: e.created_at }));

  return {
    ref: lead.ref ?? null,
    source: lead.source,
    status: lead.status,
    firstName: firstWord(lead.name) || "there",
    modelName: lead.model_name || null,
    isUsed: Boolean(lead.used_car_id),
    message: lead.message ?? null,
    showroomName: showrooms.find((s) => s.id === lead.showroom_id)?.name ?? null,
    consultantFirstName: firstWord(lead.assigned_consultant_name) || null,
    firstContacted: Boolean(lead.first_contacted_at),
    createdAt: lead.created_at,
    events: aiEvents,
    chat,
    saved: saved.map((s) => ("name" in s.item ? s.item.name : s.item.model_name)).filter(Boolean),
    bookings: bookings.map((b: any) => ({
      kind: b.kind,
      status: b.status,
      when: b.slots?.starts_at ?? null,
    })),
  };
}

export interface EnsureCopilotOptions {
  /** Regenerate even if nothing changed (the Refresh button). Still rate-limited per lead. */
  force?: boolean;
  actorId?: string | null;
  events?: LeadEventView[];
  /** Test seam. */
  generateOptions?: GenerateLeadCopilotOptions;
}

/**
 * Makes sure a lead carries an up-to-date AI summary, buyer profile and first-reply draft.
 *
 * - Summary and profile are rewritten when the facts changed (new message, chat, event, booking, stage), at most
 *   every 10 minutes, or on Refresh. A hash of the facts decides, so opening a lead repeatedly costs nothing.
 * - The draft is only replaced while nobody has replied yet; after the first contact the existing draft stays.
 * - If the model is off, capped, slow or blocked by a guard, the rule-based version fills empty fields only, so a
 *   previously written AI summary is never replaced by a weaker rule-based one.
 * - Never throws: if saving fails the generated copy is still returned so the desk keeps working.
 */
export async function ensureLeadCopilot(rawLead: Lead, options: EnsureCopilotOptions = {}): Promise<Lead> {
  // The AI profile columns are read separately (see getLeadAiMeta) so the app survives a missing migration.
  const lead: Lead = { ...rawLead, ...(await getLeadAiMeta(rawLead.id).catch(() => null)) };
  const complete = Boolean(lead.ai_summary && lead.ai_draft);
  const generatedAt = lead.ai_generated_at ? new Date(lead.ai_generated_at).getTime() : 0;
  const sinceLast = Date.now() - generatedAt;

  if (complete && !options.force && !aiEnabled()) return lead;
  if (complete && !options.force && sinceLast < REGENERATE_AFTER_MS) return lead;
  if (complete && options.force && sinceLast < MANUAL_REFRESH_MIN_MS) return lead;

  try {
    const input = await loadLeadAiInput(lead, options.events);
    // Nothing the summary depends on has changed since the last AI summary: skip the model call entirely.
    if (complete && !options.force && lead.ai_input_hash === hashInput(leadFingerprint(input))) return lead;

    const outcome = await generateLeadCopilot(input, {
      userId: options.actorId,
      leadId: lead.id,
      ...options.generateOptions,
    });

    const { result } = outcome;
    const fromModel = outcome.source === "ai";
    const patch: LeadAiPatch = {};

    if (fromModel) {
      patch.ai_summary = result.summary;
      patch.ai_profile = result.profile as unknown as Json;
      patch.ai_input_hash = outcome.inputHash;
      patch.ai_generated_at = new Date().toISOString();
      if (!lead.ai_draft || !lead.first_contacted_at) patch.ai_draft = result.draftReply;
    } else {
      if (!lead.ai_summary) patch.ai_summary = result.summary;
      if (!lead.ai_draft) patch.ai_draft = result.draftReply;
      if (!lead.ai_profile) patch.ai_profile = result.profile as unknown as Json;
    }

    if (Object.keys(patch).length === 0) return lead;

    const admin = createAdminClient();
    let { error } = await admin.from("leads").update(patch).eq("id", lead.id);
    if (error) {
      // Most likely migration 0036 is not applied yet: still save the summary and draft, drop the profile fields.
      console.warn(`[copilot] Saving AI profile failed for lead ${lead.id} (${error.message}); saving summary and draft only`);
      const { ai_profile: _p, ai_input_hash: _h, ai_generated_at: _g, ...basic } = patch;
      ({ error } = Object.keys(basic).length
        ? await admin.from("leads").update(basic).eq("id", lead.id)
        : { error: null });
    }

    // The runner audits every model call itself. When it never reached the model (AI off or over its cap) the
    // rule-based draft was still produced, so keep the admin "drafts generated" count honest.
    if (!error && !outcome.modelFallbackLogged && ("ai_summary" in patch || "ai_draft" in patch)) {
      await logAiCall({
        feature: "lead_summary",
        action: "copilot_generated",
        status: "fallback",
        leadId: lead.id,
        userId: options.actorId,
        prompt: `Lead ${lead.ref ?? lead.id} · ${lead.model_name || "general enquiry"} · source ${lead.source} (rule-based)`,
        response: result.draftReply,
      });
    }

    return { ...lead, ...patch } as Lead;
  } catch (err: any) {
    console.warn(`[copilot] Skipped for lead ${lead.id}: ${err?.message}`);
    return lead;
  }
}
