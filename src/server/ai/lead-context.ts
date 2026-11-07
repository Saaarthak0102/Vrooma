import { findForbiddenDiscountWord } from "@/lib/validation/discount";
import { guardAiText, sanitizeUserText, wrapUntrusted } from "@/server/ai/guard";

/**
 * Everything the lead copilot may see about one lead, as plain data. Built by the persistence service from the
 * database, consumed by the prompt builder (LLM path) and by ruleBasedCopilot (fallback path), so both paths work
 * from exactly the same facts.
 *
 * Privacy: first name only. No phone, email or registration number ever goes in here.
 */
export interface LeadAiEvent {
  type: string;
  /** Free-text note on the event, if any (staff-typed). */
  note: string | null;
  at: string;
}

export interface LeadAiChatLine {
  role: "buyer" | "assistant" | "consultant";
  text: string;
}

export interface LeadAiInput {
  ref: string | null;
  source: string;
  status: string;
  firstName: string;
  modelName: string | null;
  isUsed: boolean;
  message: string | null;
  showroomName: string | null;
  consultantFirstName: string | null;
  firstContacted: boolean;
  createdAt: string;
  /** Oldest first. */
  events: LeadAiEvent[];
  /** Oldest first. */
  chat: LeadAiChatLine[];
  saved: string[];
  bookings: { kind: string; status: string; when: string | null }[];
}

export type LeadUrgency = "high" | "medium" | "low";

export interface LeadAiQualification {
  budget: string | null;
  timeline: string | null;
  fuel: string | null;
  finance: boolean | null;
  trade_in: boolean | null;
}

/** Stored on leads.ai_profile (staff only). */
export interface LeadAiProfile {
  interest: string;
  urgency: LeadUrgency;
  qualification: LeadAiQualification;
  suggestedAction: string;
  /** "ai" = written by the model, "rules" = the rule-based fallback. */
  origin: "ai" | "rules";
}

export interface CopilotGenerationResult {
  summary: string;
  draftReply: string;
  suggestedAction: string;
  profile: LeadAiProfile;
}

// --- Fingerprint (decides when a summary is stale) ---------------------------------------------------------------

/** The facts a summary depends on. Excludes anything that changes with the clock. */
export function leadFingerprint(input: LeadAiInput): unknown {
  return {
    s: input.source,
    st: input.status,
    m: input.modelName,
    msg: input.message,
    fc: input.firstContacted,
    ev: input.events.map((e) => [e.type, e.note]),
    ch: input.chat.map((c) => [c.role, c.text]),
    sv: input.saved,
    bk: input.bookings.map((b) => [b.kind, b.status, b.when]),
  };
}

// --- Prompt -----------------------------------------------------------------------------------------------------

function ageText(createdAt: string, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(createdAt).getTime()) / 60_000));
  if (minutes < 90) return `${minutes} minutes old`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hours old`;
  return `${Math.round(hours / 24)} days old`;
}

export function buildLeadPrompt(input: LeadAiInput, now: Date = new Date()): string {
  const header = [
    `Lead ${input.ref ?? ""} · source: ${input.source} · stage: ${input.status} · ${ageText(input.createdAt, now)}`,
    `Buyer first name: ${input.firstName}`,
    `Interested in: ${input.modelName ?? "not specified"} (${input.isUsed ? "certified used car" : "new car"})`,
    `Showroom: ${input.showroomName ?? "not set"}. Consultant: ${input.consultantFirstName ?? "not yet assigned"}.`,
    `Buyer already contacted by a consultant: ${input.firstContacted ? "yes" : "no"}`,
  ].join("\n");

  const parts = [header];
  if (input.message) parts.push(`Enquiry message:\n${wrapUntrusted(input.message, "enquiry_message")}`);
  if (input.chat.length) {
    const transcript = input.chat
      .slice(-12)
      .map((c) => `${c.role}: ${sanitizeUserText(c.text, 300)}`)
      .join("\n");
    parts.push(`Chat with the website assistant:\n${wrapUntrusted(transcript, "chat_transcript")}`);
  }
  if (input.saved.length) parts.push(`Cars the buyer saved: ${input.saved.slice(0, 5).join(", ")}`);
  if (input.bookings.length) {
    parts.push(
      `Bookings: ${input.bookings
        .map((b) => `${b.kind} ${b.status}${b.when ? ` (${b.when})` : ""}`)
        .join("; ")}`,
    );
  }
  if (input.events.length) {
    const timeline = input.events
      .slice(-15)
      .map((e) => `- ${e.type}${e.note ? `: ${sanitizeUserText(e.note, 200)}` : ""}`)
      .join("\n");
    parts.push(`Activity so far (oldest first):\n${wrapUntrusted(timeline, "activity")}`);
  }
  return parts.join("\n\n");
}

// --- Rule-based extraction and copilot (the fallback path) -----------------------------------------------------

const BUDGET_RE = /(?:₹|rs\.?\s*|inr\s*)?(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr)\b/i;
const FUEL_RE = /\b(petrol|diesel|cng|electric|ev|hybrid)\b/i;
const FINANCE_RE = /\b(emi|loan|finance|financing|down\s?payment)\b/i;
const TRADE_IN_RE = /\b(exchange|trade[- ]?in|old car|sell my)\b/i;
const TIMELINE_RE =
  /\b(today|tomorrow|this week|this weekend|next week|next month|asap|immediately|urgent|right now|within \d+ (?:days?|weeks?))\b/i;
const URGENT_RE = /\b(today|tomorrow|this week|this weekend|asap|immediately|urgent|right now)\b/i;

/** Cheap keyword extraction from the buyer's own words. Used by the fallback and as a sanity reference in tests. */
export function extractQualification(text: string): LeadAiQualification {
  const budget = BUDGET_RE.exec(text);
  const fuel = FUEL_RE.exec(text);
  const timeline = TIMELINE_RE.exec(text);
  const unit = budget?.[2]?.toLowerCase() ?? "";
  return {
    budget: budget ? `₹${budget[1]} ${unit.startsWith("cr") ? "crore" : "lakh"}` : null,
    timeline: timeline ? timeline[1].toLowerCase() : null,
    fuel: fuel ? fuel[1].toLowerCase() : null,
    finance: FINANCE_RE.test(text) ? true : null,
    trade_in: TRADE_IN_RE.test(text) ? true : null,
  };
}

function buyerText(input: LeadAiInput): string {
  return [input.message ?? "", ...input.chat.filter((c) => c.role === "buyer").map((c) => c.text)].join(" \n ");
}

const SOURCE_LABEL: Record<string, string> = {
  web: "the website",
  portal: "a car portal",
  social: "social media",
  walkin: "a walk-in",
  chat: "the website chat",
  trade_in: "the trade-in form",
};

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

function safeDraft(first: string, consultant: string | null) {
  return `Namaste ${first}, thank you for contacting Vrooma. I'm ${consultant ?? "your Vrooma consultant"} and I will share the official on-road price breakup and the available test drive slots with you shortly.`;
}

