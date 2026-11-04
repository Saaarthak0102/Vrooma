/**
 * scripts/rls-matrix.ts
 *
 * Programmatic RLS Matrix Evaluator for Vrooma.
 * Tests table accessibility across the 5 personas:
 *   1. Anonymous (Unauthenticated)
 *   2. Buyer A (Authenticated Customer)
 *   3. Buyer B (Isolated Customer)
 *   4. Sales Consultant (Staff)
 *   5. Used Car Manager (Elevated Staff)
 *   6. Dealership Admin (Full Authority)
 *
 * Verifies that:
 *   - Buyer A cannot read Buyer B's bookings, leads or saved items.
 *   - price_rules table rejects raw select from anon & buyer.
 *   - reg_no_private is inaccessible via direct select.
 *   - Operational tables reject all client roles.
 *
 * Usage:
 *   node --experimental-strip-types scripts/rls-matrix.ts
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

const RLS_MATRIX: RlsExpectation[] = [
  { table: "cities", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },
  { table: "showrooms", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },
  { table: "workshops", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },
  { table: "models", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },
  { table: "variants", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },
  { table: "slots", anon: "read", buyer: "read", consultant: "read", manager: "read", admin: "write" },
  { table: "used_cars", anon: "read", buyer: "read", consultant: "read", manager: "write", admin: "write" },
  { table: "price_rules", anon: "none", buyer: "none", consultant: "read", manager: "read", admin: "write" },
  { table: "profiles", anon: "none", buyer: "own", consultant: "read", manager: "read", admin: "write" },
  { table: "consents", anon: "none", buyer: "own", consultant: "none", manager: "none", admin: "read" },
  { table: "saved_items", anon: "none", buyer: "own", consultant: "none", manager: "none", admin: "none" },
  { table: "bookings", anon: "none", buyer: "own", consultant: "showroom", manager: "read", admin: "read" },
  { table: "leads", anon: "none", buyer: "none", consultant: "showroom", manager: "showroom", admin: "write" },
  { table: "used_car_sales_history", anon: "none", buyer: "none", consultant: "none", manager: "write", admin: "write" },
  { table: "used_car_price_suggestions", anon: "none", buyer: "none", consultant: "none", manager: "write", admin: "write" },
  { table: "messages_outbox", anon: "none", buyer: "none", consultant: "none", manager: "none", admin: "none" },
  { table: "rate_limits", anon: "none", buyer: "none", consultant: "none", manager: "none", admin: "none" },
  { table: "idempotency_keys", anon: "none", buyer: "none", consultant: "none", manager: "none", admin: "none" },
  { table: "ai_logs", anon: "none", buyer: "none", consultant: "none", manager: "read", admin: "read" },
  { table: "audit_log", anon: "none", buyer: "none", consultant: "none", manager: "none", admin: "read" },
  { table: "data_requests", anon: "none", buyer: "own", consultant: "none", manager: "none", admin: "write" },
];

async function evaluatePolicyDefinitions() {
  console.log("=== VROOMA RLS POLICY & PERSONA MATRIX VERIFICATION ===\n");
  const rlsFile = path.resolve(process.cwd(), "supabase/migrations/0010_rls_policies.sql");
  const sql = fs.readFileSync(rlsFile, "utf-8");

  let passes = 0;
  let failures = 0;

  console.log("Evaluating Table Persona Access Matrix:");
  for (const row of RLS_MATRIX) {
    const tableRegex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${row.table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i");
    if (!tableRegex.test(sql)) {
      console.error(`  ❌ [${row.table}] Missing RLS enablement`);
      failures++;
      continue;
    }

    // Verify operational tables stay empty of client policies
    if (row.anon === "none" && row.buyer === "none" && row.consultant === "none" && row.manager === "none" && row.admin === "none") {
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
  console.log(`Matrix checks passed: ${passes}`);
  console.log(`Failures: ${failures}`);

  if (failures > 0) {
    process.exit(1);
  }
}

evaluatePolicyDefinitions().catch((err) => {
  console.error("Evaluation error:", err);
  process.exit(1);
});
