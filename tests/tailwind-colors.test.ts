import { describe, expect, it } from "vitest";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

import config from "../tailwind.config";

async function compile(classes: string): Promise<string> {
  const result = await postcss([tailwindcss({ ...config, content: [{ raw: classes, extension: "html" }] })]).process("@tailwind utilities;", {
    from: undefined,
  });
  return result.css;
}

describe("theme colours that live in CSS variables", () => {
  it("generate CSS for opacity shades (they used to generate nothing and the tint silently vanished)", async () => {
    const css = await compile("bg-accent/10 border-danger/30 text-ink/60 bg-accent-soft/40 from-warn/20");
    for (const cls of ["bg-accent\\/10", "border-danger\\/30", "text-ink\\/60", "bg-accent-soft\\/40", "from-warn\\/20"]) {
      expect(css, cls).toContain(`.${cls}`);
    }
    expect(css).toContain("var(--accent) calc(0.1 * 100%)");
    expect(css).toContain("var(--danger) calc(0.3 * 100%)");
  });

  it("keeps a plain colour class at full strength", async () => {
    const css = await compile("bg-accent text-ink-soft border-border");
    expect(css).toContain("var(--accent) calc(var(--tw-bg-opacity, 1) * 100%)");
    expect(css).toContain("var(--ink-soft) calc(var(--tw-text-opacity, 1) * 100%)");
    expect(css).toContain("var(--border) calc(var(--tw-border-opacity, 1) * 100%)");
  });

  it("works with hover and focus variants too", async () => {
    const css = await compile("hover:bg-ink/5 focus-visible:ring-accent/40");
    expect(css).toContain("hover\\:bg-ink\\/5");
    expect(css).toContain("var(--ink) calc(0.05 * 100%)");
  });
});
