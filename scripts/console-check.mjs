#!/usr/bin/env node
/**
 * scripts/console-check.mjs
 *
 * Real-browser console / runtime / CSP audit (Playwright + Chromium). DEV ONLY.
 *
 * Phase A  signed-out: public pages in English and Hindi, plus the sign-in sheet and the chat widget.
 * Phase B  signed-in, one browser context per persona (buyer, consultant, manager, admin), signed in with
 *          the DEV password users: dashboard (+ ?view= panels), profile, booking wizards, trade-in,
 *          staff leads + a lead detail, staff bookings, and the admin pages. Also proves the role walls:
 *          a buyer must get 403 on /staff and /admin, a consultant must get 403 on /admin.
 *
 * Per URL it prints: console errors, uncaught page errors, failed requests, HTTP >= 400 responses from our
 * own origin or Supabase, and CSP violations (both console text and the `securitypolicyviolation` event).
 * It also prints the active CSP mode and whether script-src allows 'unsafe-inline' (it should use a nonce
 * or hashes instead).
 *
 * NOT automatable: email code delivery to a real inbox. See the MANUAL list printed at the end.
 *
 * Usage:
 *   pnpm build && pnpm start -p 3009          # production build, as in VERIFY_REPORT
 *   TEST_URL=http://localhost:3009 node scripts/console-check.mjs
 *   node scripts/console-check.mjs --public-only      # skip Phase B
 *   node scripts/console-check.mjs --skip-public --personas=consultant,manager   # re-run a subset
 *   node scripts/console-check.mjs --strict-csp       # exit 1 if script-src allows 'unsafe-inline'
 *
 * Refuses to run unless the target is localhost AND .env.local points at the DEV Supabase project.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createServerClient } from "@supabase/ssr";

const DEV_REF = process.env.SUPABASE_DEV_REF || "eobtzcwinjmimzisypca";
const PROD_REF = process.env.SUPABASE_PROD_REF || "ajumkjokagqfdikfguti";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const DEV_PASSWORD = "VroomaDevPass2026!";
export const PERSONAS = {
  buyer: "dev-buyer@vrooma.in",
  consultant: "dev-consultant@vrooma.in",
  manager: "dev-manager@vrooma.in",
  admin: "dev-admin@vrooma.in",
};

/* ----------------------------- pure helpers (unit tested) ----------------------------- */

export function extractRef(urlOrRef) {
  const m = String(urlOrRef || "").match(/^https?:\/\/([a-z0-9]{20})\.supabase\.(?:co|in|net)/i);
  return m ? m[1].toLowerCase() : null;
}

/** @returns {{ ok: true } | { ok: false, error: string }} */
export function validateTarget({ baseUrl, supabaseUrl, args = [], env = process.env }) {
  let host;
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    return { ok: false, error: `Invalid TEST_URL "${baseUrl}"` };
  }
  if (!LOCAL_HOSTS.has(host)) return { ok: false, error: `REFUSED: TEST_URL host "${host}" is not localhost.` };

  const ref = extractRef(supabaseUrl);
  if (!ref) return { ok: false, error: "REFUSED: could not read the Supabase project ref from NEXT_PUBLIC_SUPABASE_URL." };
  if (ref === PROD_REF || ref === "gmyrehlrmifxckszrdje") {
    return { ok: false, error: `REFUSED: NEXT_PUBLIC_SUPABASE_URL points at a forbidden project (${ref}).` };
  }
  if (ref !== DEV_REF) return { ok: false, error: `REFUSED: project ${ref} is not the DEV project (${DEV_REF}).` };
  if ((env.APP_ENV || "").toLowerCase() === "production") return { ok: false, error: "REFUSED: APP_ENV=production." };
  if (args.includes("--prod") || args.includes("--target=prod")) return { ok: false, error: "REFUSED: this script never accepts a prod target." };
  return { ok: true };
}

