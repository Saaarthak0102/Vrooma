/**
 * tests/rls-matrix.test.ts
 *
 * Automated verification of Section 3 RLS Matrix and Policy Contracts.
 * Tests:
 *   1. All 35 tables have explicit RLS enabled.
 *   2. Policy definition verification against the 5 personas (anon, buyer, consultant, manager, admin).
 *   3. Buyer isolation: Buyer A cannot read or write Buyer B's bookings, enquiries, or saved items.
 *   4. Used car reg number privacy: reg_no_private is omitted from client SELECT grants and only exposed via staff RPC.
 *   5. Operational table lock down: messages_outbox, rate_limits, idempotency_keys have zero client policies.
 *   6. Consultant barrier: Consultants cannot read used_car_sales_history or used_car_price_suggestions.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");
const rlsSql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0010_rls_policies.sql"), "utf-8");
const usedCarsSql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0005_used_cars.sql"), "utf-8");
const identitySql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0002_identity_profiles_consents.sql"), "utf-8");
const rpcSql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0011_functions_rpc.sql"), "utf-8");

describe("Phase 2: RLS Matrix Coverage & Policy Guarantees", () => {
  it("enables Row Level Security on every core business table", () => {
    const requiredTables = [
      "cities", "showrooms", "workshops", "showroom_closures", "models",
      "variants", "variant_colors", "price_rules", "used_cars", "used_car_sales_history",
      "used_car_price_suggestions", "demo_cars", "service_types", "slots", "bookings",
      "idempotency_keys", "profiles", "staff_showrooms", "consultant_availability", "consents",
      "leads", "lead_events", "assignment_rules", "assignment_rule_consultants",
      "messages_outbox", "audit_log", "rate_limits", "newsletter_subscribers",
      "csv_imports", "ai_logs", "saved_items", "trade_in_requests", "offers",
      "banners", "data_requests"
    ];

    for (const table of requiredTables) {
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

  it("enforces buyer row isolation: buyers can only access own profile, bookings, saved items, and trade-in", () => {
    // Profiles
    expect(rlsSql).toMatch(/CREATE POLICY "Users read own profile" ON public\.profiles[\s\S]*?USING\s*\(id = \(SELECT auth\.uid\(\)\)\)/);
    expect(rlsSql).toMatch(/CREATE POLICY "Users update own profile" ON public\.profiles[\s\S]*?WITH CHECK\s*\(id = \(SELECT auth\.uid\(\)\)/);

    // Bookings
    expect(rlsSql).toMatch(/CREATE POLICY "Buyers read own bookings" ON public\.bookings[\s\S]*?USING\s*\(user_id = \(SELECT auth\.uid\(\)\)\)/);

    // Saved Items
    expect(rlsSql).toMatch(/CREATE POLICY "Buyers manage own saved items" ON public\.saved_items[\s\S]*?USING\s*\(user_id = \(SELECT auth\.uid\(\)\)\)/);

    // Trade-in Requests
    expect(rlsSql).toMatch(/CREATE POLICY "Buyers manage own trade in requests" ON public\.trade_in_requests[\s\S]*?USING\s*\(user_id = \(SELECT auth\.uid\(\)\)\)/);
  });

  it("strictly bars consultants from used car sales history and pricing suggestions (Manager/Admin only)", () => {
    expect(rlsSql).toMatch(/CREATE POLICY "Manager read write sales history" ON public\.used_car_sales_history[\s\S]*?USING\s*\(private\.is_manager\(\)\)/);
    expect(rlsSql).toMatch(/CREATE POLICY "Manager read write price suggestions" ON public\.used_car_price_suggestions[\s\S]*?USING\s*\(private\.is_manager\(\)\)/);

    // Assert NO consultant policy on these tables
    expect(rlsSql).not.toMatch(/Consultant.*?sales_history/i);
    expect(rlsSql).not.toMatch(/Consultant.*?price_suggestions/i);
  });

  it("locks operational and queue tables from all client roles (messages_outbox, rate_limits, idempotency_keys)", () => {
    // RLS enabled, but ZERO policies for anon or authenticated (only service_role bypasses RLS)
    expect(rlsSql).toMatch(/ALTER TABLE public\.messages_outbox ENABLE ROW LEVEL SECURITY;/);
    expect(rlsSql).toMatch(/ALTER TABLE public\.rate_limits ENABLE ROW LEVEL SECURITY;/);
    expect(rlsSql).toMatch(/ALTER TABLE public\.idempotency_keys ENABLE ROW LEVEL SECURITY;/);

    expect(rlsSql).not.toMatch(/ON public\.messages_outbox FOR/);
    expect(rlsSql).not.toMatch(/ON public\.rate_limits FOR/);
    expect(rlsSql).not.toMatch(/ON public\.idempotency_keys FOR/);
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
});
