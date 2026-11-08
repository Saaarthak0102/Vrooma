import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST as leadsPost } from "@/app/api/leads/route";
import { NextRequest } from "next/server";
import { cleanupTestData, TEST_BUYER_EMAILS } from "@/../scripts/cleanup-test-data";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://eobtzcwinjmimzisypca.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const LUCKNOW_CITY_ID = "c0000001-0000-0000-0000-000000000001";
const VARIANT_H_ZX_ID = "e0000001-0000-0000-0000-000000000001";
const HAZRATGANJ_SHOWROOM_ID = "a0000001-0000-0000-0000-000000000001";

// Both describe blocks below create real leads and bookings on DEV. Remove what this run created (and hand booked
// seats back) once every test in the file has finished, so repeated runs do not bury the lead desk, the digests and
// the escalation rules in fake leads.
const startedAt = new Date().toISOString();
afterAll(async () => {
  try {
    const cleaner: any = createAdminClient();
    const { data: buyers } = await cleaner.from("profiles").select("id").in("email", TEST_BUYER_EMAILS);
    const r = await cleanupTestData(cleaner, { since: startedAt, testBuyerIds: (buyers ?? []).map((b: { id: string }) => b.id) });
    if (r.leads || r.bookings) console.info(`[e2e-flows] cleaned up ${r.leads} test leads and ${r.bookings} bookings`);
  } catch (err: any) {
    console.warn(`[e2e-flows] cleanup skipped: ${err?.message}`);
  }
});