/** Classifies a Content-Security-Policy header value. */
export function analyzeCsp(headerValue, reportOnly = false) {
  if (!headerValue) return { mode: "none", scriptSrc: "", unsafeInline: false, unsafeEval: false, nonceOrHash: false, verdict: "NO CSP HEADER" };
  const scriptSrc = (headerValue.split(";").map((d) => d.trim()).find((d) => d.startsWith("script-src ")) || "").trim();
  const unsafeInline = /'unsafe-inline'/.test(scriptSrc);
  const unsafeEval = /'unsafe-eval'/.test(scriptSrc);
  const nonceOrHash = /'nonce-[^']+'|'sha(?:256|384|512)-[^']+'/.test(scriptSrc);
  // Per CSP spec, 'unsafe-inline' is ignored by browsers when a nonce/hash is present, so that combination is fine.
  const effectivelyUnsafe = unsafeInline && !nonceOrHash;
  return {
    mode: reportOnly ? "report-only" : "enforcing",
    scriptSrc,
    unsafeInline,
    unsafeEval,
    nonceOrHash,
    verdict: effectivelyUnsafe ? "WEAK: script-src allows 'unsafe-inline' with no nonce/hash" : "OK: inline scripts need a nonce or hash",
  };
}

/** Everything that makes a URL a failure. Role-wall URLs flip the expectation of status 403. */
export function judge(result, expectStatus) {
  const problems = [];
  if (expectStatus !== undefined) {
    if (result.status !== expectStatus) problems.push(`expected HTTP ${expectStatus}, got ${result.status}`);
  } else if (result.status >= 400 || result.status === 0) {
    problems.push(`HTTP ${result.status}`);
  }
  if (result.errors.length) problems.push(`${result.errors.length} console error(s)`);
  if (result.pageErrors.length) problems.push(`${result.pageErrors.length} page error(s)`);
  if (result.cspViolations.length) problems.push(`${result.cspViolations.length} CSP violation(s)`);
  if (result.failedRequests.length) problems.push(`${result.failedRequests.length} failed request(s)`);
  if (result.badResponses.length) problems.push(`${result.badResponses.length} HTTP >=400 response(s)`);
  return problems;
}

/* ----------------------------------- URL plan ----------------------------------- */

const PUBLIC_URLS = [
  "/", "/cars", "/cars/model-h",
  "/used-cars", "/used-cars/UC-1182", "/offers", "/showrooms",
  "/emi-calculator", "/contact", "/about", "/legal/privacy", "/legal/terms",
  "/legal/data-rights", "/sign-in", "/sign-up",
  "/verify-email?token_hash=abcdefghij1234567890&type=signup&next=%2Fdashboard",
];

const PERSONA_PLAN = {
  buyer: {
    urls: [
      "/dashboard", "/dashboard?view=bookings", "/dashboard?view=saved", "/dashboard?view=enquiries",
      "/dashboard/bookings", "/dashboard/enquiries", "/dashboard/saved", "/dashboard/profile",
      "/profile", "/book/test-drive", "/book/service", "/trade-in",
    ],
    walls: [{ path: "/staff/leads", status: 403 }, { path: "/admin", status: 403 }],
  },
  consultant: {
    urls: ["/staff", "/staff/leads", "{LEAD_DETAIL}", "/staff/bookings", "/staff/leads/import"],
    walls: [{ path: "/admin", status: 403 }, { path: "/admin/prices", status: 403 }],
  },
  manager: {
    urls: ["/staff", "/staff/leads", "{LEAD_DETAIL}", "/staff/bookings"],
    walls: [{ path: "/admin", status: 403 }],
  },
  admin: {
    urls: [
      "/admin", "/admin/models", "/admin/prices", "/admin/used-cars", "/admin/slots",
      "/admin/users", "/admin/system", "/admin/showrooms", "/admin/assignment", "/admin/offers",
      "/admin/banners", "/admin/ai-logs", "/staff/leads", "{LEAD_DETAIL}",
    ],
    walls: [],
  },
};

