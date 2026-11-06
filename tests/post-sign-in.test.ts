import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { postSignInPath } from "@/lib/console-nav";
import { isConsolePath } from "@/components/layout/SiteChrome";

describe("postSignInPath", () => {
  it("sends staff to their console even when next points at a public or buyer page", () => {
    for (const next of ["/dashboard", "/cars/model-h", "/", "/profile", null, undefined]) {
      expect(postSignInPath("admin", next)).toBe("/admin");
      expect(postSignInPath("consultant", next)).toBe("/staff");
      expect(postSignInPath("manager", next)).toBe("/staff");
    }
  });

  it("keeps a deep link inside a console the role may open", () => {
    expect(postSignInPath("consultant", "/staff?lead=abc")).toBe("/staff?lead=abc");
    expect(postSignInPath("manager", "/staff/stock")).toBe("/staff/stock");
    expect(postSignInPath("admin", "/admin/team?tab=routing")).toBe("/admin/team?tab=routing");
    expect(postSignInPath("admin", "/staff/bookings")).toBe("/staff/bookings");
  });

  it("never sends someone to a console they cannot open", () => {
    expect(postSignInPath("consultant", "/staff/stock")).toBe("/staff");
    expect(postSignInPath("consultant", "/admin")).toBe("/staff");
    expect(postSignInPath("manager", "/admin/catalog")).toBe("/staff");
  });

  it("ignores protocol-relative or non-path values", () => {
    expect(postSignInPath("admin", "//evil.example")).toBe("/admin");
    expect(postSignInPath("buyer", "//evil.example")).toBe("/dashboard");
  });

  it("leaves buyers exactly as before", () => {
    expect(postSignInPath("buyer", "/book/test-drive?variant=1")).toBe("/book/test-drive?variant=1");
    expect(postSignInPath("buyer", null)).toBe("/dashboard");
    expect(postSignInPath(null, "/cars")).toBe("/cars");
  });
});

describe("console chrome", () => {
  it("is hidden only on staff and admin routes", () => {
    for (const p of ["/staff", "/staff/bookings", "/staff/stock", "/admin", "/admin/catalog", "/admin/team"]) {
      expect(isConsolePath(p), p).toBe(true);
    }
    for (const p of ["/", "/dashboard", "/cars", "/used-cars/UC-1182", "/sign-in", "/staffing", "/administrator", null, undefined]) {
      expect(isConsolePath(p as string | null | undefined), String(p)).toBe(false);
    }
  });

  it("the root layout wraps pages in SiteChrome instead of mounting the public header and footer directly", () => {
    const layout = fs.readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layout).toContain("<SiteChrome>");
    expect(layout).not.toContain("<SiteHeader");
    expect(layout).not.toContain("<SiteFooter");
  });
});

describe("scrolling inside sheets, dialogs and tables", () => {
  const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

  it("stops smooth-scroll from hijacking the wheel", () => {
    expect(read("src/components/ui/sheet.tsx")).toContain("data-lenis-prevent");
    expect(read("src/components/ui/dialog.tsx")).toContain("data-lenis-prevent");
    expect(read("src/components/grid/DataGrid.tsx")).toContain("data-lenis-prevent");
  });

  it("does not run smooth-scroll on console routes at all", () => {
    expect(read("src/components/motion/SmoothScrollProvider.tsx")).toMatch(/staff\|admin/);
  });
});
