/**
 * The app is English only. This guards against the language/locale concept creeping back in.
 * (Hindi words in src/lib/validation/discount.ts are a staff-safety filter, not UI language, and stay.)
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const exists = (p: string) => fs.existsSync(path.join(ROOT, p));
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(rel);
  }
  return out;
}
const srcFiles = walk("src").filter((f) => !/types[\\/](db|database\.types)\.ts$/.test(f));

describe("English only: files that must be gone", () => {
  it("has no [locale] route segment", () => {
    expect(exists("src/app/[locale]")).toBe(false);
  });
  it("has no routing/navigation helpers, Hindi catalogue or language switcher", () => {
    for (const f of ["src/i18n/routing.ts", "src/i18n/navigation.ts", "messages/hi.json", "src/components/layout/LocaleSwitcher.tsx"]) {
      expect(exists(f), f).toBe(false);
    }
  });
});

describe("English only: source", () => {
  it("never imports next-intl routing/navigation or the removed helpers", () => {
    const offenders = srcFiles.filter((f) =>
      /@\/i18n\/(routing|navigation)|next-intl\/(navigation|routing|middleware)|useLocale\b|LocaleSwitcher/.test(read(f))
    );
    expect(offenders).toEqual([]);
  });

  it("has no language-prefixed URLs or a Hindi locale anywhere in app code", () => {
    const offenders = srcFiles
      .filter((f) => f !== path.join("src", "server", "auth", "safe-next.ts"))
      .filter((f) => /["'`]\/hi(\/|["'`])|\/\$\{locale\}|hreflang|hi_IN|"hi"/.test(read(f)))
      .filter((f) => f !== path.join("src", "lib", "validation", "discount.ts"));
    expect(offenders).toEqual([]);
  });

  it("renders <html lang=\"en\"> from the root layout", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).toContain('<html lang="en"');
    expect(layout).toContain('locale="en"');
    expect(layout).not.toMatch(/Devanagari/);
  });

  it("loads only the English catalogue", () => {
    const request = read("src/i18n/request.ts");
    expect(request).toContain('locale: "en"');
    expect(request).toContain("messages/en.json");
    expect(request).not.toMatch(/hi\.json|\$\{locale\}/);
  });

  it("middleware does no locale routing", () => {
    const mw = read("src/middleware.ts");
    expect(mw).not.toMatch(/from "next-intl|from ".*i18n/);
    expect(mw).toContain("updateSession");
  });

  it("has no Devanagari UI font configured", () => {
    expect(read("tailwind.config.ts")).not.toMatch(/devanagari/i);
  });

  it("the catalogue has no language-picker strings", () => {
    expect(read("messages/en.json")).not.toMatch(/"(language|locale|hindi)"/i);
  });
});

describe("English only: old links keep working", () => {
  it("redirects /en/... and /hi/... to the unprefixed page", () => {
    const cfg = read("next.config.ts");
    expect(cfg).toContain("async redirects()");
    expect(cfg).toMatch(/\/:locale\(en\|hi\)\/:path\*/);
    expect(cfg).toMatch(/destination: "\/:path\*"/);
    expect(cfg).toMatch(/permanent: true/);
  });

  it("the sitemap lists each page once with no language prefix", () => {
    const sitemap = read("src/app/sitemap.ts");
    expect(sitemap).not.toMatch(/locale|\/en\b|\/hi\b/);
  });
});

describe("hydration safety of time-dependent staff UI", () => {
  it("SlaTimer's first render does not depend on the current time", () => {
    const src = read("src/components/staff/SlaTimer.tsx");
    // the lazy initial state must not call slaState with a fresh `new Date()` for the live countdown
    const init = src.slice(src.indexOf("useState<SlaResult | null>"), src.indexOf("useEffect(() =>"));
    expect(init).not.toMatch(/slaState\([^)]*new Date\(\)\)/);
    expect(init).toContain("firstContactedAt ?");
  });

  it("LeadRow formats times in a fixed time zone", () => {
    expect(read("src/components/staff/LeadRow.tsx")).toContain('timeZone: "Asia/Kolkata"');
  });
});