/* ----------------------------------- runtime ----------------------------------- */

function loadEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return out;
}

/** Signs in with the real @supabase/ssr cookie writer, so the cookie format always matches the app. */
async function sessionCookies(supabaseUrl, publishableKey, email, baseUrl) {
  const jar = new Map();
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: DEV_PASSWORD });
  if (error || !data.session) throw new Error(`sign-in failed for ${email}: ${error?.message}`);
  const host = new URL(baseUrl).hostname;
  return {
    userId: data.user.id,
    supabase,
    cookies: [...jar].map(([name, value]) => ({ name, value, domain: host, path: "/", httpOnly: false, secure: false, sameSite: "Lax" })),
  };
}

async function visit(page, baseUrl, spec, collector) {
  const result = { path: spec.path, status: 0, errors: [], pageErrors: [], failedRequests: [], badResponses: [], cspViolations: [] };
  collector.current = result;
  try {
    const response = await page.goto(`${baseUrl}${spec.path}`, { waitUntil: "networkidle", timeout: 25000 });
    result.status = response ? response.status() : 0;
    if (spec.after) await spec.after(page);
    await page.waitForTimeout(250);
  } catch (err) {
    result.errors.push(`navigation: ${String(err.message).split("\n")[0]}`);
  }
  collector.current = null;
  result.problems = judge(result, spec.expectStatus);
  result.verdict = result.problems.length ? "FAIL" : "PASS";
  return result;
}

function attachListeners(page, baseUrl, supabaseUrl, collector) {
  const own = new URL(baseUrl).origin;
  const sb = new URL(supabaseUrl).origin;
  page.on("console", (msg) => {
    const r = collector.current;
    if (!r || msg.type() !== "error") return;
    const text = msg.text();
    // The browser logs a 4xx/5xx resource load as a console error; we track those precisely via `response`.
    if (/Failed to load resource: the server responded with a status of (4|5)\d\d/.test(text)) return;
    if (/Content Security Policy|Content-Security-Policy/i.test(text)) r.cspViolations.push(text.slice(0, 240));
    else r.errors.push(text.slice(0, 240));
  });
  page.on("pageerror", (err) => collector.current?.pageErrors.push(String(err.message).slice(0, 240)));
  page.on("requestfailed", (req) => {
    const reason = req.failure()?.errorText;
    if (reason !== "net::ERR_ABORTED") collector.current?.failedRequests.push(`${req.method()} ${req.url().slice(0, 120)} (${reason})`);
  });
  page.on("response", (res) => {
    const u = res.url();
    if (res.status() >= 400 && (u.startsWith(own) || u.startsWith(sb))) {
      const isDocument = res.request().resourceType() === "document" && res.url() === page.url();
      // The page's own document status is judged separately (a 403 wall is expected for some URLs).
      if (!isDocument && !(res.request().resourceType() === "document")) {
        collector.current?.badResponses.push(`${res.status()} ${res.request().method()} ${u.slice(0, 120)}`);
      }
    }
  });
}

