/**
 * Dead-link guard. Every static internal href in the app must resolve to a real page.
 * Born from the console check: two "Import CSV" buttons linked to /staff/import, which 404s
 * (the page is /staff/leads/import).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APP = path.join(ROOT, "src/app/[locale]");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Page routes under /[locale], with route groups removed and [param] kept as a wildcard. */
function pageRoutes(): RegExp[] {
  return walk(APP)
    .filter((f) => /[\\/]page\.tsx$/.test(f))
    .map((f) => path.relative(APP, path.dirname(f)).split(path.sep))
    .map((segments) => segments.filter((s) => s && !/^\(.+\)$/.test(s)))
    .map((segments) => {
      const pattern = segments.map((s) => (/^\[.+\]$/.test(s) ? "[^/]+" : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("/");
      return new RegExp(`^/${pattern}$`);
    })
    .concat(/^\/$/); // the locale home page
}


describe("internal links", () => {
  const routes = pageRoutes();
  const files = walk(path.join(ROOT, "src")).filter((f) => /\.(tsx|ts)$/.test(f) && !/[\\/]app[\\/]api[\\/]/.test(f));

  it("finds the page routes", () => {
    expect(routes.length).toBeGreaterThan(25);
    expect(routes.some((r) => r.test("/staff/leads/import"))).toBe(true);
  });

  it("every static <Link href=\"/...\"> points at an existing page", () => {
    const broken: string[] = [];
    for (const file of files) {
      const src = fs.readFileSync(file, "utf8");
      for (const m of src.matchAll(/<Link\b[^>]*?\bhref=["'](\/[^"'#?{}$`\s]*)["']/g)) {
        const href = m[1].replace(/\/+$/, "") || "/";
        if (href.startsWith("/api/") || href.startsWith("/_next")) continue;
        if (!routes.some((r) => r.test(href))) broken.push(`${path.relative(ROOT, file)} -> ${href}`);
      }
    }
    expect(broken, `Dead internal links:\n${broken.join("\n")}`).toEqual([]);
  });

  it("the CSV import buttons use the real path", () => {
    for (const f of ["src/app/[locale]/(staff)/staff/leads/StaffLeadsClient.tsx", "src/app/[locale]/(staff)/staff/StaffOverviewClient.tsx"]) {
      const src = fs.readFileSync(path.join(ROOT, f), "utf8");
      expect(src).not.toContain('href="/staff/import"');
      expect(src).toContain('href="/staff/leads/import"');
    }
  });
});
