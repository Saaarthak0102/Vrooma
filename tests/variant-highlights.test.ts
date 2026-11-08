import { describe, it, expect } from "vitest";
import { getVariantHighlights } from "../src/components/cars/VariantHighlights";
import { Model } from "../src/types/domain";

describe("getVariantHighlights", () => {
  const modelS: Model = {
    id: "model-s",
    slug: "model-s",
    name: "Model S",
    body_type: "hatchback",
    tagline: "Smart, agile city hatchback",
    hero_image: "/images/cars/s.svg",
    gallery: [],
    is_active: true,
    variants: [
      {
        id: "var-s-lx-mt",
        model_id: "model-s",
        name: "LX Manual",
        fuel: "petrol",
        transmission: "manual",
        ex_showroom: 645000,
        specs: {},
        features: [],
      },
      {
        id: "var-s-zx-amt",
        model_id: "model-s",
        name: "ZX AMT",
        fuel: "cng",
        transmission: "automatic",
        ex_showroom: 795000,
        specs: {},
        features: ["Factory Fitted S-CNG Kit", "Auto Climate Control"],
      },
    ],
  };

  it("generates concise selling points for Model S LX Manual (budget, petrol, manual)", () => {
    const lxVariant = modelS.variants![0];
    const highlights = getVariantHighlights(lxVariant, modelS);

    expect(highlights.length).toBeGreaterThanOrEqual(2);
    expect(highlights.length).toBeLessThanOrEqual(3);
    expect(highlights).toContain("Everyday city commuting");
    expect(highlights).toContain("Budget-conscious buyers");
    expect(highlights).toContain("Drivers who prefer manual control");
  });

  it("generates concise selling points for Model S ZX AMT (cng, automatic)", () => {
    const zxVariant = modelS.variants![1];
    const highlights = getVariantHighlights(zxVariant, modelS);

    expect(highlights.length).toBeGreaterThanOrEqual(2);
    expect(highlights.length).toBeLessThanOrEqual(3);
    expect(highlights).toContain("Ultra-low running costs with CNG");
    expect(highlights).toContain("Suitable for stop-and-go traffic");
  });

  it("keeps each point short (under 10 words)", () => {
    const lxVariant = modelS.variants![0];
    const highlights = getVariantHighlights(lxVariant, modelS);

    highlights.forEach((point) => {
      const wordCount = point.trim().split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(8);
    });
  });
});