async function run() {
  const args = process.argv.slice(2);
  const baseUrl = (process.env.TEST_URL || "http://localhost:3009").replace(/\/+$/, "");
  const fileEnv = loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  const supabaseUrl = fileEnv.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const publishableKey = fileEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

  const guard = validateTarget({ baseUrl, supabaseUrl, args, env: { ...fileEnv, ...process.env } });
  if (!guard.ok) {
    console.error(guard.error);
    process.exit(2);
  }
  if (!publishableKey) {
    console.error("REFUSED: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing from .env.local");
    process.exit(2);
  }

  console.log("==================================================");
  console.log("  VROOMA REAL-BROWSER CONSOLE & CSP AUDIT (DEV)");
  console.log(`  App: ${baseUrl}   Supabase: ${extractRef(supabaseUrl)}`);
  console.log("==================================================\n");

  const browser = await chromium.launch({ headless: true });
  const all = [];
  let cspHeader = null;
  let cspReportOnly = false;

  const newContext = async (cookies) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    if (cookies?.length) await context.addCookies(cookies);
    // Capture CSP violations that never reach the console
    await context.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (e) => {
        (window.__cspViolations ||= []).push(`${e.violatedDirective} blocked ${e.blockedURI || "inline"}`);
      });
    });
    const page = await context.newPage();
    const collector = { current: null };
    attachListeners(page, baseUrl, supabaseUrl, collector);
    page.on("response", (res) => {
      if (!cspHeader && res.request().resourceType() === "document" && res.url().startsWith(baseUrl)) {
        const h = res.headers();
        if (h["content-security-policy"]) cspHeader = h["content-security-policy"];
        else if (h["content-security-policy-report-only"]) { cspHeader = h["content-security-policy-report-only"]; cspReportOnly = true; }
      }
    });
    return { context, page, collector };
  };

  const section = (title, rows) => {
    console.log(`\n### ${title}`);
    console.log("| Route | HTTP | console | page | CSP | failed req | bad resp | Verdict |");
    console.log("|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|");
    for (const r of rows) {
      console.log(`| ${r.path} | ${r.status} | ${r.errors.length} | ${r.pageErrors.length} | ${r.cspViolations.length} | ${r.failedRequests.length} | ${r.badResponses.length} | **${r.verdict}** |`);
      if (r.verdict === "FAIL") {
        for (const p of r.problems) console.log(`   -> ${p}`);
        for (const e of [...r.errors, ...r.pageErrors, ...r.cspViolations, ...r.failedRequests, ...r.badResponses].slice(0, 6)) console.log(`      ${e}`);
      }
    }
  };

  const flushCsp = async (page, result) => {
    try {
      const extra = await page.evaluate(() => window.__cspViolations || []);
      if (extra.length) {
        result.cspViolations.push(...extra);
        result.problems = judge(result);
        result.verdict = result.problems.length ? "FAIL" : "PASS";
      }
    } catch { /* page closed */ }
  };

  /* ---------------- Phase A: signed out ---------------- */
  if (!args.includes("--skip-public")) {
    const { context, page, collector } = await newContext();
    const rows = [];
    for (const p of PUBLIC_URLS) {
      const r = await visit(page, baseUrl, { path: p }, collector);
      await flushCsp(page, r);
      rows.push(r);
    }

    // Sign-in sheet
    rows.push(await visit(page, baseUrl, {
      path: "/",
      after: async (pg) => {
        await pg.getByRole("button", { name: /^sign in$/i }).first().click({ timeout: 8000 });
        await pg.getByRole("dialog").first().waitFor({ state: "visible", timeout: 8000 });
        await pg.keyboard.press("Escape");
      },
    }, collector).then(async (r) => { r.path = "/  [open + close sign-in sheet]"; await flushCsp(page, r); return r; }));

    // Chat widget (appears after scrolling 200px)
    rows.push(await visit(page, baseUrl, {
      path: "/",
      after: async (pg) => {
        await pg.evaluate(() => window.scrollTo(0, 600));
        await pg.getByRole("button", { name: /open vrooma live chat/i }).click({ timeout: 8000 });
        await pg.getByRole("button", { name: /send message/i }).waitFor({ state: "visible", timeout: 8000 });
        await pg.getByRole("button", { name: /close chat/i }).click();
      },
    }, collector).then(async (r) => { r.path = "/  [open + close chat widget]"; await flushCsp(page, r); return r; }));

    // Signed-out role walls
    for (const p of ["/dashboard", "/staff/leads", "/admin"]) {
      const r = await visit(page, baseUrl, { path: p, expectStatus: 200 }, collector);
      const landed = new URL(page.url()).pathname;
      if (!/sign-in/.test(landed)) { r.problems.push(`signed-out visit to ${p} did not redirect to sign-in (landed on ${landed})`); r.verdict = "FAIL"; }
      r.path = `${p}  [signed out -> sign-in redirect]`;
      rows.push(r);
    }
    section("Phase A: signed out (public pages, sign-in sheet, chat widget, redirects)", rows);
    all.push(...rows);
    await context.close();
  }

  /* ---------------- Phase B: signed in ---------------- */
  if (!args.includes("--public-only")) {
    const onlyPersonas = (args.find((a) => a.startsWith("--personas=")) || "").replace("--personas=", "").split(",").filter(Boolean);
    for (const [persona, plan] of Object.entries(PERSONA_PLAN)) {
      if (onlyPersonas.length && !onlyPersonas.includes(persona)) continue;
      let session;
      try {
        session = await sessionCookies(supabaseUrl, publishableKey, PERSONAS[persona], baseUrl);
      } catch (err) {
        console.log(`\n### Phase B: ${persona}\n   SKIPPED: ${err.message} (seed the dev users: node --experimental-strip-types scripts/seed-dev-users.ts)`);
        all.push({ path: `[${persona} sign-in]`, verdict: "FAIL", problems: [err.message], errors: [], pageErrors: [], cspViolations: [], failedRequests: [], badResponses: [], status: 0 });
        continue;
      }

      // Find a lead this persona can open (RLS-scoped, so consultants only see their own).
      let leadId = null;
      if (plan.urls.includes("{LEAD_DETAIL}")) {
        const { data } = await session.supabase.from("leads").select("id").order("created_at", { ascending: false }).limit(1);
        leadId = data?.[0]?.id ?? null;
      }

      const { context, page, collector } = await newContext(session.cookies);
      const rows = [];
      for (const raw of plan.urls) {
        if (raw === "{LEAD_DETAIL}") {
          if (!leadId) { rows.push({ path: "/staff/leads/[id]", status: 0, errors: [], pageErrors: [], cspViolations: [], failedRequests: [], badResponses: [], problems: ["no lead visible to this persona to open"], verdict: "FAIL" }); continue; }
          const r = await visit(page, baseUrl, { path: `/staff/leads/${leadId}` }, collector);
          r.path = "/staff/leads/[id]";
          await flushCsp(page, r);
          rows.push(r);
          continue;
        }
        const r = await visit(page, baseUrl, { path: raw }, collector);
        await flushCsp(page, r);
        rows.push(r);
      }
      for (const wall of plan.walls) {
        const r = await visit(page, baseUrl, { path: wall.path, expectStatus: wall.status }, collector);
        r.path = `${wall.path}  [wall: expect ${wall.status}]`;
        rows.push(r);
      }
      section(`Phase B: ${persona} (${PERSONAS[persona]})`, rows);
      all.push(...rows);
      await context.close();
    }
  }

  await browser.close();

  /* ---------------- CSP report ---------------- */
  const csp = analyzeCsp(cspHeader, cspReportOnly);
  console.log("\n### Content-Security-Policy");
  console.log(`- Mode: ${csp.mode}`);
  console.log(`- script-src: ${csp.scriptSrc || "(none)"}`);
  console.log(`- 'unsafe-inline' in script-src: ${csp.unsafeInline ? "YES" : "no"}   'unsafe-eval': ${csp.unsafeEval ? "YES" : "no"}   nonce/hash present: ${csp.nonceOrHash ? "yes" : "no"}`);
  console.log(`- Verdict: ${csp.verdict}`);

  console.log("\n### Manual steps (cannot be automated)");
  console.log("- Email OTP delivery to a real inbox (owner step).");

  const failed = all.filter((r) => r.verdict === "FAIL");
  console.log(`\nConsole audit complete: ${all.length - failed.length} passed, ${failed.length} failed out of ${all.length} checks.`);
  if (failed.length || (args.includes("--strict-csp") && csp.verdict.startsWith("WEAK"))) process.exit(1);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (invoked) {
  run().catch((err) => {
    console.error("Console check error:", err);
    process.exit(1);
  });
}
