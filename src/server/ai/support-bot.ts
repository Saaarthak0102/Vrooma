import { findForbiddenDiscountWord } from "@/lib/validation/discount";

/**
 * Support chat bot (rule based, like lead-copilot.ts). Pure functions only, so it is easy to test and a live
 * model can replace `answerFor` later without touching the routes.
 *
 * Rules: never quote prices or discounts (on-road prices come only from the admin price table, so the bot
 * points to the model page), and every answer ends with the "solved or connect?" question.
 */

export type SupportIntent =
  | "price"
  | "emi"
  | "test_drive"
  | "used_cars"
  | "service"
  | "trade_in"
  | "offers"
  | "handoff"
  | "solved"
  | "greeting"
  | "other";

export interface QuickReply {
  label: string;
  /** What the widget sends back: a chat action, or plain text. */
  action?: "solved" | "connect";
  text?: string;
}

export interface BotResult {
  intent: SupportIntent;
  reply: string;
  quickReplies: QuickReply[];
  /** True when the bot ends this turn by asking whether the query is solved. */
  askedClosing: boolean;
}

export const CLOSING_QUESTION = "Is your query solved, or would you like to connect with a Vrooma consultant?";

export const CLOSING_REPLIES: QuickReply[] = [
  { label: "Yes, it's solved", action: "solved" },
  { label: "Connect me to a consultant", action: "connect" },
];

export const GREETING_REPLIES: QuickReply[] = [
  { label: "On-road price", text: "What is the on-road price breakup for a new car?" },
  { label: "Book a test drive", text: "I want to book a test drive" },
  { label: "Used cars", text: "Show me certified used cars" },
];

const SAFE_FALLBACK =
  "I can help with prices, EMI, test drives, used cars and service. For anything else, a consultant can help you directly.";

export function detectIntent(raw: string): SupportIntent {
  const t = raw.toLowerCase();
  if (/\b(human|agent|consultant|executive|representative|call me|talk to (a )?(person|someone))\b/.test(t)) return "handoff";
  if (/\b(solved|resolved|that'?s all|nothing else|no more questions|all good|thank(s| you))\b/.test(t) && !/\?/.test(t)) {
    return "solved";
  }
  if (/\b(trade[\s-]?in|sell my car|exchange)\b/.test(t)) return "trade_in";
  if (/\b(emi|loan|finance|down\s?payment|instal+ment)\b/.test(t)) return "emi";
  if (/\b(test[\s-]?drive|demo|drive)\b/.test(t)) return "test_drive";
  if (/\b(service|servicing|workshop|repair|maintenance)\b/.test(t)) return "service";
  if (/\b(used|pre[\s-]?owned|second[\s-]?hand|certified)\b/.test(t)) return "used_cars";
  if (/\b(offer|festive|deal|promotion)\b/.test(t)) return "offers";
  if (/\b(price|on[\s-]?road|ex[\s-]?showroom|cost|rto|insurance|how much)\b/.test(t)) return "price";
  if (/^(hi|hello|hey|namaste|good (morning|afternoon|evening))\b/.test(t.trim())) return "greeting";
  return "other";
}

const ANSWERS: Record<Exclude<SupportIntent, "handoff" | "solved" | "greeting" | "other">, string> = {
  price:
    "Every model page shows the ex-showroom price, and once you sign in you can see the full on-road breakup for your city: road tax, registration, insurance, handling and TCS, with a validity date. Prices come from our live price table and may change.",
  emi:
    "Use the EMI calculator to set the loan amount, tenure (1-7 years) and interest rate and see your monthly EMI, total interest and the full repayment schedule. You can start it from any variant page.",
  test_drive:
    "You can book a test drive in about a minute: choose a showroom, the demo car and a free slot. No call needed, and you get an instant confirmation.",
  used_cars:
    "Our certified used cars come with a 140-point inspection report, year, owners and kilometres, with registration numbers masked. You can filter by price, fuel, year and kilometres on the Used Cars page.",
  service:
    "You can book a service by workshop and time slot in about a minute. Choose a workshop, pick scheduled maintenance or a repair, and enter your registration number.",
  trade_in:
    "The trade-in form takes your car's make, model, year, kilometres and condition, and a used-car manager then confirms the final value. The estimate you see first is only a guide.",
  offers: "Current offers are listed on the Offers page with their validity dates. A consultant can explain which apply to the model you like.",
};

/** Message to shoppers about the (single) topic a turn was about, used for the consultant summary. */
export function answerFor(intent: SupportIntent): string {
  if (intent === "handoff" || intent === "solved") return "";
  if (intent === "greeting") {
    return "Welcome to Vrooma. I can help with prices, EMI, test drives, used cars and service.";
  }
  if (intent === "other") return SAFE_FALLBACK;
  return ANSWERS[intent];
}

/** Bot turn for a normal buyer message. Never contains a discount word; falls back if one slips in. */
export function buildBotReply(message: string): BotResult {
  const intent = detectIntent(message);

  if (intent === "solved") {
    return {
      intent,
      reply: "Glad I could help. Thank you for chatting with Vrooma. You can start a new chat any time.",
      quickReplies: [],
      askedClosing: false,
    };
  }

  if (intent === "handoff") {
    return {
      intent,
      reply: "Sure, I'll connect you with a Vrooma consultant.",
      quickReplies: [],
      askedClosing: false,
    };
  }

  let answer = answerFor(intent);
  if (findForbiddenDiscountWord(answer)) answer = SAFE_FALLBACK;

  if (intent === "greeting") {
    return { intent, reply: answer, quickReplies: GREETING_REPLIES, askedClosing: false };
  }

  return {
    intent,
    reply: `${answer}\n\n${CLOSING_QUESTION}`,
    quickReplies: CLOSING_REPLIES,
    askedClosing: true,
  };
}
