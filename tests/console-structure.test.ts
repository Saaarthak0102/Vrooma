/**
 * Guards the consolidated consoles: at most 3 screens per role, role rules that agree between the nav,
 * the middleware and the pages, and the dev persona switch being a REAL sign-in.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CONSOLE_LINKS, landingPathForRole, linksForRole } from "@/lib/console-nav";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("console navigation", () => {
  it("gives each role at most 3 screens of its own", () => {
    // The admin can also open the staff screens; the screens that are THEIRS are the /admin ones.
    expect(linksForRole("consultant")).toHaveLength(2);
    expect(linksForRole("manager")).toHaveLength(3);
    expect(linksForRole("admin").filter((l) => l.href.startsWith("/admin"))).toHaveLength(3);
    expect(linksForRole("buyer")).toHaveLength(0);
  });

  it("never lists a screen the role cannot open", () => {
    const consultantHrefs = linksForRole("consultant").map((l) => l.href);
    expect(consultantHrefs).not.toContain("/staff/stock");
    expect(consultantHrefs.some((h) => h.startsWith("/admin"))).toBe(false);
    expect(linksForRole("manager").some((l) => l.href.startsWith("/admin"))).toBe(false);
  });

  it("lands each role on its first screen", () => {
    expect(landingPathForRole("buyer")).toBe("/dashboard");
    expect(landingPathForRole("consultant")).toBe("/staff");
    expect(landingPathForRole("manager")).toBe("/staff");
    expect(landingPathForRole("admin")).toBe("/admin");
  });

  it("has a real page behind every link", () => {
    for (const link of CONSOLE_LINKS) {
      const segments = link.href.split("/").filter(Boolean);
      const group = segments[0] === "admin" ? "(admin)" : "(staff)";
      const file = path.join("src/app", group, ...segments, "page.tsx");
      expect(fs.existsSync(path.join(process.cwd(), file)), `${link.href} -> ${file}`).toBe(true);
    }
  });
});

describe("role enforcement matches the nav", () => {
  const middleware = read("src/lib/supabase/middleware.ts");

  it("middleware limits /staff/stock to manager and admin, and /admin to admin", () => {
    expect(middleware).toMatch(/\/\^\\\/staff\\\/stock/);
    expect(middleware).toContain('["manager", "admin"].includes(profile?.role');
    expect(middleware).toMatch(/isAdminRoute && profile\?\.role !== "admin"/);
  });

  it("the price band is produced server-side for managers and admins only", () => {
    const actions = read("src/server/actions/stock.ts");
    const band = actions.slice(actions.indexOf("export async function getPriceBandAction"));
    expect(band.slice(0, 400)).toContain('requireRole("manager", "admin")');
    // The old browser-side calculator (a flat +/-6%) must stay gone, or any bundle could compute a band.
    expect(fs.existsSync(path.join(process.cwd(), "src/server/services/price-suggestion.ts"))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), "src/components/admin/PriceSuggestionCard.tsx"))).toBe(false);
  });

  it("stock pages and actions are guarded by role", () => {
    expect(read("src/app/(staff)/staff/stock/page.tsx")).toContain('requireRole("manager", "admin")');
    for (const name of ["saveRoutingRuleAction", "deleteRoutingRuleAction", "updateWorkshopBaysAction", "setUserActiveAction"]) {
      const src = read("src/server/actions/admin-network.ts");
      const body = src.slice(src.indexOf(`export async function ${name}`));
      expect(body.slice(0, 400), name).toContain('requireRole("admin")');
    }
  });
});

describe("dev persona switch", () => {
  const provider = read("src/components/auth/AuthProvider.tsx");

  it("signs in for real instead of faking a client-side profile", () => {
    expect(provider).toContain("/api/auth/dev-login");
    expect(provider).not.toMatch(/usr-\$\{newRole\}-1/);
  });

  it("both sign-in surfaces await the real sign-in", () => {
    expect(read("src/app/(auth)/sign-in/page.tsx")).toMatch(/await switchRole\(role\)/);
    expect(read("src/components/auth/SignInSheet.tsx")).toMatch(/await switchRole\(role\)/);
  });
});
