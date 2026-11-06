#!/usr/bin/env node
/**
 * scripts/console-layout.mjs
 *
 * Responsive audit of every staff/admin console screen, in a real browser, at phone, tablet and desktop sizes.
 * DEV ONLY (localhost + the DEV Supabase project, same guards as console-e2e.mjs).
 *
 * For each persona x screen x viewport it measures, rather than eyeballs:
 *   - horizontal page overflow (tables may scroll inside their own box, the page may not)
 *   - the public header/footer must be absent; exactly one header (the console bar) must be present
 *   - drawers and dialogs must fit inside the viewport and scroll internally WITHOUT moving the page behind
 *   - touch viewports: interactive controls should be at least 40px tall (44 is the target for primary actions)
 *   - console errors and failed requests
 * and saves a screenshot per page to --out (default: the OS temp folder).
 *
 *   node scripts/console-layout.mjs [--only=consultant|manager|admin] [--viewport=360x740] [--out=DIR]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { createServerClient } from "@supabase/ssr";

const DEV_REF = process.env.SUPABASE_DEV_REF || "eobtzcwinjmimzisypca";
const DEV_PASSWORD = "VroomaDevPass2026!";
const EMAIL = { consultant: "dev-consultant@vrooma.in", manager: "dev-manager@vrooma.in", admin: "dev-admin@vrooma.in" };

const VIEWPORTS = [
  { name: "360x740", width: 360, height: 740, touch: true },
  { name: "390x844", width: 390, height: 844, touch: true },
  { name: "667x375-landscape", width: 667, height: 375, touch: true },
  { name: "768x1024", width: 768, height: 1024, touch: true },
  { name: "1024x768", width: 1024, height: 768, touch: true },
  { name: "1280x720", width: 1280, height: 720, touch: false },
  { name: "1536x864", width: 1536, height: 864, touch: false },
  { name: "1920x1080", width: 1920, height: 1080, touch: false },
];

const SCREENS = {
  consultant: [
    { id: "lead-desk", path: "/staff", drawer: "first-row" },
    { id: "bookings", path: "/staff/bookings" },
  ],
  manager: [
    { id: "lead-desk", path: "/staff", drawer: "first-row" },
    { id: "bookings", path: "/staff/bookings" },
    { id: "stock", path: "/staff/stock", drawer: "first-row", dialog: /Add vehicle/i },
    { id: "trade-ins", path: "/staff/stock", tab: /^Trade-ins/, drawer: "first-row" },
  ],
  admin: [
    { id: "overview", path: "/admin" },
    { id: "overview-ai", path: "/admin?tab=ai" },
    { id: "overview-system", path: "/admin?tab=system" },
    { id: "catalog-models", path: "/admin/catalog?tab=models", dialog: /Add model/i },
    { id: "catalog-prices", path: "/admin/catalog?tab=prices", dialog: /New price rule/i },
    { id: "catalog-offers", path: "/admin/catalog?tab=offers", dialog: /New offer/i },
    { id: "catalog-banners", path: "/admin/catalog?tab=banners", dialog: /New banner/i },
    { id: "team-users", path: "/admin/team?tab=users", dialog: /Invite staff/i },
    { id: "team-network", path: "/admin/team?tab=network" },
    { id: "team-routing", path: "/admin/team?tab=routing", dialog: /Add rule/i },
    { id: "team-slots", path: "/admin/team?tab=slots" },
  ],
};

/* ------------------------------- setup ------------------------------- */

function loadEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return out;
}

const args = process.argv.slice(2);
const arg = (k) => (args.find((a) => a.startsWith(`--${k}=`)) || "").replace(`--${k}=`, "");
const baseUrl = (process.env.TEST_URL || "http://localhost:3000").replace(/\/+$/, "");
const env = { ...loadEnvFile(path.resolve(process.cwd(), ".env.local")), ...process.env };
const host = new URL(baseUrl).hostname;
if (!["localhost", "127.0.0.1"].includes(host)) {
  console.error("REFUSED: not localhost.");
  process.exit(2);
}
if (!(env.NEXT_PUBLIC_SUPABASE_URL || "").includes(DEV_REF)) {
  console.error("REFUSED: not the DEV Supabase project.");
  process.exit(2);
}

