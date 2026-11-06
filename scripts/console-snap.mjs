#!/usr/bin/env node
/**
 * scripts/console-snap.mjs: full-page screenshots of the console Overview sections, charts open, after they
 * have finished drawing. DEV ONLY (localhost + the DEV Supabase project).
 *
 *   node scripts/console-snap.mjs --out=DIR [--viewport=390x844] [--only=consultant|manager|admin]
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createServerClient } from "@supabase/ssr";

const DEV_REF = process.env.SUPABASE_DEV_REF || "eobtzcwinjmimzisypca";
const PASSWORD = "VroomaDevPass2026!";
const EMAIL = { consultant: "dev-consultant@vrooma.in", manager: "dev-manager@vrooma.in", admin: "dev-admin@vrooma.in" };
const PAGES = {
  consultant: [["lead-desk", "/staff"], ["bookings", "/staff/bookings"]],
  manager: [["lead-desk", "/staff"], ["bookings", "/staff/bookings"], ["stock", "/staff/stock"]],
  admin: [
    ["overview", "/admin"],
    ["catalog-models", "/admin/catalog?tab=models"],
    ["team-users", "/admin/team?tab=users"],
    ["team-routing", "/admin/team?tab=routing"],
    ["team-slots", "/admin/team?tab=slots"],
  ],
};

const args = process.argv.slice(2);
const arg = (k, d = "") => (args.find((a) => a.startsWith(`--${k}=`)) || "").replace(`--${k}=`, "") || d;
const baseUrl = (process.env.TEST_URL || "http://localhost:3000").replace(/\/+$/, "");
const host = new URL(baseUrl).hostname;

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
const env = { ...loadEnv(path.resolve(process.cwd(), ".env.local")), ...process.env };
if (!["localhost", "127.0.0.1"].includes(host) || !(env.NEXT_PUBLIC_SUPABASE_URL || "").includes(DEV_REF)) {
  console.error("REFUSED: dev only (localhost + the DEV Supabase project).");
  process.exit(2);
}

const outDir = arg("out") || path.resolve("snap-out");
fs.mkdirSync(outDir, { recursive: true });
const [w, h] = arg("viewport", "1280x900").split("x").map(Number);
const only = arg("only");

async function cookiesFor(email) {
  const jar = new Map();
  const sb = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (l) => l.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(error.message);
  return [...jar].map(([name, value]) => ({ name, value, domain: host, path: "/", httpOnly: false, secure: false, sameSite: "Lax" }));
}

const browser = await chromium.launch();
for (const persona of Object.keys(PAGES)) {
  if (only && only !== persona) continue;
  const cookies = await cookiesFor(EMAIL[persona]);
  for (const [id, url] of PAGES[persona]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 800, isMobile: w < 800 });
    await ctx.addCookies(cookies);
    // Force the charts open, including on phones where they start collapsed.
    await ctx.addInitScript(() => {
      try {
        for (const k of ["lead-desk", "bookings", "used-stock", "trade-ins", "admin-performance", "admin-catalog", "admin-people", "admin-routing", "admin-slots"]) {
          localStorage.setItem(`vrooma.overview.${k}`, "open");
        }
      } catch {}
    });
    const page = await ctx.newPage();
    await page.goto(`${baseUrl}${url}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
    await page.waitForSelector(".recharts-wrapper, [aria-label=Overview]", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const file = path.join(outDir, `${persona}-${id}-${w}x${h}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
    await ctx.close();
  }
}
await browser.close();
