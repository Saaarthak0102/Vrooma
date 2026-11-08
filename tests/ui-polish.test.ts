import fs from "node:fs";
import { describe, expect, it } from "vitest";

import { expiryTone, serviceProgress } from "@/lib/garage";
import { timeAgo } from "@/lib/ist-format";
import { renderBody, renderEmail } from "@/server/services/email-template";

describe("expiryTone", () => {
  it("is danger once expired, warn within 30 days, ok beyond", () => {
    expect(expiryTone(-1)).toBe("danger");
    expect(expiryTone(0)).toBe("warn");
    expect(expiryTone(30)).toBe("warn");
    expect(expiryTone(31)).toBe("ok");
  });
});

describe("serviceProgress", () => {
  it("runs from 0 on the service day to 1 on the due date, and clamps outside", () => {
    expect(serviceProgress("2026-05-08", "2026-11-08", "2026-05-08")).toBe(0);
    expect(serviceProgress("2026-05-08", "2026-11-08", "2026-11-08")).toBe(1);
    const mid = serviceProgress("2026-05-08", "2026-11-08", "2026-08-08")!;
    expect(mid).toBeGreaterThan(0.45);
    expect(mid).toBeLessThan(0.55);
    expect(serviceProgress("2026-05-08", "2026-11-08", "2027-02-01")).toBe(1);
    expect(serviceProgress("2026-05-08", "2026-11-08", "2026-01-01")).toBe(0);
  });

  it("shows no bar when a date is unknown, and is full when the due date is not after the last service", () => {
    expect(serviceProgress(null, "2026-11-08", "2026-10-01")).toBeNull();
    expect(serviceProgress("2026-05-08", null, "2026-10-01")).toBeNull();
    expect(serviceProgress("2026-11-08", "2026-11-01", "2026-11-09")).toBe(1);
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  it("reads naturally", () => {
    expect(timeAgo("2026-11-08T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-11-08T11:55:00Z", now)).toBe("5 min ago");
    expect(timeAgo("2026-11-08T09:00:00Z", now)).toBe("3 h ago");
    expect(timeAgo("2026-11-06T12:00:00Z", now)).toBe("2 days ago");
    expect(timeAgo("2026-11-07T12:00:00Z", now)).toBe("1 day ago");
  });
});

describe("email body rendering", () => {
  it("turns '- ' lines into a list, keeps paragraphs, and escapes everything", () => {
    const html = renderBody("Good morning Asha.\n\nYour queue:\n- 2 new <leads>\n- 3 tasks\n\nBye");
    expect(html).toContain("<ul");
    expect(html.match(/<li/g)).toHaveLength(2);
    expect(html).toContain("2 new &lt;leads&gt;");
    expect(html).not.toContain("<leads>");
    expect(html).toContain("<div>Good morning Asha.</div>");
  });

  it("leaves bodies without bullets exactly as before (line breaks only)", () => {
    expect(renderBody("Line one\nLine two")).toBe("Line one<br>Line two");
    expect(renderEmail("booking_confirmation", "Hi\nthere").html).toContain("Hi<br>there");
  });
});

describe("markup validity and the chat close button", () => {
  it("never puts a Badge (it renders a div) inside a paragraph", () => {
    for (const file of ["src/components/staff/AiSummaryCard.tsx", "src/components/chat/ChatWidget.tsx"]) {
      const src = fs.readFileSync(file, "utf8");
      expect(/<p\b[^>]*>\s*<Badge/.test(src), file).toBe(false);
    }
  });

  it("keeps a clearly visible, labelled close button on the chat header", () => {
    const src = fs.readFileSync("src/components/chat/ChatWidget.tsx", "utf8");
    const at = src.indexOf('aria-label="Close Chat"');
    expect(at).toBeGreaterThan(-1);
    const button = src.slice(src.lastIndexOf("<Button", at), at);
    expect(button).toContain("setIsOpen(false)");
    expect(button).toContain("text-white");
    expect(button).not.toContain("text-gray-400");
  });
});

describe("design tokens in the new UI", () => {
  // Classes that do not exist in tailwind.config.ts generate no CSS and silently leave the element unstyled.
  // (LeadDrawer is not listed: its quoted-message box predates this work and is left as is.)
  const BAD = /\b(?:bg|text|border|ring|from|to|via)-(?:error|warning|success|accent-subtle|bg-sheen)(?:\/\d+)?\b/;
  const files = [
    "src/components/staff/AiSummaryCard.tsx",
    "src/components/staff/NextBestActionCard.tsx",
    "src/components/staff/ServiceVisitDialog.tsx",
    "src/components/staff/StockDrawer.tsx",
    "src/components/dashboard/MyCarsSection.tsx",
    "src/components/chat/ChatWidget.tsx",
    "src/components/chat/ChatText.tsx",
    "src/components/chat/TypingDots.tsx",
  ];

  it.each(files)("%s uses only tokens that exist", (file) => {
    const src = fs.readFileSync(file, "utf8");
    const hit = BAD.exec(src);
    expect(hit?.[0] ?? null).toBeNull();
  });

  it("the shared animation utilities exist and respect reduced motion", () => {
    const css = fs.readFileSync("src/styles/dashboard.css", "utf8");
    expect(css).toContain(".fade-up-item");
    expect(css).toContain(".typing-dots");
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain(".fade-up-item");
    expect(reduced).toContain(".typing-dots");
  });
});
