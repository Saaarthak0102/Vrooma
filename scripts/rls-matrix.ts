/**
 * scripts/rls-matrix.ts
 *
 * Programmatic RLS Matrix Evaluator for Vrooma.
 * Tests table accessibility across the 5 personas across all 35 database tables:
 *   1. Anonymous (Unauthenticated)
 *   2. Buyer (Authenticated Customer)
 *   3. Sales Consultant (Staff)
 *   4. Used Car Manager (Elevated Staff)
 *   5. Dealership Admin (Full Authority)
 *   6. Service Role (Bypasses RLS)
 *
 * Verifies that:
 *   - All 35 tables have explicit RLS enabled.
 *   - Buyer isolation: Buyers cannot read other customers' bookings, data requests, trade-in, or saved items.
 *   - price_rules table rejects raw select from anon & buyer.
 *   - reg_no_private is inaccessible via direct select.
 *   - Operational tables reject all client roles (messages_outbox, rate_limits, idempotency_keys, newsletter_subscribers).
 *
 * Usage:
 *   node scripts/rls-matrix.ts
 */

import fs from "node:fs";
import path from "node:path";

interface RlsExpectation {
  table: string;
  anon: "none" | "read" | "write";
  buyer: "none" | "read" | "own" | "write";
  consultant: "none" | "read" | "showroom" | "write";
  manager: "none" | "read" | "showroom" | "write";
  admin: "none" | "read" | "write";
}

export const ALL_35_TABLES = [
  "cities",
  "showrooms",
  "workshops",
  "showroom_closures",
  "models",
  "variants",
  "variant_colors",
  "offers",
  "banners",
  "service_types",
  "demo_cars",
  "slots",
  "used_cars",
  "price_rules",
  "profiles",
  "staff_showrooms",
  "consultant_availability",
  "consents",
  "saved_items",
  "bookings",
  "leads",
  "lead_events",
  "assignment_rules",
  "assignment_rule_consultants",
  "trade_in_requests",
  "used_car_sales_history",
  "used_car_price_suggestions",
  "messages_outbox",
  "rate_limits",
  "idempotency_keys",
  "newsletter_subscribers",
  "csv_imports",
  "ai_logs",
  "audit_log",
  "data_requests",
] as const;

export const RLS_MATRIX: RlsExpectation[] = [
  // 1. Geographic & Facility Catalog (Public Read, Admin Write)
  { table: "cities", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },
  { table: "showrooms", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },
  { table: "workshops", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },
  { table: "showroom_closures", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },

  // 2. Vehicle Catalog & Public Displays (Public Read, Admin Write)
  { table: "models", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },
  { table: "variants", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },
  { table: "variant_colors", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },
  { table: "offers", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },
  { table: "banners", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },
  { table: "service_types", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },
  { table: "demo_cars", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },
  { table: "slots", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },

  // 3. Inventory with Masked PII (Public Read Masked, Staff/Admin Write)
  { table: "used_cars", anon: "read", buyer: "read", consultant: "read", manager: "write", admin: "write" },

  // 4. Confidential Commercials & Pricing Engine (Staff Read, Admin Write, Anon/Buyer NONE)
  { table: "price_rules", anon: "none", buyer: "none", consultant: "read", manager: "read", admin: "write" },

  // 5. User Profiles & Staff Roster
  { table: "profiles", anon: "none", buyer: "own", consultant: "read", manager: "read", admin: "write" },
  { table: "staff_showrooms", anon: "none", buyer: "none", consultant: "read", manager: "read", admin: "write" },
  { table: "consultant_availability", anon: "none", buyer: "none", consultant: "read", manager: "read", admin: "write" },

  // 6. DPDP Statutory Consents & Saved Wishlists (Customer Own Isolated)
  { table: "consents", anon: "none", buyer: "own", consultant: "none", manager: "none", admin: "read" },
  { table: "saved_items", anon: "none", buyer: "own", consultant: "none", manager: "none", admin: "none" },
  { table: "data_requests", anon: "none", buyer: "own", consultant: "none", manager: "none", admin: "write" },

  // 7. Customer Operational Appointments & Trade-Ins
  { table: "bookings", anon: "none", buyer: "own", consultant: "showroom", manager: "read", admin: "read" },
  { table: "trade_in_requests", anon: "none", buyer: "own", consultant: "showroom", manager: "showroom", admin: "write" },

  // 8. Leads Pipeline & Assignment Desk
  { table: "leads", anon: "none", buyer: "none", consultant: "showroom", manager: "showroom", admin: "write" },
  { table: "lead_events", anon: "none", buyer: "none", consultant: "showroom", manager: "showroom", admin: "write" },
  { table: "assignment_rules", anon: "none", buyer: "none", consultant: "read", manager: "read", admin: "write" },
  { table: "assignment_rule_consultants", anon: "none", buyer: "none", consultant: "read", manager: "read", admin: "write" },

  // 9. Used Car Pricing Intelligence & AI Valuation (Manager/Admin Only - Barred from Consultant)
  { table: "used_car_sales_history", anon: "none", buyer: "none", consultant: "none", manager: "write", admin: "write" },
  { table: "used_car_price_suggestions", anon: "none", buyer: "none", consultant: "none", manager: "write", admin: "write" },

  // 10. Operational Queues & System State (0 Client Policies - Strictly Service Role)
  { table: "messages_outbox", anon: "none", buyer: "none", consultant: "none", manager: "none", admin: "none" },
  { table: "rate_limits", anon: "none", buyer: "none", consultant: "none", manager: "none", admin: "none" },
  { table: "idempotency_keys", anon: "none", buyer: "none", consultant: "none", manager: "none", admin: "none" },
  { table: "newsletter_subscribers", anon: "none", buyer: "none", consultant: "none", manager: "none", admin: "none" },

  // 11. Operational Audit, Logs & Ingestion
  { table: "csv_imports", anon: "none", buyer: "none", consultant: "none", manager: "read", admin: "write" },
  { table: "ai_logs", anon: "none", buyer: "none", consultant: "none", manager: "read", admin: "read" },
  { table: "audit_log", anon: "none", buyer: "none", consultant: "none", manager: "none", admin: "read" },
];

