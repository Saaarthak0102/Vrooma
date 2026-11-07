import { describe, expect, it } from "vitest";
import { buildBotReply, CLOSING_QUESTION, detectIntent } from "@/server/ai/support-bot";
import { buildChatContext } from "@/server/ai/chat-context";
import { findForbiddenDiscountWord } from "@/lib/validation/discount";
import { CONSOLE_LINKS, linksForRole } from "@/lib/console-nav";

describe("support bot", () => {
  it("detects intents", () => {
    expect(detectIntent("what is the on-road price?")).toBe("price");
    expect(detectIntent("I want to book a test drive")).toBe("test_drive");
    expect(detectIntent("calculate my EMI")).toBe("emi");
    expect(detectIntent("can I talk to a human")).toBe("handoff");
    expect(detectIntent("thanks, that's all")).toBe("solved");
    expect(detectIntent("hello")).toBe("greeting");
  });

  it("ends an answer with the solved-or-connect question and both choices", () => {
    const r = buildBotReply("what is the on-road price?");
    expect(r.askedClosing).toBe(true);
    expect(r.reply).toContain(CLOSING_QUESTION);
    expect(r.quickReplies.map((q) => q.action)).toEqual(["solved", "connect"]);
  });

  it("never emits a discount word, whatever the buyer asks", () => {
    for (const q of ["give me a discount", "any price cut on Model H?", "waiver of insurance?", "what is the price", "used cars", "service"]) {
      expect(findForbiddenDiscountWord(buildBotReply(q).reply)).toBeNull();
    }
  });
});

describe("chat AI context", () => {
  it("summarises topics, keeps the last questions and a discount-free suggested reply", () => {
    const ctx = buildChatContext({
      buyerMessages: ["what is the on-road price?", "can you do EMI for 5 years", "I want a discount"],
      buyerName: "Asha Verma",
      signedIn: false,
      totalMessages: 9,
    });
    expect(ctx.intents).toEqual(expect.arrayContaining(["price", "emi"]));
    expect(ctx.summary).toContain("Asha Verma");
    expect(ctx.lastQuestion).toBe("I want a discount");
    expect(ctx.buyerQuestions).toHaveLength(3);
    expect(findForbiddenDiscountWord(ctx.suggestedReply)).toBeNull();
    expect(ctx.suggestedReply).toContain("Asha");
  });
});

describe("console nav", () => {
  it("gives every staff role the Chats screen", () => {
    for (const role of ["consultant", "manager", "admin"] as const) {
      expect(linksForRole(role).some((l) => l.href === "/staff/chats")).toBe(true);
    }
    expect(CONSOLE_LINKS.find((l) => l.href === "/staff/chats")?.roles).not.toContain("buyer");
  });
});