describe("Phase 09: Post-0014 End-to-End Workflow Verification", () => {
  // The public lead route derives the client IP from the platform header; model a Vercel deployment.
  beforeAll(() => {
    process.env.TRUSTED_PROXY = "vercel";
  });

  // Loosely typed on purpose: these tests call RPCs and tables directly, exactly as a browser would.
  type AnyClient = SupabaseClient<any, "public", any>;
  let anonClient: AnyClient;
  let buyerAClient: AnyClient;
  let buyerBClient: AnyClient;
  let consultantClient: AnyClient;
  const admin: any = createAdminClient();


  let buyerAId: string;
  let buyerBId: string;
  let consultantId: string;

  beforeAll(async () => {
    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Sign in Buyer A
    buyerAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authA, error: errA } = await buyerAClient.auth.signInWithPassword({
      email: "dev-buyer@vrooma.in",
      password: "VroomaDevPass2026!",
    });
    if (errA || !authA.user) throw new Error(`Buyer A login failed: ${errA?.message}`);
    buyerAId = authA.user.id;

    // 2. Sign in Buyer B
    buyerBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authB, error: errB } = await buyerBClient.auth.signInWithPassword({
      email: "dev-buyer-2@vrooma.in",
      password: "VroomaDevPass2026!",
    });
    if (errB || !authB.user) throw new Error(`Buyer B login failed: ${errB?.message}`);
    buyerBId = authB.user.id;

    // 3. Sign in Consultant
    consultantClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authC, error: errC } = await consultantClient.auth.signInWithPassword({
      email: "dev-consultant@vrooma.in",
      password: "VroomaDevPass2026!",
    });
    if (errC || !authC.user) throw new Error(`Consultant login failed: ${errC?.message}`);
    consultantId = authC.user.id;
  });

  // FLOW 1: Signed-out visitor
  it("FLOW 1: signed-out visitor gets model teaser, but itemized breakup and direct price rules are refused", async () => {
    // Teaser succeeds for anonymous visitors
    const { data: teaser, error: teaserErr } = await anonClient.rpc("get_onroad_teaser", {
      p_variant_id: VARIANT_H_ZX_ID,
      p_city_id: LUCKNOW_CITY_ID,
    });
    expect(teaserErr).toBeNull();
    expect(typeof teaser).toBe("object");
    expect(teaser.total).toBeGreaterThan(1000000);

    // Full itemized breakup is refused for anonymous callers
    const { data: breakup, error: breakupErr } = await anonClient.rpc("get_onroad_breakup", {
      p_variant_id: VARIANT_H_ZX_ID,
      p_city_id: LUCKNOW_CITY_ID,
    });
    expect(breakupErr).toBeTruthy();
    expect(breakupErr?.message).toContain("authentication");

    // Direct resolve_price_rule is revoked from anon
    const { error: ruleErr } = await anonClient.rpc("resolve_price_rule", {
      p_city_id: LUCKNOW_CITY_ID,
      p_variant_id: VARIANT_H_ZX_ID,
      p_model_id: "d0000001-0000-0000-0000-000000000001",
      p_fuel: "petrol",
      p_date: new Date().toISOString().slice(0, 10),
    });
    expect(ruleErr).toBeTruthy();
  });

  // FLOW 2: Signed-in buyer
  it("FLOW 2: signed-in buyer gets full breakup, books test drive with lead auto-assignment, then cancels", async () => {
    // 1. Full breakup succeeds for authenticated buyer
    const { data: breakup, error: breakupErr } = await buyerAClient.rpc("get_onroad_breakup", {
      p_variant_id: VARIANT_H_ZX_ID,
      p_city_id: LUCKNOW_CITY_ID,
    });
    expect(breakupErr).toBeNull();
    expect(breakup).toBeTruthy();
    expect(breakup.ex_showroom).toBeGreaterThan(0);
    expect(breakup.road_tax).toBeGreaterThan(0);
    expect(breakup.total).toBeGreaterThan(breakup.ex_showroom);

    // 2. Prepare future slot (at least 3 hours ahead to satisfy 2-hour lead time)
    const futureDate1 = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const { data: testSlot1 } = await admin
      .from("slots")
      .insert({
        kind: "test_drive",
        showroom_id: HAZRATGANJ_SHOWROOM_ID,
        starts_at: futureDate1.toISOString(),
        ends_at: new Date(futureDate1.getTime() + 45 * 60 * 1000).toISOString(),
        capacity: 2,
        booked_count: 0,
        is_active: true,
      })
      .select()
      .single();

    expect(testSlot1).toBeTruthy();

    // 3. Book slot as Buyer A
    const { data: booking, error: bookErr } = await buyerAClient.rpc("book_slot", {
      p_slot_id: testSlot1.id,
      p_kind: "test_drive",
      p_vehicle_info: { model_name: "Model H", variant_name: "ZX Automatic" },
      p_idempotency_key: `e2e_td_${Date.now()}`,
    });

    expect(bookErr).toBeNull();
    expect(booking).toBeTruthy();
    expect(booking.user_id).toBe(buyerAId);
    expect(booking.status).toBe("confirmed");

    // 4. Cancel the booking
    const { data: cancelledBooking, error: cancelErr } = await buyerAClient.rpc("cancel_booking", {
      p_booking_id: booking.id,
      p_reason: "Customer schedule changed",
    });
    expect(cancelErr).toBeNull();
    expect(cancelledBooking.status).toBe("cancelled");
  });

  // FLOW 3: Anonymous contact form
  it("FLOW 3: anonymous contact form creates lead through route handler; direct RPC is blocked", async () => {
    // Direct RPC call by anonymous caller is rejected
    const { error: directErr } = await anonClient.rpc("create_lead", {
      p_name: "Anonymous Visitor",
      p_phone: "+919876543210",
      p_showroom_id: HAZRATGANJ_SHOWROOM_ID,
      p_source: "web",
    });
    expect(directErr).toBeTruthy();

    // Submission via public Next.js route handler /api/leads succeeds
    const req = new NextRequest("http://localhost:3000/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.20.30.40",
      },
      body: JSON.stringify({
        name: "Verified Lead Visitor",
        phone: "+919876549999",
        showroomId: HAZRATGANJ_SHOWROOM_ID,
        message: "Interested in Model H Lucknow price",
        consent: true,
      }),
    });

    const res = await leadsPost(req);
    const json = await res.json();
    if (res.status !== 201) {
      console.error("FLOW 3 FAILURE RESPONSE:", json);
    }
    expect(res.status).toBe(201);
    expect(json.ok).toBe(true);
    // The anonymous submitter gets a receipt only, never the stored row
    expect(json.data.ref).toBeTruthy();
    expect(json.data.assigned).toBe(true);
    expect(Object.keys(json.data).sort()).toEqual(["assigned", "ref"]);
    expect(JSON.stringify(json)).not.toMatch(/9876549999|assigned_to|ai_summary|ai_draft/);
  });

  // FLOW 4: Consultant registration reveal & audit logging
  it("FLOW 4: consultant reveals used car registration with audit log; retail buyer is refused", async () => {
    // 1. Consultant calls get_used_car_reg
    const { data: regNo, error: regErr } = await consultantClient.rpc("get_used_car_reg", {
      p_stock_id: "UC-1182",
    });
    expect(regErr).toBeNull();
    expect(regNo).toMatch(/^UP32/);

    // 2. Check audit log contains VIEW_UNMASKED_REG by consultant
    const { data: auditRow } = await admin
      .from("audit_log")
      .select("action, record_id, actor_id")
      .eq("action", "VIEW_UNMASKED_REG")
      .eq("record_id", "UC-1182")
      .eq("actor_id", consultantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    expect(auditRow).toBeTruthy();
    expect(auditRow?.record_id).toBe("UC-1182");
    expect(auditRow?.actor_id).toBe(consultantId);

    // 3. Retail Buyer calling get_used_car_reg is refused
    const { error: buyerRegErr } = await buyerAClient.rpc("get_used_car_reg", {
      p_stock_id: "UC-1182",
    });
    expect(buyerRegErr).toBeTruthy();
    expect(buyerRegErr?.message).toContain("Privilege denied");
  });

  // FLOW 5: Cross-buyer isolation
  it("FLOW 5: two buyers cannot cancel each other's bookings", async () => {
    // 1. Create a booking belonging to Buyer A
    const futureDate = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const { data: slotA } = await admin
      .from("slots")
      .insert({
        kind: "test_drive",
        showroom_id: HAZRATGANJ_SHOWROOM_ID,
        starts_at: futureDate.toISOString(),
        ends_at: new Date(futureDate.getTime() + 45 * 60 * 1000).toISOString(),
        capacity: 1,
        booked_count: 0,
        is_active: true,
      })
      .select()
      .single();

    const { data: bookingA } = await buyerAClient.rpc("book_slot", {
      p_slot_id: slotA.id,
      p_kind: "test_drive",
      p_vehicle_info: { model_name: "Model H" },
      p_idempotency_key: `buyer_a_iso_${Date.now()}`,
    });

    expect(bookingA).toBeTruthy();
    expect(bookingA.user_id).toBe(buyerAId);

    // Staff may cancel any booking, so this only proves isolation if Buyer B really is a buyer. Another script
    // (console-e2e) promotes this account to manager and can leave it that way; fail with a clear reason.
    const { data: profileB } = await admin.from("profiles").select("role").eq("id", buyerBId).single();
    expect(profileB?.role, "dev-buyer-2 must have the buyer role for this test (a leftover manager role from another script?)").toBe("buyer");

    // 2. Buyer B attempts to cancel Buyer A's booking -> must throw VR005
    const { error: cancelErr } = await buyerBClient.rpc("cancel_booking", {
      p_booking_id: bookingA.id,
      p_reason: "Malicious cancellation attempt",
    });
    expect(cancelErr).toBeTruthy();
    expect(cancelErr?.message).toContain("Cannot cancel another customer appointment");

  });
});