export function ruleBasedCopilot(input: LeadAiInput): CopilotGenerationResult {
  const text = buyerText(input);
  const qualification = extractQualification(text);
  const asksForDiscount = findForbiddenDiscountWord(text) !== null;
  const hasBooking = input.bookings.some((b) => b.status === "confirmed");

  let urgency: LeadUrgency = "medium";
  if (input.status === "test_drive_booked" || hasBooking || URGENT_RE.test(text)) urgency = "high";
  else if (!input.message && input.chat.length === 0 && !qualification.budget && !qualification.timeline) urgency = "low";

  const where = SOURCE_LABEL[input.source] ?? input.source;
  const kind = input.isUsed ? "Certified used car" : "New car";
  const facts: string[] = [];
  if (qualification.budget) facts.push(`budget about ${qualification.budget}`);
  if (qualification.timeline) facts.push(`wants to move ${qualification.timeline}`);
  if (qualification.fuel) facts.push(`prefers ${qualification.fuel}`);
  if (qualification.finance) facts.push("interested in finance");
  if (qualification.trade_in) facts.push("has a car to trade in");
  if (asksForDiscount) facts.push("asked about a discount");

  const sentences = [
    `${kind} enquiry${input.modelName ? ` for ${input.modelName}` : ""} from ${where}${input.showroomName ? ` (${input.showroomName})` : ""}.`,
  ];
  if (input.message) sentences.push(`Buyer wrote: "${truncate(input.message.replace(/\s+/g, " "), 140)}".`);
  if (facts.length) sentences.push(`${facts[0][0].toUpperCase()}${facts.join(", ").slice(1)}.`);
  const buyerChatCount = input.chat.filter((c) => c.role === "buyer").length;
  if (buyerChatCount) sentences.push(`Chatted with the assistant (${buyerChatCount} message${buyerChatCount === 1 ? "" : "s"}) first.`);
  if (input.saved.length) sentences.push(`Saved: ${input.saved.slice(0, 3).join(", ")}.`);
  if (hasBooking) sentences.push("Has a confirmed booking.");
  const summary = truncate(sentences.join(" "), 450);

  let suggestedAction: string;
  if (asksForDiscount) {
    suggestedAction =
      "Buyer is price-sensitive: quote no reduction, invite them to the showroom and bring in the manager if they press.";
  } else if (input.status === "test_drive_booked" || hasBooking) {
    suggestedAction = "Confirm the booked slot and have the car ready.";
  } else if (input.status === "negotiating") {
    suggestedAction = "Follow up on the open question and offer a showroom visit.";
  } else if (input.isUsed) {
    suggestedAction = "Lock a showroom viewing slot within 2 hours.";
  } else {
    suggestedAction = "Call within 5 minutes, then offer a test-drive slot.";
  }

  const first = input.firstName || "there";
  const me = input.consultantFirstName;
  const at = input.showroomName;
  let draftReply: string;
  if (asksForDiscount) {
    draftReply = `Namaste ${first}, thank you for contacting Vrooma. I'm ${me ?? "your Vrooma consultant"}${at ? ` at ${at}` : ""}. I'd be glad to walk you through the official on-road price breakup in person. Which day suits you for a showroom visit?`;
  } else if (input.isUsed) {
    draftReply = `Namaste ${first}, thank you for your interest in ${input.modelName ? `the ${input.modelName}` : "our certified used cars"}. It has passed our 140-point inspection. I'm ${me ?? "your Vrooma consultant"}; may I reserve a viewing slot for you${at ? ` at ${at}` : ""} today?`;
  } else {
    draftReply = `Namaste ${first}, thank you for contacting Vrooma${input.modelName ? ` about the ${input.modelName}` : ""}. I'm ${me ?? "your Vrooma consultant"}${at ? ` at ${at}` : ""}. I can share the official on-road price breakup and book a test drive. Would a showroom visit or a home test drive suit you better?`;
  }
  if (!guardAiText(draftReply, { groundingSources: [] }).ok) draftReply = safeDraft(first, me);

  return {
    summary,
    draftReply,
    suggestedAction,
    profile: {
      interest: input.modelName ?? (input.isUsed ? "Certified used car" : "General enquiry"),
      urgency,
      qualification,
      suggestedAction,
      origin: "rules",
    },
  };
}