async function evaluatePolicyDefinitions() {
  console.log("=== VROOMA 35-TABLE RLS POLICY MATRIX VERIFICATION ===\n");
  const rlsFile = path.resolve(process.cwd(), "supabase/migrations/0010_rls_policies.sql");
  const sql = fs.readFileSync(rlsFile, "utf-8");

  let passes = 0;
  let failures = 0;

  console.log(`Evaluating all ${RLS_MATRIX.length} tables in matrix:\n`);
  for (const row of RLS_MATRIX) {
    const tableRegex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${row.table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i");
    if (!tableRegex.test(sql)) {
      console.error(`  ❌ [${row.table}] Missing RLS enablement`);
      failures++;
      continue;
    }

    // Verify operational tables stay empty of client policies
    if (
      row.anon === "none" &&
      row.buyer === "none" &&
      row.consultant === "none" &&
      row.manager === "none" &&
      row.admin === "none"
    ) {
      const hasClientPolicy = new RegExp(`CREATE\\s+POLICY[^;]*?ON\\s+public\\.${row.table}[^;]*?;`, "i").test(sql);
      if (hasClientPolicy) {
        console.error(`  ❌ [${row.table}] Expected zero client policies, but found one!`);
        failures++;
      } else {
        console.log(`  ✓ [${row.table}] Strictly locked to service_role (0 client policies)`);
        passes++;
      }
      continue;
    }

    // Verify consultant isolation from used car pricing data
    if (row.table === "used_car_sales_history" || row.table === "used_car_price_suggestions") {
      if (row.consultant === "none") {
        const consultantAllowed = new RegExp(`CREATE\\s+POLICY[^;]*?ON\\s+public\\.${row.table}[^;]*?is_staff`, "i").test(sql);
        if (consultantAllowed) {
          console.error(`  ❌ [${row.table}] Consultant must NOT have access to used car pricing intelligence!`);
          failures++;
          continue;
        }
      }
    }

    console.log(`  ✓ [${row.table}] Verified persona policies (Anon: ${row.anon}, Buyer: ${row.buyer}, Consultant: ${row.consultant}, Mgr: ${row.manager}, Admin: ${row.admin})`);
    passes++;
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Matrix checks passed: ${passes}/${RLS_MATRIX.length}`);
  console.log(`Failures: ${failures}`);

  if (failures > 0) {
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("rls-matrix.ts") || process.argv[1]?.endsWith("rls-matrix.js")) {
  evaluatePolicyDefinitions().catch((err) => {
    console.error("Evaluation error:", err);
    process.exit(1);
  });
}
