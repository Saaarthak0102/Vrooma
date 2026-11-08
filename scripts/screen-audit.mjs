#!/usr/bin/env node
/**
 * scripts/screen-audit.mjs
 *
 * Phone-first visual and layout audit. Opens every public, buyer, staff and admin screen in a real browser
 * (Playwright) at phone, tablet and desktop sizes, takes a screenshot of each, and records what a screenshot cannot
 * prove on its own: sideways overflow, elements wider than the screen, tap targets that are too small, tiny text,
 * broken images, console errors and failed requests.
 * Read-only: it signs in as the dev personas and looks. It never submits a form or sends a chat message.
 * DEV ONLY. Refuses to run unless the target is localhost AND .env.local points at the DEV Supabase project.
 *
 *   node scripts/screen-audit.mjs --out=<folder>
 *   node scripts/screen-audit.mjs --out=<folder> --only=admin --viewports=360,390
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createServerClient } from "@supabase/ssr";

const DEV_REF = process.env.SUPABASE_DEV_REF || "eobtzcwinjmimzisypca";
const DEV_PASSWORD = "VroomaDevPass2026!";
const EMAIL = {
  buyer: "dev-buyer@vrooma.in",
  consultant: "dev-consultant@vrooma.in",
  manager: "dev-manager@vrooma.in",
  admin: "dev-admin@vrooma.in",
};
const SEED_LEAD = "5eed0010-0000-0000-0000-000000000001";

const VIEWPORTS = {
  360: { width: 360, height: 740, phone: true },
  390: { width: 390, height: 844, phone: true },
  430: { width: 430, height: 932, phone: true },
  768: { width: 768, height: 1024, phone: false },
  1440: { width: 1440, height: 900, phone: false },
};

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
const arg = (name, fallback = "") => (args.find((a) => a.startsWith(`--${name}=`)) || "").replace(`--${name}=`, "") || fallback;
const outDir = path.resolve(arg("out", ".audit"));
const only = arg("only");
const viewportIds = arg("viewports", "360,390,430,768").split(",").filter((v) => VIEWPORTS[v]);
const baseUrl = (process.env.TEST_URL || "http://localhost:3000").replace(/\/+$/, "");
const env = { ...loadEnvFile(path.resolve(process.cwd(), ".env.local")), ...process.env };
const host = new URL(baseUrl).hostname;
if (!["localhost", "127.0.0.1"].includes(host)) {
  console.error(`REFUSED: TEST_URL host "${host}" is not localhost.`);
  process.exit(2);
}
if (!(env.NEXT_PUBLIC_SUPABASE_URL || "").includes(DEV_REF)) {
  console.error(`REFUSED: NEXT_PUBLIC_SUPABASE_URL is not the DEV project (${DEV_REF}).`);
  process.exit(2);
}
if ((env.APP_ENV || "").toLowerCase() === "production") {
  console.error("REFUSED: APP_ENV=production.");
  process.exit(2);
}

async function sessionCookies(email) {
  const jar = new Map();
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: DEV_PASSWORD });
  if (error || !data.session) throw new Error(`sign-in failed for ${email}: ${error?.message}`);
  return [...jar].map(([name, value]) => ({ name, value, domain: host, path: "/", httpOnly: false, secure: false, sameSite: "Lax" }));
}

/* ----------------------------------- what to visit ----------------------------------- */

const click = (selector, wait = 700) => async (page) => {
  const el = page.locator(selector).first();
  if (await el.count()) {
    await el.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(wait);
  }
};

/** The chat launcher only appears after the page has been scrolled; scroll, then open it. */
const openChat = async (page) => {
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(700);
  await click('button:has-text("Chat with us")', 1400)(page);
};

