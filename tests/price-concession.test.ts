import { describe, expect, it } from "vitest";

import { findForbiddenDiscountWord, findPriceConcessionPhrase } from "@/lib/validation/discount";
import { guardAiText } from "@/server/ai/guard";

describe("price-cut promises in other words", () => {
  it.each([
    "I can reduce the price for you",
    "We can lower the price if you visit today",
    "I can cut the price a little",
    "Let me bring the price down",
    "We can bring down the price",
    "I can offer you a better price",
    "We can give you the best price",
    "A special price just for you",
    "The lowest price in Lucknow",
    "The price is negotiable",
    "We can negotiate on the price",
    "Get a cheaper rate than elsewhere",
    "Rs 40,000 less than the quoted price",
    "We will match any competitor's price",
    "d i s c o u n t",
    "dis-count available",
  ])("is caught: %s", (text) => {
    expect(findPriceConcessionPhrase(text), text).not.toBeNull();
    // and so the AI guard rejects it
    expect(guardAiText(text, {}).ok, text).toBe(false);
  });

  it.each([
    "The ex-showroom price of the Model H ZX is ₹12,45,000.",
    "A longer tenure lowers your EMI.",
    "At the assumed rate of 9.5%, the EMI is about ₹21,002 a month.",
    "The full on-road price breakup is on the model page.",
    "Please see the offers page for current offers.",
    "The final on-road price is shown after a quick sign-in.",
    "A consultant will go through pricing with you.",
    "Prices are set from our official price tables.",
    "Your car is due for service on 12 Dec.",
    "The price band rests on 6 past sales.",
    "Book a test drive for Saturday at 11:00 am.",
    "Contact our dealer desk in Hazratganj.",
  ])("leaves ordinary wording alone: %s", (text) => {
    expect(findPriceConcessionPhrase(text), text).toBeNull();
    expect(guardAiText(text, {}).ok, text).toBe(true);
  });

  it("does not change what staff are blocked from typing (that check stays the original one)", () => {
    expect(findForbiddenDiscountWord("I can reduce the price for you")).toBeNull();
    expect(findForbiddenDiscountWord("We can offer a discount")).not.toBeNull();
  });
});