describe("Follow-up 1: acting user and ownership (needs migration 0018 on DEV)", () => {
  type AnyClient = SupabaseClient<any, "public", any>;
  const admin: any = createAdminClient();
  const login = async (email: string): Promise<{ client: AnyClient; id: string }> => {
    const client: AnyClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password: "VroomaDevPass2026!" });
    if (error || !data.user) throw new Error(`login failed for ${email}: ${error?.message}`);
    return { client, id: data.user.id };
  };

  const phone = () => "+9198" + String(Math.floor(10000000 + Math.random() * 89999999));

  it("create_lead: a buyer session cannot attribute a lead to another user (p_user_id is ignored)", async () => {
    const a = await login("dev-buyer@vrooma.in");
    const b = await login("dev-buyer-2@vrooma.in");
    const { data: lead, error } = await a.client.rpc("create_lead", {
      p_name: "Attribution Probe",
      p_phone: phone(),
      p_showroom_id: HAZRATGANJ_SHOWROOM_ID,
      p_source: "web",
      p_user_id: b.id, // attacker-supplied
    });
    expect(error, error?.message).toBeNull();
    expect(lead.user_id).toBe(a.id); // the JWT subject wins, not the argument
    expect(lead.user_id).not.toBe(b.id);
  });

  it("create_lead: the service role (trusted server code) CAN name the acting buyer", async () => {
    const a = await login("dev-buyer@vrooma.in");
    const { data: lead, error } = await admin.rpc("create_lead", {
      p_name: "Service Attribution Probe",
      p_phone: phone(),
      p_showroom_id: HAZRATGANJ_SHOWROOM_ID,
      p_source: "web",
      p_user_id: a.id,
    });
    expect(error, error?.message).toBeNull();
    expect(lead.user_id).toBe(a.id);

    const { data: ev } = await admin.from("lead_events").select("actor_id").eq("lead_id", lead.id).eq("type", "created").single();
    expect(ev.actor_id).toBe(a.id);
  });

  it("create_lead: still not callable by anon", async () => {
    const anon: AnyClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { error } = await anon.rpc("create_lead", {
      p_name: "x", p_phone: phone(), p_showroom_id: HAZRATGANJ_SHOWROOM_ID, p_user_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(error).toBeTruthy();
  });

  it("set_lead_status / reassign_lead: a consultant cannot touch a lead assigned to someone else", async () => {
    // Lead is created by the service role and assigned by the routing rules. Pick a consultant who does NOT own it.
    const { data: lead } = await admin.rpc("create_lead", {
      p_name: "Ownership Probe", p_phone: phone(), p_showroom_id: HAZRATGANJ_SHOWROOM_ID, p_source: "web",
    });
    expect(lead.assigned_to).toBeTruthy();

    const candidates = ["dev-consultant@vrooma.in", "rohit.verma@vrooma.in", "ananya.shukla@vrooma.in"];
    let outsider: { client: AnyClient; id: string } | null = null;
    for (const email of candidates) {
      const c = await login(email);
      if (c.id !== lead.assigned_to) { outsider = c; break; }
    }
    expect(outsider).toBeTruthy();

    const status = await outsider!.client.rpc("set_lead_status", { p_lead_id: lead.id, p_status: "contacted" });
    expect(status.error?.message).toContain("not assigned to you");

    const reassign = await outsider!.client.rpc("reassign_lead", {
      p_lead_id: lead.id, p_to_consultant_id: outsider!.id, p_reason: "hijack attempt",
    });
    expect(reassign.error?.message).toContain("not assigned to you");

    const { data: after } = await admin.from("leads").select("assigned_to, status").eq("id", lead.id).single();
    expect(after.assigned_to).toBe(lead.assigned_to);
    expect(after.status).toBe("new");
  });

  it("set_lead_status: the owning consultant (user session) succeeds and first_contacted_at is set", async () => {
    const { data: lead } = await admin.rpc("create_lead", {
      p_name: "Owner Probe", p_phone: phone(), p_showroom_id: HAZRATGANJ_SHOWROOM_ID, p_source: "web",
    });
    const { data: owner } = await admin.from("profiles").select("email").eq("id", lead.assigned_to).single();
    const c = await login(owner.email);
    const { data: updated, error } = await c.client.rpc("set_lead_status", { p_lead_id: lead.id, p_status: "contacted" });
    expect(error, error?.message).toBeNull();
    expect(updated.first_contacted_at).toBeTruthy();
  });

  it("set_lead_status through the admin client is refused (why sendLeadReplyAction must use the user session)", async () => {
    const { data: lead } = await admin.rpc("create_lead", {
      p_name: "Admin Client Probe", p_phone: phone(), p_showroom_id: HAZRATGANJ_SHOWROOM_ID, p_source: "web",
    });
    const { error } = await admin.rpc("set_lead_status", { p_lead_id: lead.id, p_status: "contacted" });
    expect(error?.message).toContain("Permission denied");
  });

  it("anonymise_user is exposed to the service role only", async () => {
    const buyer = await login("dev-buyer@vrooma.in");
    const asBuyer = await buyer.client.rpc("anonymise_user", { p_uid: buyer.id });
    expect(asBuyer.error).toBeTruthy();
    // Service role: a random uuid must reach the function (it may raise "not found" but must not be "function not found")
    const asService = await admin.rpc("anonymise_user", { p_uid: "00000000-0000-0000-0000-00000000dead" });
    expect(asService.error?.code).not.toBe("PGRST202");
  });

  it("get_used_car_reg: refused for a buyer, allowed and audited for staff (via the same RPC the server action calls)", async () => {
    const buyer = await login("dev-buyer@vrooma.in");
    const staff = await login("dev-consultant@vrooma.in");
    expect((await buyer.client.rpc("get_used_car_reg", { p_stock_id: "UC-1182" })).error).toBeTruthy();
    const ok = await staff.client.rpc("get_used_car_reg", { p_stock_id: "UC-1182" });
    expect(ok.error).toBeNull();
    expect(ok.data).toMatch(/^UP32/);
  });

  it("cron status is not readable by buyers or anon", async () => {
    const buyer = await login("dev-buyer@vrooma.in");
    expect((await buyer.client.rpc("get_cron_status")).error).toBeTruthy();
    const { data, error } = await admin.rpc("get_cron_status");
    expect(error, error?.message).toBeNull();
    expect(data.map((j: { jobname: string }) => j.jobname)).toContain("eval_lead_sla_breaches");
  });
});