const PAGES = [
  // public
  { role: "public", name: "home", url: "/" },
  { role: "public", name: "home-chat", url: "/", act: openChat },
  { role: "public", name: "new-cars", url: "/cars" },
  { role: "public", name: "car-detail", url: "/cars/model-h" },
  { role: "public", name: "used-cars", url: "/used-cars" },
  { role: "public", name: "offers", url: "/offers" },
  { role: "public", name: "showrooms", url: "/showrooms" },
  { role: "public", name: "emi-calculator", url: "/emi-calculator" },
  { role: "public", name: "about", url: "/about" },
  { role: "public", name: "contact", url: "/contact" },
  { role: "public", name: "privacy", url: "/legal/privacy" },
  { role: "public", name: "terms", url: "/legal/terms" },
  { role: "public", name: "data-rights", url: "/legal/data-rights" },
  { role: "public", name: "sign-in", url: "/sign-in" },
  { role: "public", name: "sign-up", url: "/sign-up" },
  // buyer
  { role: "buyer", name: "buyer-home-chat", url: "/", act: openChat },
  { role: "buyer", name: "dashboard", url: "/dashboard" },
  { role: "buyer", name: "dashboard-bookings", url: "/dashboard/bookings" },
  { role: "buyer", name: "dashboard-enquiries", url: "/dashboard/enquiries" },
  { role: "buyer", name: "dashboard-saved", url: "/dashboard/saved" },
  { role: "buyer", name: "profile-my-cars", url: "/profile" },
  { role: "buyer", name: "book-test-drive", url: "/book/test-drive" },
  { role: "buyer", name: "book-service", url: "/book/service" },
  { role: "buyer", name: "trade-in", url: "/trade-in" },
  // consultant
  { role: "consultant", name: "lead-desk", url: "/staff" },
  { role: "consultant", name: "lead-drawer", url: `/staff?lead=${SEED_LEAD}`, act: async (p) => p.waitForTimeout(1500) },
  { role: "consultant", name: "staff-bookings", url: "/staff/bookings" },
  { role: "consultant", name: "staff-chats", url: "/staff/chats" },
  // manager
  { role: "manager", name: "manager-lead-desk", url: "/staff" },
  { role: "manager", name: "used-stock", url: "/staff/stock" },
  { role: "manager", name: "stock-drawer", url: "/staff/stock", act: click("tbody tr", 1500) },
  // admin
  { role: "admin", name: "admin-overview", url: "/admin" },
  { role: "admin", name: "ai-activity", url: "/admin?tab=ai" },
  { role: "admin", name: "ai-activity-drawer", url: "/admin?tab=ai", act: click("tbody tr", 1200) },
  { role: "admin", name: "ai-draft-vs-sent", url: "/admin?tab=ai&view=replies" },
  { role: "admin", name: "system-health", url: "/admin?tab=system" },
  { role: "admin", name: "catalog", url: "/admin/catalog" },
  { role: "admin", name: "team", url: "/admin/team" },
];

/* ----------------------------------- page checks ----------------------------------- */

