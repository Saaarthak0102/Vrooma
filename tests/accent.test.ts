import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Accent } from "@/components/ui/accent";

// Mock next-intl useLocale
vi.mock("next-intl", () => ({
  useLocale: vi.fn(),
}));

import { useLocale } from "next-intl";

describe("Accent Component", () => {
  it("renders Instrument Serif italic in English ('en')", () => {
    vi.mocked(useLocale).mockReturnValue("en");

    const html = renderToStaticMarkup(
      React.createElement(Accent, { tone: "accent" }, "confidence")
    );

    expect(html).toContain("font-serif");
    expect(html).toContain("italic");
    expect(html).not.toContain("font-devanagari");
    expect(html).toContain("text-accent-ink");
    expect(html).toContain("confidence");
  });

  it("renders non-italic Devanagari font in Hindi ('hi')", () => {
    vi.mocked(useLocale).mockReturnValue("hi");

    const html = renderToStaticMarkup(
      React.createElement(Accent, { tone: "mute" }, "विश्वास")
    );

    expect(html).toContain("font-devanagari");
    expect(html).toContain("not-italic");
    expect(html).not.toContain("font-serif italic");
    expect(html).toContain("text-ink-mute");
    expect(html).toContain("विश्वास");
  });
});
