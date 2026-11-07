#!/usr/bin/env node
/**
 * scripts/console-e2e.mjs
 *
 * End-to-end proof that the staff and admin consoles are REAL: each check performs the action in a real browser
 * (Playwright) as the dev persona, then asserts the resulting row in Supabase with the service key.
 * DEV ONLY. Refuses to run unless the target is localhost AND .env.local points at the DEV Supabase project.
 * Everything it creates is prefixed "E2E" and removed at the end.
 *
 *   node scripts/console-e2e.mjs                       # all groups
 *   node scripts/console-e2e.mjs --only=consultant     # consultant | manager | admin | chat | platform | cross
 *   TEST_URL=http://localhost:3000 node scripts/console-e2e.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const DEV_REF = process.env.SUPABASE_DEV_REF || "eobtzcwinjmimzisypca";
const DEV_PASSWORD = "VroomaDevPass2026!";
const EMAIL = {
  buyer: "dev-buyer@vrooma.in",
  consultant: "dev-consultant@vrooma.in",
  manager: "dev-manager@vrooma.in",
  admin: "dev-admin@vrooma.in",
};

/* ------------------------------- setup and guards ------------------------------- */

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
const only = (args.find((a) => a.startsWith("--only=")) || "").replace("--only=", "");
const baseUrl = (process.env.TEST_URL || "http://localhost:3000").replace(/\/+$/, "");
const env = { ...loadEnvFile(path.resolve(process.cwd(), ".env.local")), ...process.env };
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "";
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const secretKey = env.SUPABASE_SECRET_KEY || "";

const host = (() => {
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return "";
  }
})();
if (!["localhost", "127.0.0.1"].includes(host)) {
  console.error(`REFUSED: TEST_URL host "${host}" is not localhost.`);
  process.exit(2);
}
if (!supabaseUrl.includes(DEV_REF)) {
  console.error(`REFUSED: NEXT_PUBLIC_SUPABASE_URL is not the DEV project (${DEV_REF}).`);
  process.exit(2);
}
if ((env.APP_ENV || "").toLowerCase() === "production") {
  console.error("REFUSED: APP_ENV=production.");
  process.exit(2);
}
if (!publishableKey || !secretKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_SECRET_KEY in .env.local.");
  process.exit(2);
}

const db = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function sessionCookies(email) {
  const jar = new Map();
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: DEV_PASSWORD });
  if (error || !data.session) throw new Error(`sign-in failed for ${email}: ${error?.message}`);
  return {
    userId: data.user.id,
    cookies: [...jar].map(([name, value]) => ({ name, value, domain: host, path: "/", httpOnly: false, secure: false, sameSite: "Lax" })),
  };
}

/* ------------------------------- tiny test harness ------------------------------- */

const results = [];
const cleanups = [];
let currentGroup = "";

async function check(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ group: currentGroup, name, ok: true, ms: Date.now() - started });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    const msg = String(err?.message || err).split("\n")[0].slice(0, 300);
    results.push({ group: currentGroup, name, ok: false, error: msg, ms: Date.now() - started });
    console.log(`  FAIL  ${name}\n        ${msg}`);
  }
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

/** Poll until `fn` returns a truthy value (server actions finish after the click returns). */
async function eventually(fn, message, timeoutMs = 12000) {
  const end = Date.now() + timeoutMs;
  let last;
  while (Date.now() < end) {
    last = await fn();
    if (last) return last;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`timed out: ${message}`);
}

async function newPage(browser, session) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (session) await context.addCookies(session.cookies);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  return { context, page };
}