/** Runs inside the page. Returns plain numbers and short descriptions only. */
function measure() {
  const vw = window.innerWidth;
  const describe = (el) => {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const cls = typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    const text = (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${tag}${id}${cls}${text ? ` "${text}"` : ""}`;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05;
  };
  const insideScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") {
        const r = p.getBoundingClientRect();
        if (r.right <= vw + 1) return true;
      }
    }
    return false;
  };

  const doc = document.documentElement;
  const overflowPx = Math.max(0, doc.scrollWidth - vw);

  const wide = [];
  const small = [];
  const tiny = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const fixed = getComputedStyle(el).position === "fixed";
    if (!fixed && r.right > vw + 1 && !insideScroller(el) && !el.closest("[aria-hidden='true']") && !el.closest("[data-radix-popper-content-wrapper]")) {
      wide.push(`${describe(el)} → right edge ${Math.round(r.right)}px`);
    }
    if (el.matches("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], summary")) {
      // A link that is part of a sentence is judged by its line, not by its own box.
      const inline = el.tagName === "A" && getComputedStyle(el).display === "inline";
      if (!inline && r.width > 2 && r.height > 2 && (r.height < 36 || r.width < 36) && r.right > 0 && r.left < vw) {
        small.push(`${describe(el)} → ${Math.round(r.width)}x${Math.round(r.height)}px`);
      }
    }
    if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 10.5) tiny.push(`${describe(el)} → ${fs}px`);
    }
  }
  const brokenImages = [...document.images].filter((i) => visible(i) && i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src);
  const noAlt = [...document.images].filter((i) => visible(i) && !i.hasAttribute("alt")).length;
  const uniq = (list) => [...new Set(list)];
  return {
    overflowPx,
    wide: uniq(wide).slice(0, 6),
    smallTargets: uniq(small).length,
    smallSamples: uniq(small).slice(0, 6),
    tinyText: uniq(tiny).length,
    tinySamples: uniq(tiny).slice(0, 4),
    brokenImages: brokenImages.slice(0, 4),
    imagesWithoutAlt: noAlt,
    height: doc.scrollHeight,
  };
}

/** Scroll to the bottom and back so reveal-on-scroll content is drawn before the screenshot. */
async function settle(page) {
  await page.evaluate(async () => {
    const step = Math.max(300, window.innerHeight - 100);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
}

/* ------------------------------------- run ------------------------------------- */

fs.mkdirSync(path.join(outDir, "shots"), { recursive: true });
const browser = await chromium.launch();
const results = [];
const roles = [...new Set(PAGES.map((p) => p.role))].filter((r) => !only || r === only);

for (const role of roles) {
  const cookies = role === "public" ? [] : await sessionCookies(EMAIL[role]);
  for (const vpId of viewportIds) {
    const vp = VIEWPORTS[vpId];
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.phone,
      hasTouch: vp.phone,
      deviceScaleFactor: 1,
    });
    if (cookies.length) await context.addCookies(cookies);

    for (const spec of PAGES.filter((p) => p.role === role)) {
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      const consoleErrors = [];
      const failed = [];
      page.on("console", (m) => {
        if (m.type() === "error" || (m.type() === "warning" && /hydrat|did not match|cannot be a descendant|validateDOMNesting/i.test(m.text()))) {
          consoleErrors.push(m.text().replace(/\s+/g, " ").slice(0, 200));
        }
      });
      page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e.message).slice(0, 200)}`));
      page.on("response", (r) => {
        if (r.status() >= 400 && r.url().startsWith(baseUrl) && !/\/_next\/|favicon/.test(r.url())) failed.push(`${r.status()} ${r.url().replace(baseUrl, "")}`);
      });

      const entry = { role, viewport: vpId, name: spec.name, url: spec.url };
      try {
        const res = await page.goto(`${baseUrl}${spec.url}`, { waitUntil: "domcontentloaded", timeout: 90000 });
        await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {});
        entry.status = res?.status() ?? 0;
        entry.finalPath = new URL(page.url()).pathname + new URL(page.url()).search;
        await page.waitForTimeout(600);
        await settle(page);
        if (spec.act) await spec.act(page);
        Object.assign(entry, await page.evaluate(measure));
        const file = `${role}-${spec.name}-${vpId}.jpg`;
        await page.screenshot({ path: path.join(outDir, "shots", file), fullPage: !spec.act, type: "jpeg", quality: 55 });
        entry.shot = file;
      } catch (err) {
        entry.error = String(err?.message || err).split("\n")[0].slice(0, 200);
      }
      entry.consoleErrors = [...new Set(consoleErrors)].slice(0, 5);
      entry.failedRequests = [...new Set(failed)].slice(0, 5);
      results.push(entry);
      const flag = entry.error || entry.overflowPx > 0 || entry.consoleErrors.length || (entry.wide || []).length ? "ISSUE" : "ok   ";
      console.log(`${flag} ${role.padEnd(10)} ${String(vpId).padStart(4)}  ${spec.name}${entry.overflowPx ? `  overflow ${entry.overflowPx}px` : ""}${entry.consoleErrors.length ? `  console ${entry.consoleErrors.length}` : ""}${entry.error ? `  ${entry.error}` : ""}`);
      await page.close();
    }
    await context.close();
  }
}
await browser.close();

fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(results, null, 1));
const bad = results.filter((r) => r.error || r.overflowPx > 0 || (r.wide || []).length || r.consoleErrors.length || r.failedRequests.length || (r.brokenImages || []).length);
console.log(`\n${results.length} screens checked, ${bad.length} with findings. Report: ${path.join(outDir, "report.json")}`);
