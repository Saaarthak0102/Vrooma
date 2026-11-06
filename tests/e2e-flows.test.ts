import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST as leadsPost } from "@/app/api/leads/route";
import { NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://eobtzcwinjmimzisypca.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const LUCKNOW_CITY_ID = "c0000001-0000-0000-0000-000000000001";
const VARIANT_H_ZX_ID = "e0000001-0000-0000-0000-000000000001";
const HAZRATGANJ_SHOWROOM_ID = "a0000001-0000-0000-0000-000000000001";

describe("Phase 09: Post-0014 End-to-End Workflow Verification", () => {
  let anonClient: ReturnType<typeof createClient>;
  let buyerAClient: ReturnType<typeof createClient>;
  let buyerBClient: ReturnType<typeof createClient>;
  let consultantClient: ReturnType<typeof createClient>;
  const admin = createAdminClient();

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
  it("FLOW 2: signed-in buyer gets full breakup, books test drive with lead auto-assignment, then cancels & reschedules", async () => {
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
    const futureDate2 = new Date(Date.now() + 5 * 60 * 60 * 1000);
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

    // 4. Prepare second slot for rescheduling
    const { data: testSlot2 } = await admin
      .from("slots")
      .insert({
        kind: "test_drive",
        showroom_id: HAZRATGANJ_SHOWROOM_ID,
        starts_at: futureDate2.toISOString(),
        ends_at: new Date(futureDate2.getTime() + 45 * 60 * 1000).toISOString(),
        capacity: 2,
        booked_count: 0,
        is_active: true,
      })
      .select()
      .single();

    // 5. Reschedule booking to slot 2
    const { data: reschedBooking, error: reschedErr } = await buyerAClient.rpc("reschedule_booking", {
      p_booking_id: booking.id,
      p_new_slot_id: testSlot2.id,
    });
    expect(reschedErr).toBeNull();
    expect(reschedBooking.user_id).toBe(buyerAId);
    expect(reschedBooking.slot_id).toBe(testSlot2.id);

    // Verify original booking is marked cancelled
    const { data: originalBooking } = await admin
      .from("bookings")
      .select("status")
      .eq("id", booking.id)
      .single();
    expect(originalBooking?.status).toBe("cancelled");

    // 6. Cancel rescheduled booking
    const { data: cancelledBooking, error: cancelErr } = await buyerAClient.rpc("cancel_booking", {
      p_booking_id: reschedBooking.id,
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
    expect(json.data.ref).toBeTruthy();
    expect(json.data.assigned_to).toBeTruthy();
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
  it("FLOW 5: two buyers cannot cancel or reschedule bookings for each other", async () => {
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

    // 2. Buyer B attempts to cancel Buyer A's booking -> must throw VR005
    const { error: cancelErr } = await buyerBClient.rpc("cancel_booking", {
      p_booking_id: bookingA.id,
      p_reason: "Malicious cancellation attempt",
    });
    expect(cancelErr).toBeTruthy();
    expect(cancelErr?.message).toContain("Cannot cancel another customer appointment");

    // 3. Buyer B attempts to reschedule Buyer A's booking -> must throw VR005
    const futureDateNext = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const { data: slotB } = await admin
      .from("slots")
      .insert({
        kind: "test_drive",
        showroom_id: HAZRATGANJ_SHOWROOM_ID,
        starts_at: futureDateNext.toISOString(),
        ends_at: new Date(futureDateNext.getTime() + 45 * 60 * 1000).toISOString(),
        capacity: 1,
        booked_count: 0,
        is_active: true,
      })
      .select()
      .single();

    const { error: reschedErr } = await buyerBClient.rpc("reschedule_booking", {
      p_booking_id: bookingA.id,
      p_new_slot_id: slotB.id,
    });
    expect(reschedErr).toBeTruthy();
    expect(reschedErr?.message).toContain("Cannot reschedule another customer appointment");
  });
});