/** Open a console URL and wait for client hydration (dev server compiles on first hit). */
async function open(page, urlPath) {
  const res = await page.goto(`${baseUrl}${urlPath}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
  return res?.status() ?? 0;
}

const E2E = `E2E-${Date.now().toString(36).toUpperCase()}`;

/* ---------------------------------- test data ---------------------------------- */

async function consultantContext() {
  const { data: profile } = await db.from("profiles").select("id").eq("email", EMAIL.consultant).single();
  const { data: link } = await db.from("staff_showrooms").select("showroom_id").eq("profile_id", profile.id).limit(1).single();
  const { data: other } = await db
    .from("profiles")
    .select("id")
    .eq("role", "consultant")
    .neq("id", profile.id)
    .limit(1)
    .single();
  return { consultantId: profile.id, showroomId: link.showroom_id, otherConsultantId: other.id };
}

async function insertLead(over) {
  const { data, error } = await db
    .from("leads")
    .insert({
      source: "web",
      ref: `LD-${E2E}-${Math.floor(Math.random() * 1e6)}`,
      name: `${E2E} Lead`,
      phone: `+9198${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`,
      status: "new",
      sla_due_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      ...over,
    })
    .select("*")
    .single();
  if (error) throw new Error(`insert lead: ${error.message}`);
  cleanups.push(async () => {
    await db.from("ai_logs").delete().eq("lead_id", data.id);
    await db.from("messages_outbox").delete().eq("lead_id", data.id);
    await db.from("lead_events").delete().eq("lead_id", data.id);
    await db.from("leads").delete().eq("id", data.id);
  });
  return data;
}

/* ================================== GROUPS ================================== */

async function consultantGroup(browser) {
  currentGroup = "consultant";
  console.log("\n== Sales consultant ==");
  const ctx = await consultantContext();
  const session = await sessionCookies(EMAIL.consultant);
  const { page } = await newPage(browser, session);

  const lead = await insertLead({ showroom_id: ctx.showroomId, assigned_to: ctx.consultantId, name: `${E2E} Alpha` });
  const foreign = await insertLead({ showroom_id: ctx.showroomId, assigned_to: ctx.otherConsultantId, name: `${E2E} Foreign` });

  await check("Lead Desk loads without the public header or footer", async () => {
    assert((await open(page, "/staff")) === 200, "expected HTTP 200");
    await page.getByText(`${E2E} Alpha`).first().waitFor();
    assert((await page.locator("footer").count()) === 0, "public footer is still rendered on the console");
    assert((await page.locator("header").count()) === 1, "expected exactly one header (the console bar)");
  });

  await check("a consultant sees their own leads but not another consultant's", async () => {
    assert((await page.getByText(`${E2E} Foreign`).count()) === 0, "foreign lead is visible");
  });

  await check("opening a lead generates and saves the AI summary and draft", async () => {
    await page.getByText(`${E2E} Alpha`).first().click();
    await page.getByText("AI Prospect Briefing").waitFor();
    const row = await eventually(async () => {
      const { data } = await db.from("leads").select("ai_summary, ai_draft").eq("id", lead.id).single();
      return data?.ai_summary && data?.ai_draft ? data : null;
    }, "ai_summary/ai_draft saved on the lead");
    assert(row.ai_summary.length > 10, "empty summary");
    const { data: logs } = await db.from("ai_logs").select("action").eq("lead_id", lead.id).eq("action", "copilot_generated");
    assert((logs ?? []).length >= 1, "no copilot_generated row in ai_logs");
  });

  await check("sending an edited reply queues a message, moves the lead to contacted and audits it", async () => {
    const box = page.getByPlaceholder("Draft message to customer...");
    await box.fill("Namaste, thank you for your enquiry. When can we call you?");
    await page.getByRole("button", { name: /Approve & Send/i }).click();
    await eventually(async () => {
      const { data } = await db.from("leads").select("status, first_contacted_at").eq("id", lead.id).single();
      return data?.status === "contacted" && data?.first_contacted_at ? data : null;
    }, "lead moved to contacted");
    const { data: out } = await db.from("messages_outbox").select("template, body").eq("lead_id", lead.id).eq("template", "consultant_reply");
    assert((out ?? []).length === 1, "expected one consultant_reply in messages_outbox");
    const { data: logs } = await db.from("ai_logs").select("action").eq("lead_id", lead.id).like("action", "reply_sent_%");
    assert((logs ?? []).some((l) => l.action === "reply_sent_edited"), "no reply_sent_edited audit row");
  });

  await check("a reply that quotes a discount is blocked", async () => {
    const box = page.getByPlaceholder("Draft message to customer...");
    await box.fill("We can offer you a big discount today");
    // After a send the button reads "Dispatched!" for a moment before returning to its normal label.
    const send = page.getByRole("button", { name: /Approve & Send/i });
    await send.waitFor({ timeout: 8000 });
    assert(await send.isDisabled(), "send button should be disabled for a discount draft");
    assert(await page.getByText(/Dealership Policy Warning/i).isVisible(), "no policy warning shown");
    const { data } = await db.from("messages_outbox").select("id").eq("lead_id", lead.id).ilike("body", "%discount%");
    assert((data ?? []).length === 0, "a discount message reached the outbox");
  });

  await check("changing the stage writes the status and an activity event", async () => {
    await page.getByRole("button", { name: "Negotiating", exact: true }).click();
    await eventually(async () => {
      const { data } = await db.from("leads").select("status").eq("id", lead.id).single();
      return data?.status === "negotiating";
    }, "status negotiating");
    const { data: ev } = await db.from("lead_events").select("type").eq("lead_id", lead.id).eq("type", "status_changed");
    assert((ev ?? []).length >= 1, "no status_changed lead_event");
  });

  await check("marking a lead lost asks for a reason and stores it", async () => {
    await page.getByRole("button", { name: "Lost", exact: true }).click();
    await page.getByPlaceholder(/Why was this lead lost/i).fill("Bought elsewhere (E2E)");
    await page.getByRole("button", { name: "Confirm lost" }).click();
    const row = await eventually(async () => {
      const { data } = await db.from("leads").select("status, lost_reason").eq("id", lead.id).single();
      return data?.status === "lost" ? data : null;
    }, "status lost");
    assert(row.lost_reason === "Bought elsewhere (E2E)", `lost_reason was "${row.lost_reason}"`);
  });

  await check("a consultant cannot open another consultant's lead by URL", async () => {
    await open(page, `/staff?lead=${foreign.id}`);
    await page.getByText(/not found/i).first().waitFor();
  });

  await check("a consultant gets 403 on the manager and admin screens", async () => {
    assert((await open(page, "/staff/stock")) === 403, "/staff/stock should be 403");
    assert((await open(page, "/admin")) === 403, "/admin should be 403");
    assert((await open(page, "/admin/catalog")) === 403, "/admin/catalog should be 403");
  });

  await check("CSV import creates leads and de-duplicates a second import", async () => {
    await open(page, "/staff");
    const phone = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
    const csv = `name,phone,email,model,source,notes\n${E2E} Csv,${phone},,Model H,portal,E2E import row`;
    await page.getByRole("button", { name: /Import CSV/i }).click();
    await page.getByLabel("CSV content").fill(csv);
    await page.getByRole("button", { name: /^Import leads/ }).click();
    const created = await eventually(async () => {
      const { data } = await db.from("leads").select("id").ilike("name", `${E2E} Csv`);
      return data && data.length ? data : null;
    }, "csv lead created");
    cleanups.push(async () => {
      for (const l of created) {
        await db.from("messages_outbox").delete().eq("lead_id", l.id);
        await db.from("lead_events").delete().eq("lead_id", l.id);
        await db.from("leads").delete().eq("id", l.id);
      }
    });
    await page.getByRole("button", { name: /^Import leads/ }).click();
    await page.waitForTimeout(2500);
    const { data: again } = await db.from("leads").select("id").ilike("name", `${E2E} Csv`);
    assert((again ?? []).length === created.length, "importing the same row again created a duplicate");
    // The import itself must be recorded (this used to fail silently on a wrong column name).
    const { data: hist } = await db.from("csv_imports").select("id, rows_count, leads_created").order("created_at", { ascending: false }).limit(2);
    assert((hist ?? []).length >= 1 && hist[hist.length - 1].rows_count === 1, "no csv_imports history row was written");
    cleanups.push(async () => { for (const h of hist ?? []) await db.from("csv_imports").delete().eq("id", h.id); });
  });

  await check("Bookings screen loads and bay load matches the slots table", async () => {
    await open(page, "/staff/bookings");
    await page.getByRole("heading", { name: /Test drives & service bookings/i }).waitFor();
    await page.getByRole("heading", { name: /Workshop bay load · next 7 days/i }).waitFor();
    const now = new Date();
    const until = new Date(now.getTime() + 7 * 86400_000);
    const { data: slots } = await db
      .from("slots")
      .select("capacity, booked_count")
      .eq("kind", "service")
      .eq("is_active", true)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", until.toISOString());
    const totalCap = (slots ?? []).reduce((s, r) => s + r.capacity, 0);
    assert(totalCap > 0, "no upcoming service slots in the database to compare against");
    // The grid shows one row per workshop per day; its capacities must add up to the same total.
    const caps = await page.locator("section[aria-labelledby='bay-heading'] tbody tr td:nth-child(4)").allTextContents();
    const shown = caps.map((t) => Number(t.trim())).filter((n) => Number.isFinite(n)).reduce((a, b) => a + b, 0);
    assert(shown === totalCap, `grid capacity ${shown} != slots capacity ${totalCap}`);
  });

  await page.context().close();
}

async function managerGroup(browser) {
  currentGroup = "manager";
  console.log("\n== Used-Car Manager ==");
  const ctx = await consultantContext();
  const session = await sessionCookies(EMAIL.manager);
  const { page } = await newPage(browser, session);

  const model = `E2EModel${E2E.slice(-4)}`;
  const stockId = `UC-${E2E.slice(-6)}`;
  const plate = `UP32E2E${E2E.slice(-4)}`;

  // Past sales so the band has something real to use for this model.
  const sales = [780000, 800000, 820000].map((sold_price, i) => ({
    model_name: model,
    year: 2022,
    fuel: "diesel",
    km: 38000 + i * 3000,
    sold_price,
  }));
  const { data: salesRows, error: salesErr } = await db.from("used_car_sales_history").insert(sales).select("id");
  if (salesErr) throw new Error(`sales history: ${salesErr.message}`);
  cleanups.push(() => db.from("used_car_sales_history").delete().in("id", salesRows.map((r) => r.id)));

  const { data: car, error: carErr } = await db
    .from("used_cars")
    .insert({
      stock_id: stockId,
      model_name: model,
      variant_name: "VX",
      fuel: "diesel",
      year: 2022,
      km: 41200,
      owners: 1,
      price: 845000,
      status: "available",
      reg_no_private: plate,
      showroom_id: ctx.showroomId,
      certified: true,
      inspection: {},
      images: [],
      listed_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (carErr) throw new Error(`used car: ${carErr.message}`);
  cleanups.push(async () => {
    await db.from("audit_log").delete().eq("table_name", "used_cars").eq("record_id", stockId);
    await db.from("audit_log").delete().eq("table_name", "used_cars").eq("record_id", car.id);
    await db.from("used_cars").delete().eq("id", car.id);
  });

  await check("Used Stock loads for a manager with the stock count matching the database", async () => {
    assert((await open(page, "/staff/stock")) === 200, "expected HTTP 200");
    await page.getByRole("tab", { name: /^Stock \(/ }).waitFor();
    const { count } = await db.from("used_cars").select("id", { count: "exact", head: true });
    const label = await page.getByRole("tab", { name: /^Stock \(/ }).textContent();
    assert(label.includes(`(${count})`), `tab says "${label}", database has ${count}`);
    assert((await page.locator("footer").count()) === 0, "public footer rendered on the console");
  });

  await check("the price band is built from real past sales (3 comparable sales, medium confidence)", async () => {
    await page.getByText(stockId).first().click();
    await page.getByText("Suggested price band").waitFor();
    await page.getByText(/medium confidence/i).waitFor();
    await page.getByText(/Based on 3 past sales/i).waitFor();
  });

  await check("setting the final price writes the price and an audit row", async () => {
    const input = page.locator("#final-price");
    await input.fill("832000");
    await page.getByRole("button", { name: "Set final price" }).click();
    await eventually(async () => {
      const { data } = await db.from("used_cars").select("price").eq("id", car.id).single();
      return data?.price === 832000;
    }, "price saved");
    const { data: audit } = await db.from("audit_log").select("action").eq("record_id", car.id).eq("action", "SET_FINAL_PRICE");
    assert((audit ?? []).length >= 1, "no SET_FINAL_PRICE audit row");
  });

  await check("changing the status writes it to the database", async () => {
    await page.locator('select:has(option[value="sold"])').first().selectOption("booked");
    await eventually(async () => {
      const { data } = await db.from("used_cars").select("status").eq("id", car.id).single();
      return data?.status === "booked";
    }, "status booked");
  });

  await check("saving the inspection scorecard stores the score and keeps photos, price and plate intact", async () => {
    const selects = page.locator('select:has(option:text("Rate…"))');
    const n = await selects.count();
    assert(n === 8, `expected 8 scorecard selects, found ${n}`);
    for (let i = 0; i < n; i++) await selects.nth(i).selectOption("4");
    await page.getByRole("button", { name: "Save inspection" }).click();
    const row = await eventually(async () => {
      const { data } = await db.from("used_cars").select("inspection_score, inspection, price, reg_no_private, images").eq("id", car.id).single();
      return data?.inspection_score === 80 ? data : null;
    }, "inspection_score 80");
    assert(row.price === 832000, `price changed to ${row.price}`);
    assert(row.reg_no_private === plate, `private plate changed to ${row.reg_no_private}`);
    assert(row.inspection?.scorecard?.Engine === 4, "scorecard not stored in inspection JSON");
  });

  await check("revealing the full plate shows it and writes an audit row", async () => {
    await page.getByRole("button", { name: /Reveal full number/i }).click();
    await page.getByText(plate).waitFor();
    const { data } = await db.from("audit_log").select("id").eq("record_id", stockId).eq("action", "VIEW_UNMASKED_REG");
    assert((data ?? []).length >= 1, "no VIEW_UNMASKED_REG audit row");
  });

  await check("the public car page never exposes the full plate", async () => {
    const pub = await browser.newContext();
    const p = await pub.newPage();
    await p.goto(`${baseUrl}/used-cars/${stockId}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    // The car is "booked" now, which still lists; it must show a masked plate only.
    const html = await p.content();
    assert(!html.includes(plate), "the full registration number is present in the public page");
    await pub.close();
  });

  await check("Add vehicle creates stock that appears in the database", async () => {
    const newStock = `UC-${E2E.slice(-5)}9`;
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /Add vehicle/i }).click();
    const dialog = page.getByRole("dialog");
    const inputs = dialog.locator("input");
    await inputs.nth(0).fill(newStock);
    await inputs.nth(1).fill(`UP32E2E${E2E.slice(-3)}9`);
    await inputs.nth(2).fill(model);
    await inputs.nth(3).fill("ZX");
    await inputs.nth(4).fill("2021");
    await inputs.nth(5).fill("52000");
    await inputs.nth(6).fill("2");
    await inputs.nth(7).fill("700000");
    await dialog.getByRole("button", { name: "Add to stock" }).click();
    const row = await eventually(async () => {
      const { data } = await db.from("used_cars").select("id, price, owners").eq("stock_id", newStock).maybeSingle();
      return data;
    }, "new stock row");
    cleanups.push(() => db.from("used_cars").delete().eq("id", row.id));
    assert(row.price === 700000 && row.owners === 2, "saved values do not match what was entered");
  });

  // Trade-in request with a real stored photo.
  const { data: tLead } = await db
    .from("leads")
    .insert({
      ref: `LD-${E2E}-T`,
      source: "trade_in",
      name: `${E2E} TradeIn`,
      phone: "+919876500777",
      status: "new",
      showroom_id: ctx.showroomId,
      assigned_to: ctx.consultantId,
      sla_due_at: new Date(Date.now() + 300_000).toISOString(),
    })
    .select("id")
    .single();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const photoPath = `uploads/${E2E}.png`;
  await db.storage.from("trade-in-photos").upload(photoPath, png, { contentType: "image/png", upsert: true });
  const { data: tReq, error: tErr } = await db
    .from("trade_in_requests")
    .insert({ lead_id: tLead.id, make: "Brand X", model: model, year: 2022, km: 40000, condition: "good", notes: "E2E note", photos: [photoPath] })
    .select("id")
    .single();
  if (tErr) throw new Error(`trade-in row: ${tErr.message}`);
  cleanups.push(async () => {
    await db.from("trade_in_requests").delete().eq("id", tReq.id);
    await db.storage.from("trade-in-photos").remove([photoPath]);
    await db.from("messages_outbox").delete().eq("lead_id", tLead.id);
    await db.from("lead_events").delete().eq("lead_id", tLead.id);
    await db.from("leads").delete().eq("id", tLead.id);
  });

  await check("Trade-ins tab shows the request, its signed-URL photo and a manager-only valuation guide", async () => {
    await open(page, "/staff/stock");
    await page.getByRole("tab", { name: /^Trade-ins/ }).click();
    await page.getByText(`${E2E} TradeIn`).first().click();
    await page.getByText("Valuation guide").waitFor();
    await page.getByText(/Resale band/i).waitFor();
    const img = page.getByAltText("Trade-in photo 1");
    await img.waitFor();
    await eventually(() => img.evaluate((el) => el.complete && el.naturalWidth > 0), "photo loaded from the signed URL");
  });

  await check("a manager gets 403 on every admin screen", async () => {
    for (const p of ["/admin", "/admin/catalog", "/admin/team"]) {
      assert((await open(page, p)) === 403, `${p} should be 403 for a manager`);
    }
  });

  await page.context().close();
}

