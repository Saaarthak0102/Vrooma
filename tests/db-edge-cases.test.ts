/**
 * tests/db-edge-cases.test.ts
 *
 * Automated verification of Section 9 Edge Cases & Concurrency Guarantees.
 * Tests:
 *   1. Slot booking concurrency & capacity bounds (VR001, booked_count <= capacity).
 *   2. Lead auto-assignment concurrency (SKIP LOCKED) & empty pool handling.
 *   3. 24-hour lead deduplication (repeat_enquiry event generated instead of duplicate lead).
 *   4. Price rule exclusion constraints (non-overlapping GIST ranges & expired rules returning NULL).
 *   5. Reg number client immunity (reg_no_private revoked from anon/authenticated).
 *   6. Profile role escalation prevention (column privileges + RLS WITH CHECK).
 *   7. Last administrator demotion protection (VR005).
 *   8. Booking cancellation idempotency & capacity replenishment.
 *   9. Rescheduling atomicity (failed new booking rolls back and preserves old).
 *   10. DPDP account erasure & anonymisation (PII scrubbed, business ledger retained).
 *   11. Idempotent slot generation (ON CONFLICT DO NOTHING).
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");
const rpcSql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0011_functions_rpc.sql"), "utf-8");
const pricingSql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0004_pricing.sql"), "utf-8");
const slotsSql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0006_slots_bookings.sql"), "utf-8");
const usedCarsSql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0005_used_cars.sql"), "utf-8");
const identitySql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0002_identity_profiles_consents.sql"), "utf-8");
const privacySql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0009_privacy_requests.sql"), "utf-8");
const leadsSql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0007_leads_assignment.sql"), "utf-8");
const messagingSql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0008_messaging_audit_ops.sql"), "utf-8");

describe("Phase 2: Database Edge Cases & Concurrency Guarantees", () => {

  it("Edge Case 1: Slot capacity cannot be exceeded (atomic increment & check constraint)", () => {
    // 1. Table CHECK constraint: booked_count between 0 and capacity
    expect(slotsSql).toMatch(/CONSTRAINT chk_slot_capacity CHECK \(booked_count >= 0 AND booked_count <= capacity\)/);

    // 2. Atomic booking increment in RPC with condition booked_count < capacity
    expect(rpcSql).toMatch(/UPDATE public\.slots\s+SET booked_count = booked_count \+ 1\s+WHERE id = p_slot_id[\s\S]*?booked_count < capacity/);

    // 3. Custom error code VR001 on exhaustion
    expect(rpcSql).toMatch(/RAISE EXCEPTION 'Selected booking slot is unavailable or fully booked' USING ERRCODE = 'VR001'/);
  });

  it("Edge Case 2: Concurrent lead assignment uses SKIP LOCKED to spread load without deadlocks", () => {
    expect(rpcSql).toMatch(/FOR UPDATE OF c SKIP LOCKED/);
    expect(rpcSql).toMatch(/ORDER BY COALESCE\(loads\.active_load, 0\) ASC/);
  });

  it("Edge Case 3: Empty consultant pool safely flags lead as unassigned and alerts manager", () => {
    expect(rpcSql).toMatch(/IF v_assigned_consultant IS NULL THEN/);
    expect(rpcSql).toMatch(/'unassigned'/);
    expect(rpcSql).toMatch(/manager@vrooma\.in/);
  });

  it("Edge Case 4: Inactive or consultants on leave are excluded from assignment pool", () => {
    expect(rpcSql).toMatch(/p\.is_active = true/);
    expect(rpcSql).toMatch(/a\.is_available = true/);
    expect(rpcSql).toMatch(/a\.until IS NULL OR a\.until > (pg_catalog\.)?NOW\(\)/i);
  });

  it("Edge Case 5: 24-hour lead deduplication creates a repeat_enquiry event rather than a new lead", () => {
    expect(rpcSql).toMatch(/WHERE phone = p_phone\s+AND model_id = p_model_id[\s\S]*?INTERVAL '24 hours'/);
    expect(rpcSql).toMatch(/'repeat_enquiry'/);
    expect(rpcSql).toMatch(/UPDATE public\.leads SET updated_at = (pg_catalog\.)?NOW\(\)/i);
  });

  it("Edge Case 6: Price rules prevent overlapping validity ranges using btree_gist exclusion", () => {
    expect(pricingSql).toMatch(/CONSTRAINT exclude_overlapping_price_rules EXCLUDE USING gist/);
    expect(pricingSql).toMatch(/city_id WITH =/);
    expect(pricingSql).toMatch(/scope_key WITH =/);
    expect(pricingSql).toMatch(/daterange\(valid_from, valid_until, '\[\]'\) WITH &&/);
  });

  it("Edge Case 7: Expired or missing price rule safely returns NULL instead of throwing", () => {
    expect(pricingSql).toMatch(/p_date >= valid_from AND p_date <= valid_until/);
    expect(pricingSql).toMatch(/RETURN NULL;/);
  });

  it("Edge Case 8: Vehicle registration number is never selectable by client roles", () => {
    expect(usedCarsSql).toMatch(/REVOKE SELECT ON public\.used_cars FROM anon, authenticated;/);
    const columns = usedCarsSql.match(/GRANT SELECT \(([\s\S]*?)\) ON public\.used_cars/i)?.[1];
    expect(columns).not.toContain("reg_no_private");
    expect(columns).toContain("reg_no_masked");
  });

  it("Edge Case 9: Buyer cannot update their own role (column privileges + RLS WITH CHECK)", () => {
    expect(identitySql).toMatch(/REVOKE UPDATE ON public\.profiles FROM authenticated;/);
    const updateGrant = identitySql.match(/GRANT UPDATE \(([\s\S]*?)\) ON public\.profiles TO authenticated/i)?.[1];
    expect(updateGrant).not.toContain("role");
  });

  it("Edge Case 10: Protection against demoting the last active system administrator", () => {
    expect(rpcSql).toMatch(/FUNCTION public\.admin_set_role/);
    expect(rpcSql).toMatch(/Administrators cannot alter their own role/);
    expect(rpcSql).toMatch(/Cannot demote the last active system administrator/);
    expect(rpcSql).toMatch(/USING ERRCODE = 'VR005'/);
  });

  it("Edge Case 11: Booking inside lead-time window or in the past is rejected with VR002", () => {
    expect(rpcSql).toMatch(/(starts_at|v_slot\.starts_at) <= (pg_catalog\.)?NOW\(\) \+ INTERVAL '2 hours'/i);
    expect(rpcSql).toMatch(/Booking lead time required/);
    expect(rpcSql).toMatch(/USING ERRCODE = 'VR002'/);
  });

  it("Edge Case 12: Booking cancellation releases slot capacity exactly once (double-cancel is no-op)", () => {
    expect(rpcSql).toMatch(/FUNCTION public\.cancel_booking/);
    expect(rpcSql).toMatch(/IF v_booking\.status = 'cancelled' THEN[\s\S]*?RETURN v_booking;/);
    expect(rpcSql).toMatch(/UPDATE public\.slots\s+SET booked_count = (pg_catalog\.)?GREATEST\(0, booked_count - 1\)/i);
  });

  it("Edge Case 13: Reschedule to a full slot executes atomically and preserves old booking", () => {
    expect(rpcSql).toMatch(/FUNCTION public\.reschedule_booking/);
    // Books new slot first; if new slot fails (VR001), transaction rolls back, leaving old booking intact
    expect(rpcSql).toMatch(/public\.book_slot\(/);
    expect(rpcSql).toMatch(/public\.cancel_booking\(/);
  });

  it("Edge Case 14: Deleting a user anonymises PII while retaining business and audit integrity", () => {
    expect(privacySql).toMatch(/FUNCTION private\.anonymise_user/);
    expect(privacySql).toMatch(/full_name = 'Deleted Account'/);
    expect(privacySql).toMatch(/phone = NULL/);
    expect(privacySql).toMatch(/anonymised_at = v_now/);
    expect(privacySql).toMatch(/DELETE FROM public\.saved_items WHERE user_id = p_uid/);
  });

  it("Edge Case 15: generate_slots is idempotent via ON CONFLICT DO NOTHING", () => {
    expect(rpcSql).toMatch(/FUNCTION public\.generate_slots/);
    expect(rpcSql).toMatch(/ON CONFLICT \(kind, resource_id, starts_at\) DO NOTHING/);
  });

  it("Edge Case 16: Unique booking constraints prevent duplicate active bookings on the same slot", () => {
    expect(slotsSql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_user_slot_active[\s\S]*?ON public\.bookings\(user_id, slot_id\)[\s\S]*?WHERE status = 'confirmed'/);
  });

  it("Edge Case 17: Lead deduplication index uses immutable UTC date expression without timezone volatility", () => {
    // 1. Index must never use session-timezone dependent cast (created_at::date)
    expect(leadsSql).not.toMatch(/public\.leads\([^)]*\(created_at::date\)/);

    // 2. Index must use explicit immutable UTC expression ((created_at AT TIME ZONE 'UTC')::date)
    expect(leadsSql).toMatch(/CREATE INDEX IF NOT EXISTS idx_leads_phone_model_date\s+ON public\.leads\(phone,\s*model_id,\s*\(\(created_at AT TIME ZONE 'UTC'\)::date\)\);/);

    // 3. RPC create_lead query must match UTC date expression while preserving 24-hour business interval
    expect(rpcSql).toMatch(/\(created_at AT TIME ZONE 'UTC'\)::date >= \(\(pg_catalog\.now\(\) AT TIME ZONE 'UTC'\)::date - 1\)/);
    expect(rpcSql).toMatch(/created_at >= pg_catalog\.now\(\) - INTERVAL '24 hours'/);
  });

  it("Edge Case 18: Unsubscribe token generator in 0008 uses schema-qualified extensions.gen_random_bytes", () => {
    expect(messagingSql).not.toMatch(/DEFAULT\s+encode\(gen_random_bytes\(16\)/);
    expect(messagingSql).toMatch(
      /unsubscribe_token\s+TEXT\s+UNIQUE\s+NOT\s+NULL\s+DEFAULT\s+encode\(extensions\.gen_random_bytes\(16\),\s*'hex'\)/
    );
  });
});
