/**
 * tests/rls-matrix.test.ts
 *
 * Automated verification of Section 3 RLS Matrix and Policy Contracts.
 * Tests:
 *   1. All 35 tables have explicit RLS enabled.
 *   2. Policy definition verification against the 5 personas (anon, buyer, consultant, manager, admin).
 *   3. Buyer isolation: Buyer A cannot read or write Buyer B's bookings, enquiries, saved items, or data requests.
 *   4. Used car reg number privacy: reg_no_private is omitted from client SELECT grants and only exposed via staff RPC.
 *   5. Operational table lock down: messages_outbox, rate_limits, idempotency_keys, newsletter_subscribers have zero client policies.
 *   6. Consultant barrier: Consultants cannot read used_car_sales_history or used_car_price_suggestions.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ALL_35_TABLES } from "../scripts/rls-matrix";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");
const rlsSql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0010_rls_policies.sql"), "utf-8");
const usedCarsSql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0005_used_cars.sql"), "utf-8");
const identitySql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0002_identity_profiles_consents.sql"), "utf-8");
const rpcSql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0011_functions_rpc.sql"), "utf-8");
const storageSql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0013_storage.sql"), "utf-8");

describe("Phase 2: RLS Matrix Coverage & Policy Guarantees", () => {
  it("enables Row Level Security on all 35 database tables", () => {
    expect(ALL_35_TABLES).toHaveLength(35);

    for (const table of ALL_35_TABLES) {
      const regex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i");
      expect(rlsSql).toMatch(regex);
    }
  });

  it("prohibits anon and buyer direct access to raw price_rules table", () => {
    // Only staff and admin have policies on price_rules
    expect(rlsSql).toMatch(/CREATE POLICY "Staff read price rules" ON public\.price_rules/);
    expect(rlsSql).toMatch(/CREATE POLICY "Admin write price rules" ON public\.price_rules/);
    expect(rlsSql).not.toMatch(/CREATE POLICY "Public read price rules"/);
    expect(rlsSql).not.toMatch(/CREATE POLICY "Buyer read price rules"/);
  });

  it("strictly revokes direct SELECT on used_cars.reg_no_private", () => {
    expect(usedCarsSql).toContain("REVOKE SELECT ON public.used_cars FROM anon, authenticated;");
    expect(usedCarsSql).toContain("reg_no_masked");
    // Ensure reg_no_private is NOT in the granted SELECT columns
    const grantMatch = usedCarsSql.match(/GRANT\s+SELECT\s*\(([\s\S]*?)\)\s*ON\s*public\.used_cars/i);
    expect(grantMatch).not.toBeNull();
    const columns = grantMatch![1];
    expect(columns).not.toContain("reg_no_private");
    expect(columns).toContain("reg_no_masked");
  });

  it("exposes unmasked used car reg number ONLY to staff via audited security definer RPC", () => {
    expect(rpcSql).toMatch(/FUNCTION\s+public\.get_used_car_reg\s*\(/i);
    expect(rpcSql).toMatch(/IF NOT private\.is_staff\(\) THEN/);
    expect(rpcSql).toMatch(/RAISE EXCEPTION [^;]*?USING ERRCODE = 'VR005'/);
    expect(rpcSql).toMatch(/INSERT INTO public\.audit_log/);
  });

  it("enforces buyer row isolation: buyers can only access own profile, bookings, saved items, trade-in, and data requests", () => {
    // Profiles
    expect(rlsSql).toMatch(/CREATE POLICY "Users read own profile" ON public\.profiles[\s\S]*?USING\s*\(id = \(SELECT auth\.uid\(\)\)\)/);
    expect(rlsSql).toMatch(/CREATE POLICY "Users update own profile" ON public\.profiles[\s\S]*?WITH CHECK\s*\(id = \(SELECT auth\.uid\(\)\)/);

    // Bookings
    expect(rlsSql).toMatch(/CREATE POLICY "Buyers read own bookings" ON public\.bookings[\s\S]*?USING\s*\(user_id = \(SELECT auth\.uid\(\)\)\)/);

    // Saved Items
    expect(rlsSql).toMatch(/CREATE POLICY "Buyers manage own saved items" ON public\.saved_items[\s\S]*?USING\s*\(user_id = \(SELECT auth\.uid\(\)\)\)/);

    // Trade-in Requests
    expect(rlsSql).toMatch(/CREATE POLICY "Buyers manage own trade in requests" ON public\.trade_in_requests[\s\S]*?USING\s*\(user_id = \(SELECT auth\.uid\(\)\)\)/);

    // Data Requests
    expect(rlsSql).toMatch(/CREATE POLICY "Users read own data requests" ON public\.data_requests[\s\S]*?USING\s*\(user_id = \(SELECT auth\.uid\(\)\)\)/);
  });

  it("strictly bars consultants from used car sales history and pricing suggestions (Manager/Admin only)", () => {
    expect(rlsSql).toMatch(/CREATE POLICY "Manager read write sales history" ON public\.used_car_sales_history[\s\S]*?USING\s*\(private\.is_manager\(\)\)/);
    expect(rlsSql).toMatch(/CREATE POLICY "Manager read write price suggestions" ON public\.used_car_price_suggestions[\s\S]*?USING\s*\(private\.is_manager\(\)\)/);

    // Assert NO consultant policy on these tables
    expect(rlsSql).not.toMatch(/Consultant.*?sales_history/i);
    expect(rlsSql).not.toMatch(/Consultant.*?price_suggestions/i);
  });

  it("locks operational and queue tables from all client roles (messages_outbox, rate_limits, idempotency_keys, newsletter_subscribers)", () => {
    // RLS enabled, but ZERO policies for anon or authenticated (only service_role bypasses RLS)
    expect(rlsSql).toMatch(/ALTER TABLE public\.messages_outbox ENABLE ROW LEVEL SECURITY;/);
    expect(rlsSql).toMatch(/ALTER TABLE public\.rate_limits ENABLE ROW LEVEL SECURITY;/);
    expect(rlsSql).toMatch(/ALTER TABLE public\.idempotency_keys ENABLE ROW LEVEL SECURITY;/);
    expect(rlsSql).toMatch(/ALTER TABLE public\.newsletter_subscribers ENABLE ROW LEVEL SECURITY;/);

    expect(rlsSql).not.toMatch(/ON public\.messages_outbox FOR/);
    expect(rlsSql).not.toMatch(/ON public\.rate_limits FOR/);
    expect(rlsSql).not.toMatch(/ON public\.idempotency_keys FOR/);
    expect(rlsSql).not.toMatch(/ON public\.newsletter_subscribers FOR/);
  });

  it("prevents self-role escalation at both column privilege and RLS WITH CHECK levels", () => {
    // Column privileges
    expect(identitySql).toMatch(/REVOKE UPDATE ON public\.profiles FROM authenticated;/);
    const grantUpdateMatch = identitySql.match(/GRANT\s+UPDATE\s*\(([\s\S]*?)\)\s*ON\s*public\.profiles\s*TO\s*authenticated/i);
    expect(grantUpdateMatch).not.toBeNull();
    const updateColumns = grantUpdateMatch![1];
    expect(updateColumns).not.toContain("role");
    expect(updateColumns).not.toContain("is_active");

    // RLS policy WITH CHECK
    expect(rlsSql).toMatch(/role = \(SELECT private\.current_role\(\)\)/);
  });

  describe("Storage Security Policies (0013_storage.sql)", () => {
    it("confines customer trade-in photo management strictly to own user folder without staff delete leakage", () => {
      // 1. Customer management policy applies only to authenticated user's own folder
      expect(storageSql).toMatch(/CREATE POLICY "Users manage own trade in photos"/);
      expect(storageSql).toMatch(/USING\s*\(\s*bucket_id = 'trade-in-photos'\s+AND\s+\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text\s*\)/);
      expect(storageSql).toMatch(/WITH CHECK\s*\(\s*bucket_id = 'trade-in-photos'\s+AND\s+\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text\s*\)/);

      // 2. Ensure customer management policy does NOT contain private.is_staff() in its USING clause
      const customerPolicyMatch = storageSql.match(
        /CREATE POLICY "Users manage own trade in photos"[\s\S]*?WITH CHECK/i
      );
      expect(customerPolicyMatch).not.toBeNull();
      expect(customerPolicyMatch![0]).not.toContain("private.is_staff()");

      // 3. Staff access is strictly restricted to FOR SELECT (no DELETE, UPDATE, or INSERT)
      expect(storageSql).toMatch(/CREATE POLICY "Staff view trade in photos"/);
      expect(storageSql).toMatch(
        /CREATE POLICY "Staff view trade in photos"\s+ON storage\.objects FOR SELECT TO authenticated\s+USING\s*\(\s*bucket_id = 'trade-in-photos'\s+AND private\.is_staff\(\)\s*\);/
      );

      // 4. Verify no remaining policy grants staff DELETE or UPDATE on trade-in-photos
      expect(storageSql).not.toMatch(/ON storage\.objects FOR (UPDATE|DELETE|ALL)[\s\S]*?private\.is_staff\(\)[\s\S]*?trade-in-photos/i);
    });

    it("drops prior policy definitions before creating new storage policies", () => {
      expect(storageSql).toContain('DROP POLICY IF EXISTS "Users manage own trade in photos" ON storage.objects;');
      expect(storageSql).toContain('DROP POLICY IF EXISTS "Staff view trade in photos" ON storage.objects;');
    });
  });
});
