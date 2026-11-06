#!/usr/bin/env node
/**
 * scripts/console-charts.mjs: proves the Overview charts are wired to real data and filter the table.
 * DEV ONLY. Signs in as the dev manager, clicks chart elements, and compares the grid's row count with a
 * direct service-role count in Supabase.
 *
 *   node scripts/console-charts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const DEV_REF = process.env.SUPABASE_DEV_REF || "eobtzcwinjmimzisypca";
const baseUrl = (process.env.TEST_URL || "http://localhost:3000").replace(/\/+$/, "");
const env = { ...Object.fromEntries(fs.readFileSync(path.resolve(".env.local"), "utf8").split(/\r?\n/).map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")])), ...process.env };
if (!baseUrl.includes("localhost") || !(env.NEXT_PUBLIC_SUPABASE_URL || "").includes(DEV_REF)) {
  console.error("REFUSED: dev only.");
  process.exit(2);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const jar = new Map();
const sb = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (l) => l.forEach(({ name, value }) => jar.set(name, value)) },
});
const { error } = await sb.auth.signInWithPassword({ email: "dev-manager@vrooma.in", password: "VroomaDevPass2026!" });
if (error) throw error;

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
};
const count = async (table, f = (q) => q) => (await f(admin.from(table).select("id", { count: "exact", head: true }))).count ?? 0;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
await ctx.addCookies([...jar].map(([name, value]) => ({ name, value, domain: "localhost", path: "/" })));
await ctx.addInitScript(() => { try { for (const k of ["lead-desk", "bookings", "used-stock", "trade-ins"]) localStorage.setItem(`vrooma.overview.${k}`, "open"); } catch {} });
const page = await ctx.newPage();
const shown = async () => {
  const t = await page.locator("span[aria-live=polite]").first().innerText();
  return Number(t.split(" of ")[0]);
};

// --- Lead Desk: KPI + funnel + donut -------------------------------------------------------------------------
await page.goto(`${baseUrl}/staff`, { waitUntil: "networkidle" });
const totalLeads = Math.min(200, await count("leads"));
check("lead grid shows the loaded leads", (await shown()) === totalLeads, `${await shown()} vs ${totalLeads}`);

await page.getByRole("button", { name: /^Won\b/ }).first().click();
const won = await count("leads", (q) => q.eq("status", "won"));
check("Won KPI filters the grid to won leads", (await shown()) === Math.min(200, won), `${await shown()} vs ${won}`);
await page.getByRole("button", { name: /Show all leads/ }).click();

// The Lead Desk loads the newest 200 leads, so the chart and the grid are compared with each other and with
// the database over exactly those rows.
const newest = await admin.from("leads").select("status").order("created_at", { ascending: false }).limit(200);
const reached = (newest.data ?? []).filter((l) => ["contacted", "test_drive_booked", "negotiating", "won"].includes(l.status)).length;
const stageBtn = page.getByRole("button", { name: /^Contacted:/ });
const chartFigure = Number((await stageBtn.getAttribute("aria-label")).match(/: (\d+)/)[1]);
await stageBtn.click();
check("funnel figure equals the database (newest 200 leads)", chartFigure === reached, `${chartFigure} vs ${reached}`);
check("funnel stage 'Contacted' filters the grid to that figure", (await shown()) === chartFigure, `${await shown()} vs ${chartFigure}`);
await page.getByRole("button", { name: /Clear filter/ }).first().click();
check("clearing the chip restores all rows", (await shown()) === totalLeads);

const slice = page.locator(".recharts-pie-sector").first();
await slice.dispatchEvent("click");
check("clicking a donut slice shows a filter chip", await page.getByRole("button", { name: /Clear filter/ }).first().isVisible());
check("donut filter narrows the grid", (await shown()) < totalLeads || totalLeads === 0);

// --- Used Stock ----------------------------------------------------------------------------------------------
await page.goto(`${baseUrl}/staff/stock`, { waitUntil: "networkidle" });
const stockTotal = await count("used_cars");
check("stock grid shows every vehicle", (await shown()) === stockTotal, `${await shown()} vs ${stockTotal}`);
await page.locator(".recharts-pie-sector").first().dispatchEvent("click");
const chip = await page.getByRole("button", { name: /Clear filter: (\w+)/ }).first().innerText();
const label = chip.replace(/\s*×.*/, "").trim();
const status = label.toLowerCase();
const byStatus = await count("used_cars", (q) => q.eq("status", status));
check(`status slice '${label}' matches the database`, (await shown()) === byStatus, `${await shown()} vs ${byStatus}`);

// --- Bookings ------------------------------------------------------------------------------------------------
await page.goto(`${baseUrl}/staff/bookings`, { waitUntil: "networkidle" });
const bookingsTotal = await count("bookings");
check("bookings grid shows every booking", (await shown()) === bookingsTotal, `${await shown()} vs ${bookingsTotal}`);

await browser.close();
console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll chart checks passed");
process.exit(failures ? 1 : 0);
