import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Accent } from "@/components/ui/accent";

describe("Accent Component (English only)", () => {
  it("renders Instrument Serif italic with the accent tone", () => {
    const html = renderToStaticMarkup(React.createElement(Accent, { tone: "accent" }, "confidence"));

    expect(html).toContain("font-serif");
    expect(html).toContain("italic");
    expect(html).not.toContain("font-devanagari");
    expect(html).toContain("text-accent-ink");
    expect(html).toContain("confidence");
  });

  it("supports the mute tone", () => {
    const html = renderToStaticMarkup(React.createElement(Accent, { tone: "mute" }, "precision"));

    expect(html).toContain("font-serif");
    expect(html).toContain("text-ink-mute");
    expect(html).toContain("precision");
  });
});
