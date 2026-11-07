import { findForbiddenDiscountWord } from "@/lib/validation/discount";
import { detectIntent, type SupportIntent } from "@/server/ai/support-bot";

/**
 * What the AI hands to the consultant when a chat is escalated. Saved on chat_conversations.ai_context
 * and shown in the /staff/chats side panel.
 */
export interface ChatAiContext {
  summary: string;
  intents: SupportIntent[];
  /** The buyer's own words, most recent last (max 5). */
  buyerQuestions: string[];
  lastQuestion: string | null;
  suggestedReply: string;
  buyerName: string | null;
  signedIn: boolean;
  messageCount: number;
  builtAt: string;
}

const INTENT_LABEL: Partial<Record<SupportIntent, string>> = {
  price: "on-road price",
  emi: "EMI and finance",
  test_drive: "a test drive",
  used_cars: "certified used cars",
  service: "a service booking",
  trade_in: "a trade-in",
  offers: "current offers",
};

const SAFE_SUGGESTED_REPLY =
  "Hi, this is your Vrooma consultant. I have read your chat and I'm happy to help. What would you like to know first?";

export function buildChatContext(input: {
  buyerMessages: string[];
  buyerName: string | null;
  signedIn: boolean;
  totalMessages: number;
  now?: Date;
}): ChatAiContext {
  const questions = input.buyerMessages.map((m) => m.trim()).filter(Boolean);
  const intents = [...new Set(questions.map(detectIntent).filter((i) => i !== "other" && i !== "greeting" && i !== "handoff" && i !== "solved"))];
  const labels = intents.map((i) => INTENT_LABEL[i]).filter(Boolean) as string[];

  const name = input.buyerName?.trim() || null;
  const topic = labels.length ? labels.join(", ") : "general help";
  const summary = `${name ?? "The buyer"} asked about ${topic} and asked to speak to a consultant after ${questions.length} message${questions.length === 1 ? "" : "s"} with the assistant.`;

  const first = name ? name.split(/\s+/)[0] : null;
  let suggested = `Hi${first ? ` ${first}` : ""}, this is your Vrooma consultant. I saw you were asking about ${topic}. I can help with that right now. What would you like to know first?`;
  // Same rule as the lead copilot: a draft never carries a discount word.
  if (findForbiddenDiscountWord(suggested)) suggested = SAFE_SUGGESTED_REPLY;

  return {
    summary,
    intents,
    buyerQuestions: questions.slice(-5),
    lastQuestion: questions.length ? questions[questions.length - 1] : null,
    suggestedReply: suggested,
    buyerName: name,
    signedIn: input.signedIn,
    messageCount: input.totalMessages,
    builtAt: (input.now ?? new Date()).toISOString(),
  };
}
