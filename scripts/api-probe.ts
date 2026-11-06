/**
 * scripts/api-probe.ts
 *
 * Automated API & Database Security Exposure Probe for Vrooma.
 * Tests real PostgREST, RPC, and Storage endpoints using the PUBLISHABLE key
 * across 7 personas (Anon, Buyer A, Buyer B, Consultant SR1, Consultant SR2, Manager, Admin).
 *
 * Strictly restricted to DEV project ('eobtzcwinjmimzisypca').
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { assertSafeDevEnvironment, DEV_REF } from "../src/lib/project-guard.ts";

// 1. Guard check: REFUSES to run on production
assertSafeDevEnvironment("api-probe");

// Load local DEV credentials
const envPath = path.resolve(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("❌ .env.local not found.");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const [k, ...v] = trimmed.split("=");
  envVars[k.trim()] = v.join("=").trim().replace(/["']/g, "");
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || `https://${DEV_REF}.supabase.co`;
const publishableKey = envVars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

if (!publishableKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing in .env.local");
  process.exit(1);
}

const PERSONA_CONFIGS = [
  { id: "anon", name: "Anonymous", email: "", pass: "" },
  { id: "buyer_a", name: "Buyer A (Aditya)", email: "dev-buyer@vrooma.in", pass: "VroomaDevPass2026!" },
  { id: "buyer_b", name: "Buyer B (Priya)", email: "priya.verma@vrooma.in", pass: "VroomaDevPass2026!" },
  { id: "consultant_sr1", name: "Consultant Hazratganj", email: "dev-consultant@vrooma.in", pass: "VroomaDevPass2026!" },
  { id: "consultant_sr2", name: "Consultant Gomti Nagar", email: "faizan.khan@vrooma.in", pass: "VroomaDevPass2026!" },
  { id: "manager", name: "Used-Car Manager", email: "dev-manager@vrooma.in", pass: "VroomaDevPass2026!" },
  { id: "admin", name: "Dealer Principal Admin", email: "dev-admin@vrooma.in", pass: "VroomaDevPass2026!" },
];

export interface PersonaSession {
  id: string;
  name: string;
  token: string | null;
  userId: string | null;
}

export interface ProbeResult {
  category: "table" | "rpc" | "storage";
  target: string;
  persona: string;
  status: number;
  dataCount: number;
  expectedResult: "DENIED" | "ALLOWED" | "ISOLATED";
  verdict: "PASS" | "FAIL";
  note?: string;
}

async function getPersonaTokens(): Promise<PersonaSession[]> {
  const sessions: PersonaSession[] = [];
  const baseClient = createClient(supabaseUrl, publishableKey);

  for (const p of PERSONA_CONFIGS) {
    if (p.id === "anon") {
      sessions.push({ id: p.id, name: p.name, token: null, userId: null });
      continue;
    }

    const { data, error } = await baseClient.auth.signInWithPassword({
      email: p.email,
      password: p.pass,
    });

    if (error || !data.session) {
      console.warn(`[probe] Could not authenticate ${p.name} (${p.email}): ${error?.message}`);
      sessions.push({ id: p.id, name: p.name, token: null, userId: null });
    } else {
      sessions.push({
        id: p.id,
        name: p.name,
        token: data.session.access_token,
        userId: data.user.id,
      });
    }
  }

  return sessions;
}

async function probeRest(
  session: PersonaSession,
  endpoint: string,
  options: RequestInit = {}
): Promise<{ status: number; count: number; body: any }> {
  const url = `${supabaseUrl}/rest/v1/${endpoint}`;
  const headers: Record<string, string> = {
    apikey: publishableKey,
    "Content-Type": "application/json",
    Prefer: "count=exact",
  };

  if (session.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    let count = 0;
    const contentRange = res.headers.get("content-range");
    if (contentRange) {
      const parts = contentRange.split("/");
      if (parts[1] && parts[1] !== "*") count = parseInt(parts[1], 10);
    }

    let body: any = null;
    const text = await res.text();
    try {
      body = JSON.parse(text);
      if (Array.isArray(body) && !count) count = body.length;
    } catch {
      body = text;
    }

    return { status: res.status, count, body };
  } catch (err: any) {
    return { status: 500, count: 0, body: err.message };
  }
}

export async function runApiProbe() {
  console.log("==================================================");
  console.log("     VROOMA API SECURITY EXPOSURE PROBE");
  console.log(` Target DEV Host: ${supabaseUrl}`);
  console.log("==================================================\n");

  const sessions = await getPersonaTokens();
  const results: ProbeResult[] = [];

  // ==========================================
  // 1. SENSITIVE COLUMN RESTRICTION PROBES
  // ==========================================
  for (const s of sessions) {
    // used_cars?select=reg_no_private -> Must be rejected (400 Column not found / permission denied)
    const regProbe = await probeRest(s, "used_cars?select=reg_no_private");
    const regPassed = regProbe.status !== 200 || (regProbe.body?.code && regProbe.body.code !== "200");
    results.push({
      category: "table",
      target: "used_cars?select=reg_no_private",
      persona: s.name,
      status: regProbe.status,
      dataCount: regProbe.count,
      expectedResult: "DENIED",
      verdict: regPassed ? "PASS" : "FAIL",
      note: regPassed ? "Privilege revoked" : "LEAK DETECTED",
    });

    // price_rules -> Anon and buyers must see 0 rows or get denied
    const priceProbe = await probeRest(s, "price_rules?select=id");
    const isBuyerOrAnon = s.id === "anon" || s.id.startsWith("buyer");
    const pricePassed = isBuyerOrAnon ? (priceProbe.count === 0 && priceProbe.status === 200) || priceProbe.status === 403 : priceProbe.count > 0;
    results.push({
      category: "table",
      target: "price_rules",
      persona: s.name,
      status: priceProbe.status,
      dataCount: priceProbe.count,
      expectedResult: isBuyerOrAnon ? "DENIED" : "ALLOWED",
      verdict: pricePassed ? "PASS" : "FAIL",
      note: isBuyerOrAnon ? "Shielded by RLS" : "Staff access",
    });

    // profiles -> Consultants must NOT list all retail buyers
    const profileProbe = await probeRest(s, "profiles?role=eq.buyer&select=id,full_name");
    let profilePassed = true;
    if (s.id.startsWith("consultant")) {
      profilePassed = profileProbe.count <= 1; // At most their own directly assigned buyer, never all buyers
    } else if (s.id.startsWith("buyer")) {
      profilePassed = profileProbe.count <= 1; // Only own profile
    } else if (s.id === "anon") {
      profilePassed = profileProbe.count === 0;
    }
    results.push({
      category: "table",
      target: "profiles (buyer rows)",
      persona: s.name,
      status: profileProbe.status,
      dataCount: profileProbe.count,
      expectedResult: s.id === "admin" || s.id === "manager" ? "ALLOWED" : "DENIED",
      verdict: profilePassed ? "PASS" : "FAIL",
      note: `Returned ${profileProbe.count} buyer records`,
    });

    // messages_outbox, rate_limits, idempotency_keys, audit_log
    const outboxProbe = await probeRest(s, "messages_outbox?select=id");
    const outboxPassed = s.id === "admin" ? outboxProbe.status === 200 : outboxProbe.count === 0;
    results.push({
      category: "table",
      target: "messages_outbox",
      persona: s.name,
      status: outboxProbe.status,
      dataCount: outboxProbe.count,
      expectedResult: s.id === "admin" ? "ALLOWED" : "DENIED",
      verdict: outboxPassed ? "PASS" : "FAIL",
    });

    // used_car_price_suggestions & sales history (consultant must be denied)
    const suggProbe = await probeRest(s, "used_car_price_suggestions?select=id");
    const suggPassed = (s.id.startsWith("consultant") || isBuyerOrAnon) ? suggProbe.count === 0 : true;
    results.push({
      category: "table",
      target: "used_car_price_suggestions",
      persona: s.name,
      status: suggProbe.status,
      dataCount: suggProbe.count,
      expectedResult: (s.id === "manager" || s.id === "admin") ? "ALLOWED" : "DENIED",
      verdict: suggPassed ? "PASS" : "FAIL",
    });
  }

  // ==========================================
  // 2. RPC EXPOSURE PROBES
  // ==========================================
  const anonSession = sessions.find((s) => s.id === "anon")!;
  const buyerSession = sessions.find((s) => s.id === "buyer_a")!;

  const rpcChecks = [
    { rpc: "resolve_price_rule", body: { p_city_id: "a0000000-0000-0000-0000-000000000001" }, denyAnon: true, denyBuyer: true },
    { rpc: "create_lead", body: { p_name: "Probe", p_phone: "+919876543210" }, denyAnon: true, denyBuyer: false },
    { rpc: "book_slot", body: { p_slot_id: "b0000000-0000-0000-0000-000000000001" }, denyAnon: true, denyBuyer: false },
    { rpc: "get_used_car_reg", body: { p_car_id: "00000000-0000-0000-0000-000000000001" }, denyAnon: true, denyBuyer: true },
    { rpc: "admin_set_role", body: { p_user_id: "00000000-0000-0000-0000-000000000001", p_role: "admin" }, denyAnon: true, denyBuyer: true },
    { rpc: "flag_sla_breaches", body: {}, denyAnon: true, denyBuyer: true },
    { rpc: "generate_slots", body: { p_days: 7 }, denyAnon: true, denyBuyer: true },
    { rpc: "reassign_lead", body: { p_lead_id: "00000000-0000-0000-0000-000000000001" }, denyAnon: true, denyBuyer: true },
  ];

  for (const check of rpcChecks) {
    // Probe as anon
    const anonRes = await probeRest(anonSession, `rpc/${check.rpc}`, {
      method: "POST",
      body: JSON.stringify(check.body),
    });
    const anonDenied = anonRes.status === 401 || anonRes.status === 403 || anonRes.status === 404 || anonRes.body?.code === "VR005" || anonRes.body?.code === "42501";
    results.push({
      category: "rpc",
      target: `rpc/${check.rpc}`,
      persona: "Anonymous",
      status: anonRes.status,
      dataCount: 0,
      expectedResult: "DENIED",
      verdict: anonDenied ? "PASS" : "FAIL",
      note: anonDenied ? "Direct RPC execution blocked" : "UNAUTHORIZED RPC EXECUTION",
    });

    // Probe as buyer
    if (check.denyBuyer && buyerSession.token) {
      const buyerRes = await probeRest(buyerSession, `rpc/${check.rpc}`, {
        method: "POST",
        body: JSON.stringify(check.body),
      });
      const buyerDenied = buyerRes.status === 401 || buyerRes.status === 403 || buyerRes.status === 404 || buyerRes.body?.code === "VR005" || buyerRes.body?.code === "42501";
      results.push({
        category: "rpc",
        target: `rpc/${check.rpc}`,
        persona: "Buyer",
        status: buyerRes.status,
        dataCount: 0,
        expectedResult: "DENIED",
        verdict: buyerDenied ? "PASS" : "FAIL",
        note: buyerDenied ? "Buyer execution blocked" : "UNAUTHORIZED RPC EXECUTION",
      });
    }
  }

  // ==========================================
  // 3. STORAGE PROBES
  // ==========================================
  // Attempt to list private trade-in-photos as anon
  const storageProbe = await probeRest(anonSession, "storage/v1/object/list/trade-in-photos");
  const storageBlocked = storageProbe.status === 400 || storageProbe.status === 401 || storageProbe.status === 403 || storageProbe.count === 0;
  results.push({
    category: "storage",
    target: "storage/trade-in-photos (list)",
    persona: "Anonymous",
    status: storageProbe.status,
    dataCount: 0,
    expectedResult: "DENIED",
    verdict: storageBlocked ? "PASS" : "FAIL",
    note: "Bucket listing blocked",
  });

  // Print Summary Table
  console.log("\n| Category | Target | Persona | Status | Result | Verdict | Note |");
  console.log("|---|---|---|:---:|:---:|:---:|---|");
  let failureCount = 0;
  for (const r of results) {
    if (r.verdict === "FAIL") failureCount++;
    console.log(`| ${r.category} | ${r.target} | ${r.persona} | ${r.status} | ${r.expectedResult} | **${r.verdict}** | ${r.note || ""} |`);
  }

  console.log(`\nProbe Complete: ${results.length - failureCount} passed, ${failureCount} failed.`);
  if (failureCount > 0) {
    process.exit(1);
  }
}

// Execute when invoked from CLI
runApiProbe().catch((err) => {
  console.error("Probe fatal error:", err);
  process.exit(1);
});
