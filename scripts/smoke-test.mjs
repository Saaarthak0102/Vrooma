#!/usr/bin/env node
/**
 * Vrooma Production Smoke Test Runner
 * Hits all critical public endpoints and APIs .
 */

const baseUrl = process.env.TEST_URL || "http://localhost:3000";

const endpoints = [
  { path: "/api/health", method: "GET", expectedStatus: 200, checkBody: (t) => t.includes("healthy") },
  { path: "/", method: "GET", expectedStatus: 200, checkBody: (t) => t.includes("Vrooma") },
  { path: "/cars", method: "GET", expectedStatus: 200, checkBody: (t) => t.includes("Model") },
  { path: "/used-cars", method: "GET", expectedStatus: 200, checkBody: (t) => t.includes("Certified") },
  { path: "/cars/model-h", method: "GET", expectedStatus: 200, checkBody: (t) => t.includes("Model H") },
  { path: "/used-cars/UC-1182", method: "GET", expectedStatus: 200, checkBody: (t) => t.includes("UC-1182") },
  { path: "/trade-in", method: "GET", expectedStatus: 200, checkBody: (t) => t.includes("Trade-In") },
  { path: "/emi-calculator", method: "GET", expectedStatus: 200, checkBody: (t) => t.includes("EMI") },
  { path: "/legal/data-rights", method: "GET", expectedStatus: 200, checkBody: (t) => t.includes("DPDP") },
  { path: "/legal/privacy", method: "GET", expectedStatus: 200, checkBody: (t) => t.includes("Privacy") },
  { path: "/robots.txt", method: "GET", expectedStatus: 200, checkBody: (t) => /user-agent/i.test(t) },
  { path: "/sitemap.xml", method: "GET", expectedStatus: 200, checkBody: (t) => t.includes("urlset") },
  {
    path: "/api/newsletter",
    method: "POST",
    expectedStatus: 400,
    body: JSON.stringify({ email: "invalid" }),
    headers: { "Content-Type": "application/json" },
  },
];

async function runSmokeTests() {
  console.log(`\n=== VROOMA PRODUCTION SMOKE TEST SUITE ===`);
  console.log(`Target Host: ${baseUrl}\n`);

  let passed = 0;
  let failed = 0;

  for (const ep of endpoints) {
    const url = `${baseUrl}${ep.path}`;
    const startTime = Date.now();

    try {
      const res = await fetch(url, {
        method: ep.method,
        headers: ep.headers,
        body: ep.body,
      });

      const elapsed = Date.now() - startTime;
      const text = await res.text();

      const statusMatch = res.status === ep.expectedStatus;
      const bodyMatch = ep.checkBody ? ep.checkBody(text) : true;

      if (statusMatch && bodyMatch) {
        console.log(`  ✓ [${ep.method}] ${ep.path} -> ${res.status} (${elapsed}ms)`);
        passed++;
      } else {
        console.error(`  ❌ [${ep.method}] ${ep.path} FAILED: Expected ${ep.expectedStatus}, got ${res.status}. Body check: ${bodyMatch}`);
        failed++;
      }
    } catch (err) {
      console.error(`  ❌ [${ep.method}] ${ep.path} CONNECTION ERROR: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed out of ${endpoints.length} checks.\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSmokeTests();

