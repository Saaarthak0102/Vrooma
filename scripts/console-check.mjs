#!/usr/bin/env node
/**
 * scripts/console-check.mjs
 *
 * Real-Browser Automated Console, Runtime Error & CSP Verification Runner.
 * Uses Playwright Chromium to navigate ~25 public and authenticated routes across
 * English and Hindi locales, asserting zero runtime JavaScript errors, zero unhandled
 * exceptions, and zero Content Security Policy (CSP) violations.
 */

import { chromium } from "playwright";

const baseUrl = process.env.TEST_URL || "http://localhost:3009";

const TARGET_URLS = [
  // Public Landing & Catalog
  "/en",
  "/hi",
  "/en/cars",
  "/hi/cars",
  "/en/cars/model-h",
  "/en/used-cars",
  "/hi/used-cars",
  "/en/used-cars/UC-1182",
  "/en/offers",
  "/en/showrooms",
  "/en/emi-calculator",
  "/en/trade-in",
  "/en/contact",
  "/en/about",
  "/en/legal/privacy",
  "/en/legal/terms",
  "/en/legal/data-rights",
  "/en/sign-in",
  "/en/sign-up",
  "/en/book/test-drive",
  "/en/book/service",
];

async function runConsoleCheck() {
  console.log("==================================================");
  console.log("   VROOMA REAL-BROWSER CONSOLE & CSP AUDIT");
  console.log(` Target Host: ${baseUrl}`);
  console.log("==================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  let cspMode = "Not Detected";
  let cspDirectives = "";

  const results = [];

  for (const path of TARGET_URLS) {
    const url = `${baseUrl}${path}`;
    const errors = [];
    const pageErrors = [];
    const failedRequests = [];
    const cspViolations = [];

    const consoleListener = (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === "error") {
        if (text.includes("Content-Security-Policy") || text.includes("CSP")) {
          cspViolations.push(text);
        } else {
          // Ignore non-fatal React hydration warnings or known benign logs
          errors.push(text);
        }
      }
    };

    const pageErrorListener = (err) => {
      pageErrors.push(err.message);
    };

    const reqFailedListener = (req) => {
      // Ignore aborts on cancelled navigation
      if (req.failure()?.errorText !== "net::ERR_ABORTED") {
        failedRequests.push(`${req.url()} (${req.failure()?.errorText})`);
      }
    };

    page.on("console", consoleListener);
    page.on("pageerror", pageErrorListener);
    page.on("requestfailed", reqFailedListener);

    try {
      const response = await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
      const status = response ? response.status() : 0;

      // Check CSP headers on first response
      if (cspMode === "Not Detected" && response) {
        const headers = response.headers();
        if (headers["content-security-policy"]) {
          cspMode = "Enforcing (Content-Security-Policy)";
          cspDirectives = headers["content-security-policy"];
        } else if (headers["content-security-policy-report-only"]) {
          cspMode = "Report-Only (Content-Security-Policy-Report-Only)";
          cspDirectives = headers["content-security-policy-report-only"];
        }
      }

      const isClean = errors.length === 0 && pageErrors.length === 0 && cspViolations.length === 0;

      results.push({
        path,
        status,
        errors,
        pageErrors,
        failedRequests,
        cspViolations,
        verdict: isClean ? "PASS" : "FAIL",
      });
    } catch (err) {
      results.push({
        path,
        status: 500,
        errors: [err.message],
        pageErrors: [],
        failedRequests: [],
        cspViolations: [],
        verdict: "FAIL",
      });
    } finally {
      page.off("console", consoleListener);
      page.off("pageerror", pageErrorListener);
      page.off("requestfailed", reqFailedListener);
    }
  }

  await browser.close();

  // Print Output Table
  console.log(`Active CSP Policy Mode: ${cspMode}`);
  if (cspDirectives) {
    console.log(`Policy directives: ${cspDirectives.slice(0, 120)}...\n`);
  }

  console.log("| Route | Status | Console Errors | Page Errors | CSP Violations | Verdict |");
  console.log("|---|:---:|:---:|:---:|:---:|:---:|");

  let totalFailures = 0;
  for (const r of results) {
    if (r.verdict === "FAIL") totalFailures++;
    console.log(
      `| ${r.path} | ${r.status} | ${r.errors.length} | ${r.pageErrors.length} | ${r.cspViolations.length} | **${r.verdict}** |`
    );
    if (r.verdict === "FAIL") {
      if (r.errors.length) console.log(`   -> Errors: ${r.errors.join("; ")}`);
      if (r.cspViolations.length) console.log(`   -> CSP Violations: ${r.cspViolations.join("; ")}`);
    }
  }

  console.log(`\nConsole Audit Complete: ${results.length - totalFailures} passed, ${totalFailures} failed out of ${results.length} URLs.`);
  if (totalFailures > 0) {
    process.exit(1);
  }
}

runConsoleCheck().catch((err) => {
  console.error("Console check error:", err);
  process.exit(1);
});