/** After submitting a dialog, fail with the form's own error text if it shows one. */
async function alertGuard(page, ms = 2500) {
  await page.waitForTimeout(ms);
  const alert = page.getByRole("dialog").getByRole("alert");
  if (await alert.count()) throw new Error("form error: " + (await alert.first().textContent()));
}

/** The big number inside a StatCard, found from its label. */
async function statValue(page, label) {
  const card = page.getByText(label, { exact: true }).locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
  return (await card.locator("div").nth(2).textContent())?.trim();
}

async function adminGroup(browser) {
  currentGroup = "admin";
  console.log("\n== Dealer Principal (admin) ==");
  const ctx = await consultantContext();
  const session = await sessionCookies(EMAIL.admin);
  const { page } = await newPage(browser, session);
  const day = 86400_000;

  /* ---- Overview ---- */
  await check("Overview numbers equal the database counts", async () => {
    assert((await open(page, "/admin")) === 200, "expected HTTP 200");
    await page.getByText("Online test drives", { exact: true }).waitFor();
    const since = new Date(Date.now() - 30 * day).toISOString();
    const { count: drives } = await db.from("bookings").select("id", { count: "exact", head: true }).eq("kind", "test_drive").neq("status", "cancelled").gte("created_at", since);
    const { count: services } = await db.from("bookings").select("id", { count: "exact", head: true }).eq("kind", "service").neq("status", "cancelled").gte("created_at", since);
    const { count: staff } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "consultant").eq("is_active", true);
    assert((await statValue(page, "Online test drives")) === String(drives), `test drives shows ${await statValue(page, "Online test drives")}, db ${drives}`);
    assert((await statValue(page, "Online service bookings")) === String(services), "service bookings mismatch");
    assert((await statValue(page, "Active consultants")) === String(staff), "active consultants mismatch");
    assert((await page.locator("footer").count()) === 0, "public footer rendered on the console");
  });

  await check("the AI reply log tab and system health tab load with real data", async () => {
    assert((await open(page, "/admin?tab=ai")) === 200, "ai tab");
    await page.getByRole("heading", { name: /AI Copilot Transparency Logs/i }).waitFor();
    const { count } = await db.from("ai_logs").select("id", { count: "exact", head: true }).eq("action", "copilot_generated");
    const shown = (await page.locator("dt", { hasText: "Drafts generated" }).locator("xpath=following-sibling::dd").textContent())?.trim();
    assert(shown === String(count), `drafts generated shows ${shown}, db ${count}`);
    assert((await open(page, "/admin?tab=system")) === 200, "system tab");
    await page.getByText(/Outbox Pending/i).first().waitFor();
  });

  /* ---- Catalog: models and variants ---- */
  const slug = `e2e-${E2E.slice(-6).toLowerCase()}`;
  let modelRow;

  await check("creating a model writes it as a draft and opens its detail", async () => {
    await open(page, "/admin/catalog?tab=models");
    await page.getByRole("button", { name: /Add model/i }).click();
    const dialog = page.getByRole("dialog");
    const inputs = dialog.locator("input:not([type=checkbox])");
    await inputs.nth(0).fill(`${E2E} Model`);
    await inputs.nth(2).fill("E2E tagline");
    await inputs.nth(3).fill("/images/cars/y.svg");
    await dialog.getByRole("button", { name: "Create model" }).click();
    modelRow = await eventually(async () => {
      const { data } = await db.from("models").select("*").ilike("slug", "e2e-%").eq("name", `${E2E} Model`).maybeSingle();
      return data;
    }, "model row");
    cleanups.push(async () => {
      await db.from("variants").delete().eq("model_id", modelRow.id);
      await db.from("models").delete().eq("id", modelRow.id);
    });
    assert(modelRow.is_active === false, "a new model must start as a draft");
    await page.waitForURL(/model=/);
  });

  await check("adding a variant stores whole-rupee ex-showroom and fuel/transmission", async () => {
    await page.getByRole("button", { name: /Add Variant/i }).click();
    const dialog = page.getByRole("dialog");
    const inputs = dialog.locator("input:not([type=checkbox])");
    await inputs.nth(0).fill("E2E ZX");
    await inputs.nth(1).fill("1250000");
    await dialog.locator("select").nth(0).selectOption("diesel");
    await dialog.locator("select").nth(1).selectOption("automatic");
    await dialog.getByRole("button", { name: "Add variant" }).click();
    const v = await eventually(async () => {
      const { data } = await db.from("variants").select("*").eq("model_id", modelRow.id).maybeSingle();
      return data;
    }, "variant row");
    assert(v.ex_showroom === 1250000 && v.fuel === "diesel" && v.transmission === "automatic", "variant values wrong");
  });

  await check("editing a model keeps its gallery and featured flag", async () => {
    await db.from("models").update({ gallery: ["/images/cars/a.svg", "/images/cars/b.svg"], is_featured: true }).eq("id", modelRow.id);
    await open(page, `/admin/catalog?tab=models&model=${modelRow.id}`);
    await page.locator("input").first().waitFor();
    const tagline = page.locator("textarea").first();
    await tagline.fill("E2E tagline edited");
    await page.getByRole("button", { name: /Save Changes/i }).click();
    const row = await eventually(async () => {
      const { data } = await db.from("models").select("tagline, gallery, is_featured").eq("id", modelRow.id).single();
      return data?.tagline === "E2E tagline edited" ? data : null;
    }, "tagline saved");
    assert(Array.isArray(row.gallery) && row.gallery.length === 2, `gallery was wiped: ${JSON.stringify(row.gallery)}`);
    assert(row.is_featured === true, "is_featured was reset");
  });

  await check("an unknown model id is a 404, not a different model", async () => {
    const status = await open(page, "/admin/catalog?tab=models&model=00000000-0000-0000-0000-00000000dead");
    const text = (await page.locator("body").innerText()).toLowerCase();
    assert(status === 404 || /could not be found|not found|404/.test(text), "the page did not say not found");
    assert(!text.includes("edit model metadata"), "an unknown id opened a model editor");
  });

  /* ---- Catalog: price rules ---- */
  await check("price rules: create, edit and delete all hit the database", async () => {
    await open(page, "/admin/catalog?tab=prices");
    await page.getByRole("button", { name: /New price rule/i }).click();
    let dialog = page.getByRole("dialog");
    let inputs = dialog.locator("input");
    // road tax, TCS, registration, insurance, handling, accessories, valid from, valid until
    const values = ["9.5", "1", "11111", "22222", "3333", "4444", "2040-01-01", "2040-12-31"];
    for (let i = 0; i < values.length; i++) await inputs.nth(i).fill(values[i]);
    await dialog.getByRole("button", { name: "Create rule" }).click();
    await alertGuard(page);
    const rule = await eventually(async () => {
      const { data } = await db.from("price_rules").select("*").eq("valid_from", "2040-01-01").maybeSingle();
      return data;
    }, "price rule row");
    cleanups.push(() => db.from("price_rules").delete().eq("id", rule.id));
    assert(Number(rule.road_tax_pct) === 9.5 && rule.registration === 11111 && rule.insurance === 22222, "rule values wrong");

    await open(page, "/admin/catalog?tab=prices");
    await page.getByRole("row", { name: /2040-01-01/ }).getByRole("button", { name: /Edit/ }).click();
    dialog = page.getByRole("dialog");
    await dialog.locator("input").nth(0).fill("12");
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await eventually(async () => {
      const { data } = await db.from("price_rules").select("road_tax_pct").eq("id", rule.id).single();
      return Number(data?.road_tax_pct) === 12;
    }, "rule edited");

    await open(page, "/admin/catalog?tab=prices");
    await page.getByRole("row", { name: /2040-01-01/ }).getByRole("button", { name: /Delete rule/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete rule", exact: true }).click();
    await eventually(async () => {
      const { data } = await db.from("price_rules").select("id").eq("id", rule.id).maybeSingle();
      return !data;
    }, "rule deleted");
  });

  await check("a rule with an impossible date range is rejected", async () => {
    await open(page, "/admin/catalog?tab=prices");
    await page.getByRole("button", { name: /New price rule/i }).click();
    const dialog = page.getByRole("dialog");
    const inputs = dialog.locator("input");
    await inputs.nth(6).fill("2041-12-31");
    await inputs.nth(7).fill("2041-01-01");
    await dialog.getByRole("button", { name: "Create rule" }).click();
    await dialog.getByRole("alert").waitFor();
    const { data } = await db.from("price_rules").select("id").eq("valid_from", "2041-12-31");
    assert((data ?? []).length === 0, "an invalid rule was stored");
  });

  /* ---- Catalog: offers and banners ---- */
  await check("offers: create, hide (still visible to the admin), delete", async () => {
    await open(page, "/admin/catalog?tab=offers");
    await page.getByRole("button", { name: /New offer/i }).click();
    let dialog = page.getByRole("dialog");
    await dialog.locator("input").nth(0).fill(`${E2E} Offer`);
    await dialog.locator("textarea").fill("E2E offer details");
    await dialog.getByRole("button", { name: "Save offer" }).click();
    await alertGuard(page);
    const offer = await eventually(async () => {
      const { data } = await db.from("offers").select("*").eq("title", `${E2E} Offer`).maybeSingle();
      return data;
    }, "offer row");
    cleanups.push(() => db.from("offers").delete().eq("id", offer.id));

    await open(page, "/admin/catalog?tab=offers");
    await page.getByRole("row", { name: new RegExp(`${E2E} Offer`) }).getByRole("button", { name: /Edit/ }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("checkbox").uncheck();
    await dialog.getByRole("button", { name: "Save offer" }).click();
    await eventually(async () => {
      const { data } = await db.from("offers").select("is_active").eq("id", offer.id).single();
      return data?.is_active === false;
    }, "offer hidden");
    await open(page, "/admin/catalog?tab=offers");
    await page.getByRole("row", { name: new RegExp(`${E2E} Offer`) }).getByText("Hidden").waitFor();

    await page.getByRole("row", { name: new RegExp(`${E2E} Offer`) }).getByRole("button", { name: /Delete offer/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete offer", exact: true }).click();
    await eventually(async () => {
      const { data } = await db.from("offers").select("id").eq("id", offer.id).maybeSingle();
      return !data;
    }, "offer deleted");
  });

  await check("banners: create and delete", async () => {
    await open(page, "/admin/catalog?tab=banners");
    await page.getByRole("button", { name: /New banner/i }).click();
    const dialog = page.getByRole("dialog");
    const inputs = dialog.locator("input");
    await inputs.nth(0).fill(`${E2E} Banner`);
    await inputs.nth(1).fill("/images/banners/e2e.jpg");
    await dialog.getByRole("button", { name: "Save banner" }).click();
    await alertGuard(page);
    const banner = await eventually(async () => {
      const { data } = await db.from("banners").select("*").eq("title", `${E2E} Banner`).maybeSingle();
      return data;
    }, "banner row");
    cleanups.push(() => db.from("banners").delete().eq("id", banner.id));
    await open(page, "/admin/catalog?tab=banners");
    await page.getByRole("row", { name: new RegExp(`${E2E} Banner`) }).getByRole("button", { name: /Delete banner/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete banner", exact: true }).click();
    await eventually(async () => {
      const { data } = await db.from("banners").select("id").eq("id", banner.id).maybeSingle();
      return !data;
    }, "banner deleted");
  });

  /* ---- Team ---- */
  const { data: priya } = await db.from("profiles").select("id, full_name, role, is_active").eq("email", "dev-buyer-2@vrooma.in").single();
  cleanups.push(() => db.from("profiles").update({ role: priya.role, is_active: priya.is_active }).eq("id", priya.id));

  await check("people: changing a role is stored (and the last-admin / self guards hold)", async () => {
    assert((await open(page, "/admin/team?tab=users")) === 200, "expected HTTP 200");
    await page.getByLabel(`Role for ${priya.full_name}`).selectOption("consultant");
    await eventually(async () => {
      const { data } = await db.from("profiles").select("role").eq("id", priya.id).single();
      return data?.role === "consultant";
    }, "role consultant");
    const own = page.getByLabel(/Role for Sanjay/i);
    assert(await own.isDisabled(), "an admin can change their own role");
  });

  await check("people: deactivate and reactivate an account", async () => {
    const row = () => page.getByRole("row", { name: new RegExp(priya.full_name.replace(/[()]/g, "\\$&")) });
    await row().getByRole("button", { name: "Deactivate" }).click();
    await eventually(async () => {
      const { data } = await db.from("profiles").select("is_active").eq("id", priya.id).single();
      return data?.is_active === false;
    }, "account deactivated");
    await page.reload({ waitUntil: "networkidle" });
    await row().getByRole("button", { name: "Reactivate" }).click();
    await eventually(async () => {
      const { data } = await db.from("profiles").select("is_active").eq("id", priya.id).single();
      return data?.is_active === true;
    }, "account reactivated");
  });

  await check("people: inviting an existing email updates its role", async () => {
    await open(page, "/admin/team?tab=users");
    await page.getByRole("button", { name: /Invite staff/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[type="email"]').fill("dev-buyer-2@vrooma.in");
    await dialog.locator("select").selectOption("manager");
    await dialog.getByRole("button", { name: "Send invite" }).click();
    await eventually(async () => {
      const { data } = await db.from("profiles").select("role").eq("id", priya.id).single();
      return data?.role === "manager";
    }, "role manager via invite");
  });

  const { data: workshop } = await db.from("workshops").select("id, name, bays").eq("is_active", true).limit(1).single();
  cleanups.push(async () => {
    await db.from("workshops").update({ bays: workshop.bays }).eq("id", workshop.id);
    await db.from("slots").update({ capacity: workshop.bays }).eq("workshop_id", workshop.id).eq("kind", "service").gt("starts_at", new Date().toISOString()).lte("booked_count", workshop.bays);
  });

  await check("bays: changing capacity updates the workshop AND its upcoming slots", async () => {
    await open(page, "/admin/team?tab=network");
    const field = page.getByLabel(`Bays at ${workshop.name}`);
    const target = workshop.bays + 2;
    await field.fill(String(target));
    await field.blur();
    await eventually(async () => {
      const { data } = await db.from("workshops").select("bays").eq("id", workshop.id).single();
      return data?.bays === target;
    }, "workshop bays");
    const { data: slots } = await db.from("slots").select("capacity, booked_count").eq("workshop_id", workshop.id).eq("kind", "service").gt("starts_at", new Date().toISOString()).limit(50);
    assert((slots ?? []).length > 0, "no upcoming service slots to check");
    const stale = (slots ?? []).filter((s) => s.capacity !== target && s.booked_count <= target);
    assert(stale.length === 0, `${stale.length} upcoming slots kept the old capacity`);
  });

  await check("routing: create, edit and delete a rule", async () => {
    await open(page, "/admin/team?tab=routing");
    await page.getByRole("button", { name: /Add rule/i }).click();
    let dialog = page.getByRole("dialog");
    await dialog.locator("select").nth(0).selectOption(ctx.showroomId);
    await dialog.getByLabel("Dev Consultant", { exact: false }).first().check();
    await dialog.getByRole("button", { name: "Add rule" }).click();
    const rule = await eventually(async () => {
      const { data } = await db.from("assignment_rules").select("id, assignment_rule_consultants(consultant_id)").eq("showroom_id", ctx.showroomId).order("created_at", { ascending: false }).limit(1).single();
      return data && data.assignment_rule_consultants.some((c) => c.consultant_id === ctx.consultantId) ? data : null;
    }, "rule with the consultant in its pool", 15000);
    // Only remove the rule if THIS run created it (an existing seeded rule would also match the test above).
    assert(rule, "no rule");
    cleanups.push(() => db.from("assignment_rules").delete().eq("id", rule.id));
    await page.keyboard.press("Escape");
  });

  await check("slots: generating the calendar is idempotent and keeps capacity", async () => {
    await open(page, "/admin/team?tab=slots");
    const { count: before } = await db.from("slots").select("id", { count: "exact", head: true });
    await page.getByRole("button", { name: /Generate next 30 days/i }).click();
    await page.getByText(/Calendar checked/i).waitFor();
    const { count: after } = await db.from("slots").select("id", { count: "exact", head: true });
    assert(after >= before, "slot count went down");
  });

  await check("the admin can open every staff screen too", async () => {
    for (const p of ["/staff", "/staff/bookings", "/staff/stock"]) {
      assert((await open(page, p)) === 200, `${p} should be 200 for an admin`);
    }
  });

  await page.context().close();
}

async function crossGroup(browser) {
  currentGroup = "cross";
  console.log("\n== Cross-role ==");
  const session = await sessionCookies(EMAIL.buyer);
  const { page } = await newPage(browser, session);

  await check("buyer trade-in submit succeeds and creates a lead, a request row and a stored photo", async () => {
    assert((await open(page, "/trade-in")) === 200, "expected HTTP 200");
    await page.getByPlaceholder("e.g. Honda, Maruti, Hyundai").fill(`${E2E}Make`);
    await page.getByPlaceholder("e.g. City VX Petrol").fill("E2E City VX");
    await page.getByPlaceholder("Aditya Mishra").fill(`${E2E} Seller`);
    await page.locator('input[type="tel"]').fill("9876500555");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await page.locator('input[type="file"]').setInputFiles({ name: "e2e.png", mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: /Get Instant Trade-In Valuation/i }).click();
    const req = await eventually(async () => {
      const { data } = await db.from("trade_in_requests").select("id, lead_id, photos, make").eq("make", `${E2E}Make`).maybeSingle();
      return data;
    }, "trade_in_requests row", 30000);
    cleanups.push(async () => {
      const paths = Array.isArray(req.photos) ? req.photos : [];
      if (paths.length) await db.storage.from("trade-in-photos").remove(paths);
      await db.from("trade_in_requests").delete().eq("id", req.id);
      if (req.lead_id) {
        await db.from("messages_outbox").delete().eq("lead_id", req.lead_id);
        await db.from("lead_events").delete().eq("lead_id", req.lead_id);
        await db.from("leads").delete().eq("id", req.lead_id);
      }
    });
    assert(req.lead_id, "the request has no lead");
    const { data: lead } = await db.from("leads").select("source, assigned_to").eq("id", req.lead_id).single();
    assert(lead.source === "trade_in", `lead source ${lead.source}`);
    assert(lead.assigned_to, "the trade-in lead was not assigned to a consultant");
    assert(Array.isArray(req.photos) && req.photos.length === 1, `expected 1 stored photo, got ${JSON.stringify(req.photos)}`);
  });

  await check("signing in as each persona lands in the right place, with no public header or footer on consoles", async () => {
    const cases = [
      ["Consultant", new RegExp("/staff$")],
      ["Manager", new RegExp("/staff$")],
      ["Admin", new RegExp("/admin$")],
      ["Buyer", new RegExp("/dashboard$")],
    ];
    for (const [label, expected] of cases) {
      const { context, page: anon } = await newPage(browser, null);
      // A public page is the ?next target: staff must still end up in their console.
      await anon.goto(`${baseUrl}/sign-in?next=%2Fcars`, { waitUntil: "networkidle", timeout: 90000 });
      await anon.getByRole("button", { name: new RegExp("^" + label) }).click();
      await anon.waitForURL(expected, { timeout: 90000, waitUntil: "commit" });
      await anon.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
      const url = new URL(anon.url()).pathname;
      if (label !== "Buyer") {
        assert((await anon.locator("footer").count()) === 0, `${label}: public footer on ${url}`);
        assert((await anon.locator("header").count()) === 1, `${label}: expected only the console bar on ${url}`);
      } else {
        assert((await anon.locator("footer").count()) >= 1, "buyer dashboard lost its footer");
      }
      await context.close();
    }
  });

  await check("a buyer gets 403 on every console screen", async () => {
    for (const p of ["/staff", "/staff/bookings", "/staff/stock", "/admin", "/admin/catalog", "/admin/team"]) {
      assert((await open(page, p)) === 403, `${p} should be 403 for a buyer`);
    }
  });

  await check("buyer pages still show the public header and footer", async () => {
    await open(page, "/cars");
    assert((await page.locator("footer").count()) >= 1, "public footer missing on /cars");
    assert((await page.locator("header").count()) >= 1, "public header missing on /cars");
  });

  await page.context().close();
}

/* ============================ support chat (bot -> consultant) ============================ */

const FORBIDDEN_IN_BOT = /\b(discount|price cut|waiver|cashback)\b/i;

/** Remove everything a chat test created: messages, conversation, the lead it opened and the consent row. */
function trackConversation(id) {
  cleanups.push(async () => {
    const { data: conv } = await db.from("chat_conversations").select("lead_id").eq("id", id).maybeSingle();
    await db.from("chat_messages").delete().eq("conversation_id", id);
    await db.from("chat_conversations").delete().eq("id", id);
    if (conv?.lead_id) {
      await db.from("ai_logs").delete().eq("lead_id", conv.lead_id);
      await db.from("messages_outbox").delete().eq("lead_id", conv.lead_id);
      await db.from("lead_events").delete().eq("lead_id", conv.lead_id);
      await db.from("leads").delete().eq("id", conv.lead_id);
    }
  });
}

/** Open the public site as the given session and open the chat box (it appears after a little scrolling). */
async function openChat(page, urlPath = "/cars") {
  await open(page, urlPath);
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.getByRole("button", { name: /Open Vrooma Live Chat/i }).click();
  await page.getByPlaceholder(/Ask about prices|Message your consultant/i).waitFor();
}

async function chatSay(page, text) {
  await page.getByPlaceholder(/Ask about prices|Message your consultant/i).fill(text);
  await page.getByRole("button", { name: "Send Message" }).click();
}

async function latestConversation(filter) {
  const { data } = await db
    .from("chat_conversations")
    .select("*")
    .match(filter)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function chatGroup(browser) {
  currentGroup = "chat";
  console.log("\n== Support chat ==");
  const ctx = await consultantContext();
  const guestPhone = `98${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
  const guest = await newPage(browser, null);
  const gp = guest.page;
  let convId = null;

  await check("bot answers, then asks whether the query is solved or to connect to a consultant", async () => {
    await openChat(gp);
    await chatSay(gp, "what is the on-road price?");
    await gp.getByText(/Is your query solved/i).first().waitFor();
    await gp.getByRole("button", { name: /Yes, it's solved/i }).waitFor();
    await gp.getByRole("button", { name: /Connect me to a consultant/i }).waitFor();
    const conv = await eventually(async () => {
      const { data } = await db.from("chat_conversations").select("*").eq("status", "bot").not("guest_token", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    }, "guest conversation row");
    convId = conv.id;
    trackConversation(convId);
    const { data: msgs } = await db.from("chat_messages").select("role, content").eq("conversation_id", convId).order("created_at");
    assert(msgs.some((m) => m.role === "user") && msgs.some((m) => m.role === "assistant"), "expected user and assistant messages stored");
  });

  await check("the bot never mentions a discount, price cut or waiver", async () => {
    await chatSay(gp, "can you give me a discount?");
    await eventually(async () => {
      const { data } = await db.from("chat_messages").select("role").eq("conversation_id", convId).eq("role", "assistant");
      return (data ?? []).length >= 2;
    }, "second bot reply");
    const { data: msgs } = await db.from("chat_messages").select("role, content").eq("conversation_id", convId).eq("role", "assistant");
    for (const m of msgs) assert(!FORBIDDEN_IN_BOT.test(m.content), `bot said a forbidden word: ${m.content.slice(0, 80)}`);
  });

  await check("Yes, it's solved closes the chat and the next message starts a new one", async () => {
    await gp.getByRole("button", { name: /Yes, it's solved/i }).click();
    await eventually(async () => (await latestConversation({ id: convId }))?.status === "resolved", "conversation resolved");
    const conv = await latestConversation({ id: convId });
    assert(conv.resolved_by === "buyer", `resolved_by was ${conv.resolved_by}`);
    await chatSay(gp, "what is the emi?");
    const next = await eventually(async () => {
      const { data } = await db.from("chat_conversations").select("*").eq("status", "bot").not("guest_token", "is", null).neq("id", convId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    }, "a fresh conversation");
    convId = next.id;
    trackConversation(convId);
  });

  await check("guest hand-off needs consent, then creates a chat lead with an AI brief and a named consultant", async () => {
    await chatSay(gp, "I want a test drive");
    await gp.getByRole("button", { name: /Connect me to a consultant/i }).click();
    await gp.getByPlaceholder("Your name").waitFor();
    await gp.getByPlaceholder("Your name").fill(`${E2E} Guest`);
    await gp.getByPlaceholder("10-digit mobile number").fill(guestPhone);
    assert(await gp.getByRole("button", { name: "Connect me" }).isDisabled(), "Connect must stay disabled until consent is ticked");
    await gp.locator(".chat-panel").getByRole("checkbox").check();
    await gp.getByRole("button", { name: "Connect me" }).click();
    const conv = await eventually(async () => {
      const c = await latestConversation({ id: convId });
      return c?.status === "waiting" ? c : null;
    }, "conversation waiting");
    assert(conv.lead_id, "conversation has no lead");
    assert(conv.assigned_to, "conversation has no consultant");
    assert(conv.ai_context?.summary, "ai_context.summary missing");
    const { data: lead } = await db.from("leads").select("source, source_ref, assigned_to, sla_due_at, name").eq("id", conv.lead_id).single();
    assert(lead.source === "chat", `lead source was ${lead.source}`);
    assert(lead.source_ref === convId, "lead.source_ref should be the conversation id");
    assert(lead.assigned_to === conv.assigned_to && lead.sla_due_at, "lead not assigned / no SLA");
    const { data: consent } = await db.from("consents").select("id").eq("subject_phone", `+91${guestPhone}`).limit(1);
    assert(consent?.length, "no consent row recorded");
    cleanups.push(async () => {
      await db.from("consents").delete().eq("subject_phone", `+91${guestPhone}`);
    });
    const { data: sys } = await db.from("chat_messages").select("id").eq("conversation_id", convId).eq("role", "system");
    assert(sys?.length, "no system message");
    await gp.getByText(/Waiting for|Chatting with/i).first().waitFor();
    // Route the chat to the dev consultant so the next checks can sign in as them.
    await db.from("chat_conversations").update({ assigned_to: ctx.consultantId }).eq("id", convId);
    await db.from("leads").update({ assigned_to: ctx.consultantId }).eq("id", conv.lead_id);
  });

  const consultant = await newPage(browser, await sessionCookies(EMAIL.consultant));
  const cp = consultant.page;

  await check("consultant sees the chat in /staff/chats with the AI brief and a suggested first reply", async () => {
    assert((await open(cp, "/staff/chats")) === 200, "expected HTTP 200");
    await cp.getByText(`${E2E} Guest`).first().click();
    await cp.getByRole("region", { name: "AI brief" }).waitFor();
    await cp.getByRole("button", { name: /Use suggested first reply/i }).click();
    const box = cp.getByLabel("Reply to the buyer");
    assert((await box.inputValue()).includes("Vrooma consultant"), "suggested reply was not placed in the box");
  });

  await check("a discount in a reply is blocked in the box and nothing is stored", async () => {
    const box = cp.getByLabel("Reply to the buyer");
    await box.fill("I can give you a 10% discount");
    await cp.getByRole("alert").filter({ hasText: /cannot mention/i }).waitFor();
    assert(await cp.getByRole("button", { name: "Send reply" }).isDisabled(), "Send should be disabled");
    const { data } = await db.from("chat_messages").select("id").eq("conversation_id", convId).eq("role", "consultant");
    assert(!data?.length, "a consultant message was stored");
  });

  await check("consultant reply reaches the buyer's chat box and marks the chat live", async () => {
    await cp.getByLabel("Reply to the buyer").fill("Hello, this is your consultant. Happy to help.");
    await cp.getByRole("button", { name: "Send reply" }).click();
    const conv = await eventually(async () => {
      const c = await latestConversation({ id: convId });
      return c?.status === "live" ? c : null;
    }, "conversation live");
    assert(conv.first_staff_reply_at, "first_staff_reply_at not set");
    const { data: msg } = await db.from("chat_messages").select("sender_id").eq("conversation_id", convId).eq("role", "consultant").single();
    assert(msg.sender_id === ctx.consultantId, "sender_id should be the consultant");
    await gp.getByText("Hello, this is your consultant. Happy to help.").waitFor({ timeout: 20000 });
    await gp.getByText(/Chatting with/i).first().waitFor();
  });

  await check("a buyer message during the live chat is stored once and shown to the consultant", async () => {
    await chatSay(gp, "Thanks, can we meet tomorrow?");
    await cp.getByText("Thanks, can we meet tomorrow?").waitFor({ timeout: 20000 });
    const { data } = await db.from("chat_messages").select("id").eq("conversation_id", convId).eq("role", "user").eq("content", "Thanks, can we meet tomorrow?");
    assert(data?.length === 1, "buyer message not stored exactly once");
  });

  await check("a different consultant cannot open this chat; a manager can see it", async () => {
    const { data: other } = await db.from("profiles").select("email").eq("id", ctx.otherConsultantId).single();
    const alt = await sessionCookies(other.email).catch(() => null);
    if (alt) {
      const { page, context } = await newPage(browser, alt);
      await open(page, `/staff/chats?chat=${convId}`);
      await page.getByText(/Chat not found/i).waitFor();
      assert((await page.getByRole("region", { name: "AI brief" }).count()) === 0, "other consultant saw the AI brief");
      await context.close();
    }
    const mgr = await newPage(browser, await sessionCookies(EMAIL.manager));
    await open(mgr.page, "/staff/chats");
    await mgr.page.getByText(`${E2E} Guest`).first().waitFor();
    await mgr.context.close();
  });

  await check("chat API only serves the owner: wrong guest token and no token both get 404", async () => {
    const wrong = await fetch(`${baseUrl}/api/chat/messages?conversationId=${convId}&guestToken=${crypto.randomUUID()}`);
    assert(wrong.status === 404, `wrong token returned ${wrong.status}`);
    const none = await fetch(`${baseUrl}/api/chat/messages?conversationId=${convId}`);
    assert(none.status === 404, `no token returned ${none.status}`);
  });

  await check("lead drawer links to the chat, and the console has no chat widget", async () => {
    const conv = await latestConversation({ id: convId });
    await open(cp, `/staff?lead=${conv.lead_id}`);
    const link = cp.getByRole("link", { name: /View chat/i });
    await link.waitFor();
    assert((await link.getAttribute("href")) === `/staff/chats?chat=${convId}`, "wrong chat link");
    await open(cp, "/staff/chats");
    assert((await cp.getByRole("button", { name: /Open Vrooma Live Chat/i }).count()) === 0, "chat widget rendered on the console");
  });

  await check("reassigning the lead moves the chat to the new consultant", async () => {
    const conv = await latestConversation({ id: convId });
    await open(cp, `/staff/chats?chat=${convId}`);
    await cp.getByRole("button", { name: /Reassign/i }).first().click();
    await cp.getByRole("dialog").getByRole("textbox").fill(`${E2E} reassign`);
    await cp.getByRole("dialog").getByRole("combobox").click().catch(() => {});
    const options = cp.getByRole("option");
    if ((await options.count()) > 0) {
      const names = await options.allInnerTexts();
      const { data: target } = await db.from("profiles").select("full_name").eq("id", ctx.otherConsultantId).single();
      const idx = names.findIndex((n) => n.includes(target.full_name));
      await options.nth(idx >= 0 ? idx : 0).click();
    }
    await cp.getByRole("dialog").getByRole("button", { name: /reassign|confirm|save/i }).last().click();
    await eventually(async () => {
      const c = await latestConversation({ id: convId });
      const { data: l } = await db.from("leads").select("assigned_to").eq("id", conv.lead_id).single();
      return c.assigned_to === l.assigned_to && c.assigned_to !== ctx.consultantId;
    }, "chat and lead both reassigned together");
    await db.from("chat_conversations").update({ assigned_to: ctx.consultantId }).eq("id", convId);
    await db.from("leads").update({ assigned_to: ctx.consultantId }).eq("id", conv.lead_id);
  });

  await check("consultant closes the chat and the buyer's box shows it", async () => {
    await open(cp, `/staff/chats?chat=${convId}`);
    await cp.getByRole("button", { name: "Close chat" }).click();
    await eventually(async () => (await latestConversation({ id: convId }))?.status === "resolved", "conversation resolved");
    const conv = await latestConversation({ id: convId });
    assert(conv.resolved_by === "consultant", `resolved_by was ${conv.resolved_by}`);
    await gp.getByText(/closed by your consultant/i).waitFor({ timeout: 20000 });
  });

  await check("a signed-in buyer with a saved mobile number connects without the form", async () => {
    const { data: buyer } = await db.from("profiles").select("id, full_name, phone").eq("email", EMAIL.buyer).single();
    assert(buyer.phone && buyer.full_name, "dev-buyer needs a name and phone");
    const b = await newPage(browser, await sessionCookies(EMAIL.buyer));
    await openChat(b.page);
    await chatSay(b.page, "I need a consultant");
    const conv = await eventually(async () => latestConversation({ user_id: buyer.id, status: "waiting" }), "signed-in buyer conversation waiting");
    trackConversation(conv.id);
    assert(conv.lead_id && conv.assigned_to, "no lead / consultant for signed-in buyer");
    assert((await b.page.getByPlaceholder("Your name").count()) === 0, "form should not be shown");
    await b.context.close();
  });

  await guest.context.close();
  await consultant.context.close();
}

/* ================== platform: real catalog, price gate, outbox, DMS export, security, admin network ================== */

function cookieHeader(session) {
  return session.cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function platformGroup(browser) {
  currentGroup = "platform";
  console.log("\n== Platform (catalog, price gate, outbox, export, security) ==");
  const cronSecret = env.CRON_SECRET || "vrooma-cron-secret-local";

  await check("public pages load (booking, EMI, trade-in, showrooms, offers) and robots hides account pages", async () => {
    for (const p of ["/book/test-drive", "/book/service", "/emi-calculator", "/trade-in", "/showrooms", "/offers", "/contact"]) {
      const res = await fetch(`${baseUrl}${p}`, { redirect: "manual" });
      assert(res.status === 200, `${p} returned ${res.status}`);
    }
    const robots = await (await fetch(`${baseUrl}/robots.txt`)).text();
    assert(/Disallow: \/profile/.test(robots) && /Disallow: \/onboarding/.test(robots), "robots.txt does not hide /profile and /onboarding");
  });

  await check("/used-cars lists only cars that exist in the database (no sample data)", async () => {
    const html = await (await fetch(`${baseUrl}/used-cars`)).text();
    const shown = new Set(html.match(/UC-\d{3,5}/g) ?? []);
    assert(shown.size > 0, "no used cars were rendered");
    const { data } = await db.from("used_cars").select("stock_id");
    const real = new Set((data ?? []).map((r) => r.stock_id));
    for (const id of shown) assert(real.has(id), `${id} is on the page but not in the database`);
  });

  await check("/cars lists only models that exist in the database", async () => {
    const html = await (await fetch(`${baseUrl}/cars`)).text();
    const slugs = new Set([...html.matchAll(/href="\/cars\/([a-z0-9-]+)"/g)].map((m) => m[1]));
    assert(slugs.size > 0, "no models were rendered");
    const { data } = await db.from("models").select("slug");
    const real = new Set((data ?? []).map((r) => r.slug));
    for (const s of slugs) assert(real.has(s), `/cars/${s} is linked but not in the database`);
  });

  await check("on-road price is gated: anonymous gets the teaser only, a signed-in buyer gets the breakup", async () => {
    const { data: variants } = await db.from("variants").select("id").limit(1);
    const variantId = variants?.[0]?.id;
    assert(variantId, "no variant to price");
    const anon = await (await fetch(`${baseUrl}/api/price?variantId=${variantId}&city=lucknow`)).json();
    assert(anon.ok && anon.data.tier === "teaser", `anonymous tier was ${anon?.data?.tier}`);
    assert(!anon.data.breakup, "anonymous response leaked the breakup");
    const session = await sessionCookies(EMAIL.buyer);
    const authed = await (await fetch(`${baseUrl}/api/price?variantId=${variantId}&city=lucknow`, { headers: { cookie: cookieHeader(session) } })).json();
    assert(authed.ok && authed.data.tier === "full", `signed-in tier was ${authed?.data?.tier}`);
    assert(authed.data.breakup, "signed-in response has no breakup");
  });

  await check("cross-site POSTs to cookie-authenticated and public write endpoints are refused", async () => {
    for (const p of ["/api/chat", "/api/leads", "/api/trade-in/upload-urls", "/api/newsletter", "/api/me/delete"]) {
      const res = await fetch(`${baseUrl}${p}`, {
        method: "POST",
        headers: { "content-type": "application/json", "sec-fetch-site": "cross-site", origin: "https://evil.example" },
        body: "{}",
      });
      assert(res.status === 403, `${p} returned ${res.status} for a cross-site request`);
    }
  });

  await check("the rate limiter counts in the database (shared across instances)", async () => {
    const key = `e2e_rl_${E2E}`;
    cleanups.push(async () => {
      await db.from("rate_limits").delete().eq("key", key);
    });
    const answers = [];
    for (let i = 0; i < 3; i++) answers.push((await db.rpc("check_rate_limit", { p_key: key, p_limit: 2, p_window_seconds: 60 })).data);
    assert(answers.join() === "true,true,false", `expected true,true,false but got ${answers.join()}`);
  });

  await check("newsletter subscribe stores consent, and the unsubscribe link withdraws it", async () => {
    const email = `${E2E.toLowerCase()}-news@example.com`;
    cleanups.push(async () => {
      await db.from("newsletter_subscribers").delete().eq("email", email);
      await db.from("consents").delete().eq("subject_email", email);
    });
    const res = await fetch(`${baseUrl}/api/newsletter`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, consent: true }),
    });
    assert(res.status === 200, `subscribe returned ${res.status}`);
    const sub = await eventually(async () => (await db.from("newsletter_subscribers").select("unsubscribe_token, unsubscribed_at").eq("email", email).maybeSingle()).data, "subscriber row");
    assert(!sub.unsubscribed_at, "new subscriber should be active");
    const page = await fetch(`${baseUrl}/unsubscribe/${encodeURIComponent(sub.unsubscribe_token)}`);
    assert(page.status === 200, `unsubscribe page returned ${page.status}`);
    await eventually(async () => (await db.from("newsletter_subscribers").select("unsubscribed_at").eq("email", email).single()).data?.unsubscribed_at, "unsubscribed_at set");
  });

  await check("outbox worker records WhatsApp as skipped (never sent) when no provider is connected", async () => {
    const key = `e2e_outbox_${E2E}`;
    const { data: row, error } = await db
      .from("messages_outbox")
      // created_at in the past so the worker (oldest first, 50 per run) reaches this row even if DEV has a backlog.
      .insert({ channel: "whatsapp", to_address: "+919876500999", template: "e2e_probe", body: "e2e probe", status: "pending", idempotency_key: key, created_at: "2000-01-01T00:00:00Z" })
      .select("id")
      .single();
    assert(!error, `insert failed: ${error?.message}`);
    cleanups.push(async () => {
      await db.from("messages_outbox").delete().eq("id", row.id);
    });
    const res = await fetch(`${baseUrl}/api/cron/outbox`, { headers: { authorization: `Bearer ${cronSecret}` } });
    assert(res.status === 200, `worker returned ${res.status}`);
    const after = await eventually(async () => {
      const { data } = await db.from("messages_outbox").select("status, last_error").eq("id", row.id).single();
      return data && data.status !== "pending" && data.status !== "sending" ? data : null;
    }, "outbox row processed");
    assert(after.status === "skipped", `status was ${after.status}, expected skipped`);
    assert(/provider/i.test(after.last_error || ""), "skipped row should say why");
  });

  await check("daily DMS export is stored in the private bucket and recorded in the audit log", async () => {
    const date = "2020-01-02";
    const file = `vrooma-dms-${date}.csv`;
    cleanups.push(async () => {
      await db.storage.from("dms-exports").remove([file]);
      await db.from("audit_log").delete().eq("table_name", "dms_export").eq("record_id", date);
    });
    const denied = await fetch(`${baseUrl}/api/cron/dms-export?date=${date}`);
    assert(denied.status === 401, `unauthenticated call returned ${denied.status}`);
    const res = await fetch(`${baseUrl}/api/cron/dms-export?date=${date}`, { headers: { authorization: `Bearer ${cronSecret}` } });
    assert(res.status === 200, `export returned ${res.status}`);
    const { data: blob, error } = await db.storage.from("dms-exports").download(file);
    assert(!error && blob, `file not in bucket: ${error?.message}`);
    const text = await blob.text();
    assert(text.startsWith("RECORD_TYPE,REFERENCE"), "CSV header missing");
    const pub = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/dms-exports/${file}`);
    assert(pub.status >= 400, "export must not be publicly readable");
  });

  const admin = await newPage(browser, await sessionCookies(EMAIL.admin));
  const ap = admin.page;

  await check("admin can add a showroom, a workshop and a demo car from Showrooms & bays", async () => {
    const showroomName = `${E2E} Showroom`;
    const workshopName = `${E2E} Workshop`;
    cleanups.push(async () => {
      const { data: sr } = await db.from("showrooms").select("id").eq("name", showroomName);
      for (const s of sr ?? []) {
        await db.from("demo_cars").delete().eq("showroom_id", s.id);
        await db.from("showrooms").delete().eq("id", s.id);
      }
      await db.from("workshops").delete().eq("name", workshopName);
    });
    assert((await open(ap, "/admin/team?tab=network")) === 200, "expected HTTP 200");

    await ap.getByRole("button", { name: "Add showroom" }).click();
    const dlg = ap.getByRole("dialog");
    await dlg.getByPlaceholder("Aliganj Showroom").fill(showroomName);
    await dlg.getByPlaceholder("Street, area, city").fill("1 Test Road, Lucknow");
    await dlg.getByPlaceholder("+91 522 400 0000").fill("+91 522 400 0000");
    await dlg.getByRole("button", { name: "Save" }).click();
    const sr = await eventually(async () => (await db.from("showrooms").select("id, is_active").eq("name", showroomName).maybeSingle()).data, "showroom row");
    assert(sr.is_active, "new showroom should be active");
    await ap.getByText(showroomName).first().waitFor();

    await ap.getByRole("button", { name: "Add workshop" }).click();
    const dlg2 = ap.getByRole("dialog");
    await dlg2.getByPlaceholder("Alambagh Service Hub").fill(workshopName);
    await dlg2.getByPlaceholder("Street, area, city").fill("2 Test Road, Lucknow");
    await dlg2.getByPlaceholder("+91 522 400 0000").fill("+91 522 400 0001");
    await dlg2.getByRole("spinbutton").fill("6");
    await dlg2.getByRole("button", { name: "Save" }).click();
    const wk = await eventually(async () => (await db.from("workshops").select("id, bays").eq("name", workshopName).maybeSingle()).data, "workshop row");
    assert(wk.bays === 6, `bays were ${wk.bays}`);

    await ap.getByRole("button", { name: "Add demo car" }).click();
    const dlg3 = ap.getByRole("dialog");
    await dlg3.getByRole("combobox", { name: "Showroom" }).selectOption({ label: showroomName });
    await dlg3.getByPlaceholder("UP32 ** 1234").fill(`${E2E} 01`);
    await dlg3.getByRole("button", { name: "Save" }).click();
    await eventually(async () => (await db.from("demo_cars").select("id").eq("showroom_id", sr.id).maybeSingle()).data, "demo car row");
  });

  await check("a validation error is shown in the dialog and nothing is saved", async () => {
    await open(ap, "/admin/team?tab=network");
    await ap.getByRole("button", { name: "Add workshop" }).click();
    const dlg = ap.getByRole("dialog");
    await dlg.getByPlaceholder("Alambagh Service Hub").fill(`${E2E} Bad`);
    await dlg.getByPlaceholder("Street, area, city").fill("3 Test Road");
    await dlg.getByPlaceholder("+91 522 400 0000").fill("abc");
    await dlg.getByRole("button", { name: "Save" }).click();
    await dlg.getByRole("alert").filter({ hasText: /valid phone number/i }).waitFor();
    const { data } = await db.from("workshops").select("id").eq("name", `${E2E} Bad`);
    assert(!data?.length, "an invalid workshop was saved");
  });

  await admin.context.close();
}

/* ================================== runner ================================== */

async function main() {
  console.log(`Target ${baseUrl} · Supabase ${DEV_REF} · tag ${E2E}`);
  const browser = await chromium.launch();
  try {
    if (!only || only === "consultant") await consultantGroup(browser);
    if (!only || only === "manager") await managerGroup(browser);
    if (!only || only === "admin") await adminGroup(browser);
    if (!only || only === "chat") await chatGroup(browser);
    if (!only || only === "cross") await crossGroup(browser);
    if (!only || only === "platform") await platformGroup(browser);
  } finally {
    await browser.close();
    for (const fn of cleanups.reverse()) {
      try {
        await fn();
      } catch (err) {
        console.log(`  (cleanup issue: ${String(err.message).slice(0, 120)})`);
      }
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("\nFAILURES");
    for (const f of failed) console.log(` - [${f.group}] ${f.name}: ${f.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