const outDir = arg("out") || path.join(os.tmpdir(), "vrooma-layout");
fs.mkdirSync(outDir, { recursive: true });

async function sessionCookies(email) {
  const jar = new Map();
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password: DEV_PASSWORD });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return [...jar].map(([name, value]) => ({ name, value, domain: host, path: "/", httpOnly: false, secure: false, sameSite: "Lax" }));
}

/* ------------------------------- measurements ------------------------------- */

async function pageMetrics(page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    return {
      overflowX: de.scrollWidth - window.innerWidth,
      headers: document.querySelectorAll("header").length,
      footers: document.querySelectorAll("footer").length,
      scrollY: window.scrollY,
    };
  });
}

/** Interactive controls that are visible on screen but shorter than `min` px. */
async function smallTargets(page, min) {
  return page.evaluate((minPx) => {
    const sel = "button, a[href], select, input:not([type=hidden]):not([type=checkbox]), [role=tab], [role=button]";
    const bad = [];
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      if (el.closest("[aria-hidden=true], [data-sonner-toaster]")) continue;
      if (r.bottom < 0 || r.top > window.innerHeight * 3) continue;
      if (r.height < minPx) {
        const label = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
        bad.push(`${el.tagName.toLowerCase()} "${label}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    return bad;
  }, min);
}

/** A drawer/dialog must fit the viewport, and wheel-scrolling inside it must not move the page behind. */
async function layerMetrics(page, kind) {
  const layer = page.locator('[role="dialog"]').last();
  if (!(await layer.count())) return { missing: true };
  const box = await layer.boundingBox();
  const vp = page.viewportSize();
  const info = await layer.evaluate((el) => ({
    scrollable: el.scrollHeight > el.clientHeight + 2,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    overflowY: getComputedStyle(el).overflowY,
  }));
  const beforeY = await page.evaluate(() => window.scrollY);
  let scrolled = null;
  if (info.scrollable) {
    await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 200));
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(400);
    scrolled = await layer.evaluate((el) => el.scrollTop);
  }
  const afterY = await page.evaluate(() => window.scrollY);
  return {
    missing: false,
    kind,
    fits: box.x >= -1 && box.y >= -1 && box.x + box.width <= vp.width + 1 && box.y + box.height <= vp.height + 1,
    box: `${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}x${Math.round(box.height)}`,
    scrollable: info.scrollable,
    innerScrolled: scrolled,
    pageMoved: afterY !== beforeY,
    overflowY: info.overflowY,
  };
}

/* ------------------------------- run ------------------------------- */

const problems = [];
let pagesChecked = 0;

function report(persona, screen, vp, what, detail) {
  problems.push({ persona, screen: screen.id, viewport: vp.name, what, detail });
  console.log(`  ✗ ${persona}/${screen.id} @ ${vp.name}: ${what}${detail ? ` (${detail})` : ""}`);
}

async function auditScreen(browser, persona, cookies, screen, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch,
    isMobile: vp.touch && vp.width < 800,
    deviceScaleFactor: 1,
  });
  await context.addCookies(cookies);
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  const consoleErrors = [];
  const failed = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource: the server responded with a status of 40[34]/.test(m.text())) {
      consoleErrors.push(m.text().slice(0, 160));
    }
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e.message).slice(0, 160)}`));
  page.on("requestfailed", (r) => {
    if (r.failure()?.errorText !== "net::ERR_ABORTED") failed.push(`${r.url().slice(0, 100)} ${r.failure()?.errorText}`);
  });

  try {
    await page.goto(`${baseUrl}${screen.path}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
    if (screen.tab) await page.getByRole("tab", { name: screen.tab }).click();
    await page.waitForTimeout(500);
    pagesChecked++;

    const m = await pageMetrics(page);
    if (m.overflowX > 1) report(persona, screen, vp, "page scrolls horizontally", `${m.overflowX}px too wide`);
    if (m.footers !== 0) report(persona, screen, vp, "public footer is rendered on a console");
    if (m.headers !== 1) report(persona, screen, vp, `expected exactly 1 header (console bar), found ${m.headers}`);
    if (consoleErrors.length) report(persona, screen, vp, "console errors", consoleErrors[0]);
    if (failed.length) report(persona, screen, vp, "failed requests", failed[0]);

    const shot = `${persona}-${screen.id}-${vp.name}.png`;
    await page.screenshot({ path: path.join(outDir, shot), fullPage: false });

    if (vp.touch) {
      const small = await smallTargets(page, 40);
      if (small.length) report(persona, screen, vp, `${small.length} touch targets under 40px`, small.slice(0, 3).join("; "));
    }

    // Side panel
    if (screen.drawer === "first-row") {
      const row = page.locator("tbody tr[tabindex='0']").first();
      if (await row.count()) {
        await row.click();
        await page.waitForTimeout(1800);
        const l = await layerMetrics(page, "drawer");
        if (l.missing) report(persona, screen, vp, "row click did not open a side panel");
        else {
          if (!l.fits) report(persona, screen, vp, "drawer does not fit the viewport", l.box);
          if (l.pageMoved) report(persona, screen, vp, "scrolling the drawer moved the page behind it");
          if (l.scrollable && l.overflowY === "visible") report(persona, screen, vp, "drawer content is cut off (not scrollable)");
          if (l.scrollable && !l.innerScrolled) report(persona, screen, vp, "drawer is scrollable but wheel did not scroll it");
          await page.screenshot({ path: path.join(outDir, `${persona}-${screen.id}-${vp.name}-drawer.png`) });
          if (vp.touch) {
            const small = await smallTargets(page, 40);
            if (small.length) report(persona, screen, vp, `drawer: ${small.length} touch targets under 40px`, small.slice(0, 3).join("; "));
          }
        }
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      } else {
        console.log(`  (no rows on ${persona}/${screen.id}, drawer not checked)`);
      }
    }

    // Dialog
    if (screen.dialog) {
      const btn = page.getByRole("button", { name: screen.dialog }).first();
      if (await btn.count()) {
        await btn.click();
        await page.waitForTimeout(900);
        const l = await layerMetrics(page, "dialog");
        if (l.missing) report(persona, screen, vp, "dialog did not open");
        else {
          if (!l.fits) report(persona, screen, vp, "dialog does not fit the viewport", l.box);
          if (l.pageMoved) report(persona, screen, vp, "scrolling the dialog moved the page behind it");
          if (l.scrollable && l.overflowY !== "auto" && l.overflowY !== "scroll") report(persona, screen, vp, "dialog content is cut off (not scrollable)", `overflow-y ${l.overflowY}`);
          await page.screenshot({ path: path.join(outDir, `${persona}-${screen.id}-${vp.name}-dialog.png`) });
          if (vp.touch) {
            const small = await smallTargets(page, 40);
            if (small.length) report(persona, screen, vp, `dialog: ${small.length} touch targets under 40px`, small.slice(0, 3).join("; "));
          }
        }
        await page.keyboard.press("Escape");
      }
    }
  } catch (err) {
    report(persona, screen, vp, "could not audit", String(err.message).split("\n")[0].slice(0, 160));
  } finally {
    await context.close();
  }
}

async function main() {
  const only = arg("only");
  const vpFilter = arg("viewport");
  const viewports = VIEWPORTS.filter((v) => !vpFilter || v.name.startsWith(vpFilter));
  console.log(`Target ${baseUrl} · screenshots in ${outDir}`);
  const browser = await chromium.launch();
  try {
    for (const persona of Object.keys(SCREENS)) {
      if (only && only !== persona) continue;
      console.log(`\n== ${persona} ==`);
      const cookies = await sessionCookies(EMAIL[persona]);
      for (const screen of SCREENS[persona]) {
        for (const vp of viewports) await auditScreen(browser, persona, cookies, screen, vp);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${pagesChecked} page views audited, ${problems.length} problem(s).`);
  if (problems.length) {
    const byWhat = new Map();
    for (const p of problems) {
      const key = p.what.replace(/\d+/g, "N");
      byWhat.set(key, (byWhat.get(key) || 0) + 1);
    }
    console.log("\nSummary by problem type:");
    for (const [k, v] of [...byWhat].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)} × ${k}`);
    fs.writeFileSync(path.join(outDir, "problems.json"), JSON.stringify(problems, null, 2));
    console.log(`\nDetails: ${path.join(outDir, "problems.json")}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
