// End-to-end proof of the link-only sign-up flow (DEV only; creates and deletes one throw-away user).
// Needs a running app whose NEXT_PUBLIC_SITE_URL equals TEST_URL (default http://localhost:3009).
// Usage: TEST_URL=http://localhost:3009 node scripts/e2e-signup-link.mjs
import fs from "node:fs";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}
if (!/eobtzcwinjmimzisypca/.test(env.NEXT_PUBLIC_SUPABASE_URL)) throw new Error("REFUSED: not the DEV project");
const BASE = (process.env.TEST_URL || "http://localhost:3009").replace(/\/+$/, "");
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const email = `signup-e2e-${Date.now()}@vrooma.test`;
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`); };

const { data: gen, error: genErr } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
  options: { data: { full_name: "E2E Link Tester", phone: "+919812345678", city_id: "city-kanpur" } },
});
if (genErr) throw genErr;
const tokenHash = gen.properties.hashed_token;
const userId = gen.user.id;
const link = `${BASE}/auth/confirm?next=${encodeURIComponent("/dashboard")}&token_hash=${tokenHash}&type=${gen.properties.verification_type}`;

const browser = await chromium.launch({ headless: true });
try {
  // ---- 1. GET on the emailed link must NOT consume the token or create a session
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await pageA.goto(link, { waitUntil: "networkidle", timeout: 60000 });
  check("link lands on the confirm page", /\/verify-email/.test(pageA.url()), pageA.url().replace(tokenHash, "<token>"));
  const authCookies = (await ctxA.cookies()).filter((c) => /auth-token/.test(c.name));
  check("opening the link creates NO session (scanner-safe)", authCookies.length === 0);
  check("confirm button is shown", await pageA.getByRole("button", { name: /confirm my email/i }).isVisible());

  // A mail scanner fetching the link must not burn the token either
  const scan = await fetch(link, { redirect: "manual" });
  check("a scanner GET only redirects", scan.status >= 300 && scan.status < 400);

  // ---- 2. Press the button -> onboarding, prefilled, consents unticked
  await pageA.getByRole("button", { name: /confirm my email/i }).click();
  await pageA.waitForURL(/\/onboarding/, { timeout: 60000 });
  check("after confirming the user lands on onboarding", /\/onboarding/.test(pageA.url()), new URL(pageA.url()).pathname + new URL(pageA.url()).search);
  await pageA.waitForLoadState("networkidle");
  await pageA.waitForTimeout(1500);
  const name = await pageA.getByPlaceholder("e.g. Aditya Mishra").inputValue();
  let phone = ""; for (let i = 0; i < 20 && !phone; i++) { phone = await pageA.getByPlaceholder("98765 43210").inputValue(); if (!phone) await pageA.waitForTimeout(500); }
  check("onboarding name is prefilled", name === "E2E Link Tester", name);
  check("onboarding phone is prefilled", phone.replace(/\D/g, "").endsWith("9812345678"), phone);
  for (const id of ["onboard-terms", "onboard-service", "onboard-marketing"]) {
    const state = await pageA.locator(`#${id}`).getAttribute("data-state");
    check(`consent ${id} starts unticked`, state === "unchecked", String(state));
  }
  await ctxA.close();

  // ---- 3. Reusing the same link must fail with a clear message
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await pageB.goto(link, { waitUntil: "networkidle", timeout: 60000 });
  await pageB.getByRole("button", { name: /confirm my email/i }).click();
  await pageB.getByText(/can.t be used/i).waitFor({ timeout: 30000 });
  check("a used link shows 'can't be used' with a way to get a new one", await pageB.getByRole("link", { name: /new verification link/i }).isVisible());
  await ctxB.close();

  // ---- 4. Garbage link
  const ctxC = await browser.newContext();
  const pageC = await ctxC.newPage();
  await pageC.goto(`${BASE}/auth/confirm?type=signup`, { waitUntil: "networkidle", timeout: 60000 });
  check("a link with no token goes to sign-in with invalid_link", /sign-in/.test(pageC.url()) && /invalid_link/.test(pageC.url()), pageC.url());
  await ctxC.close();
} finally {
  await browser.close();
  const { error } = await admin.auth.admin.deleteUser(userId);
  console.log(error ? `cleanup FAILED for ${email}: ${error.message}` : `cleanup ok: deleted ${email}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
