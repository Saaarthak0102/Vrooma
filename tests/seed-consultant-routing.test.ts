import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { DEV_TEST_USERS } from "../scripts/seed-dev-users";

describe("seed-consultant-routing.sql Static Integrity & Security Audit", () => {
  const scriptPath = path.resolve(process.cwd(), "supabase/seed-consultant-routing.sql");
  const seedPath = path.resolve(process.cwd(), "supabase/seed.sql");

  const sqlContent = fs.readFileSync(scriptPath, "utf-8");
  const masterSeedContent = fs.readFileSync(seedPath, "utf-8");

  const EXPECTED_DEV_REF = "eobtzcwinjmimzisypca";
  const FORBIDDEN_PROD_REF = "ajumkjokagqfdikfguti";
  const FORBIDDEN_LEGACY_REF = "gmyrehlrmifxckszrdje";

  const CANONICAL_SHOWROOMS = {
    hazratganj: "a0000001-0000-0000-0000-000000000001",
    gomtiNagar: "a0000001-0000-0000-0000-000000000002",
    kanpur: "a0000001-0000-0000-0000-000000000003",
  };

  const CANONICAL_MODELS = {
    modelH: "d0000001-0000-0000-0000-000000000001",
    modelC: "d0000001-0000-0000-0000-000000000002",
  };

  const CANONICAL_RULES = [
    "0000000c-0000-0000-0000-000000000001",
    "0000000c-0000-0000-0000-000000000002",
    "0000000c-0000-0000-0000-000000000003",
    "0000000c-0000-0000-0000-000000000004",
  ];

  it("file exists and is non-empty", () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    expect(sqlContent.length).toBeGreaterThan(500);
  });

  it("encapsulates changes in a transaction with BEGIN and COMMIT", () => {
    expect(sqlContent).toMatch(/^\s*BEGIN\s*;/m);
    expect(sqlContent).toMatch(/COMMIT\s*;/m);
  });

  describe("Project Reference & Production Isolation Guards", () => {
    it("contains strict DEV project reference check for eobtzcwinjmimzisypca", () => {
      expect(sqlContent).toContain(EXPECTED_DEV_REF);
      expect(sqlContent).toMatch(/v_expected_dev_ref\s+CONSTANT\s+text\s*:=\s*'eobtzcwinjmimzisypca'/i);
    });

    it("hard-blocks production project ref ajumkjokagqfdikfguti", () => {
      expect(sqlContent).toContain(FORBIDDEN_PROD_REF);
      expect(sqlContent).toMatch(/v_forbidden_prod_ref\s+CONSTANT\s+text\s*:=\s*'ajumkjokagqfdikfguti'/i);
      expect(sqlContent).toMatch(/CRITICAL SECURITY BLOCK.*PRODUCTION/i);
    });

    it("hard-blocks deleted legacy project ref gmyrehlrmifxckszrdje", () => {
      expect(sqlContent).toContain(FORBIDDEN_LEGACY_REF);
      expect(sqlContent).toMatch(/v_forbidden_legacy_ref\s+CONSTANT\s+text\s*:=\s*'gmyrehlrmifxckszrdje'/i);
      expect(sqlContent).toMatch(/CRITICAL SECURITY BLOCK.*legacy/i);
    });

    it("validates pooled connection session_user prefix postgres.<ref>", () => {
      expect(sqlContent).toMatch(/v_session_user\s*~\s*'\^postgres/i);
    });
  });

  describe("Catalog & Foreign Key Dependency Validation", () => {
    it("verifies all referenced showrooms exist in master seed.sql", () => {
      for (const [name, id] of Object.entries(CANONICAL_SHOWROOMS)) {
        expect(sqlContent).toContain(id);
        expect(masterSeedContent).toContain(id);
      }
    });

    it("verifies all referenced models exist in master seed.sql", () => {
      for (const [name, id] of Object.entries(CANONICAL_MODELS)) {
        expect(sqlContent).toContain(id);
        expect(masterSeedContent).toContain(id);
      }
    });

    it("defines all 4 canonical routing rules with correct priority and showroom binding", () => {
      for (const ruleId of CANONICAL_RULES) {
        expect(sqlContent).toContain(ruleId);
      }

      // Rule 1: Hazratganj + Model H
      expect(sqlContent).toContain(`'${CANONICAL_RULES[0]}'::uuid,\n    '${CANONICAL_SHOWROOMS.hazratganj}'::uuid,\n    '${CANONICAL_MODELS.modelH}'::uuid`);
      // Rule 2: Hazratganj + Model C
      expect(sqlContent).toContain(`'${CANONICAL_RULES[1]}'::uuid,\n    '${CANONICAL_SHOWROOMS.hazratganj}'::uuid,\n    '${CANONICAL_MODELS.modelC}'::uuid`);
      // Rule 3: Gomti Nagar + Model H
      expect(sqlContent).toContain(`'${CANONICAL_RULES[2]}'::uuid,\n    '${CANONICAL_SHOWROOMS.gomtiNagar}'::uuid,\n    '${CANONICAL_MODELS.modelH}'::uuid`);
      // Rule 4: Kanpur + NULL (Catch-all)
      expect(sqlContent).toContain(`'${CANONICAL_RULES[3]}'::uuid,\n    '${CANONICAL_SHOWROOMS.kanpur}'::uuid,\n    NULL`);
    });
  });

  describe("Persona Mapping to Canonical DEV Users", () => {
    const consultants = DEV_TEST_USERS.filter((u) => u.role === "consultant");
    const nonConsultants = DEV_TEST_USERS.filter((u) => u.role !== "consultant");

    it("identifies exactly 6 consultant personas from DEV_TEST_USERS", () => {
      expect(consultants).toHaveLength(6);
      const emails = consultants.map((c) => c.email);
      expect(emails).toEqual([
        "dev-consultant@vrooma.in",
        "rohit.verma@vrooma.in",
        "ananya.shukla@vrooma.in",
        "faizan.khan@vrooma.in",
        "deepak.tripathi@vrooma.in",
        "pooja.singh@vrooma.in",
      ]);
    });

    it("maps all 6 consultant IDs into the candidate consultant pools", () => {
      for (const consultant of consultants) {
        expect(sqlContent).toContain(consultant.id);
      }
    });

    it("strictly excludes non-consultant personas (buyer, manager, admin) from assignment pools", () => {
      expect(nonConsultants).toHaveLength(3);
      for (const user of nonConsultants) {
        expect(sqlContent).not.toContain(user.id);
      }
    });

    it("ensures Hazratganj consultants are strictly mapped to Hazratganj rules", () => {
      const hazratganjConsultantIds = [
        "00000000-0000-0000-0000-000000000010", // dev-consultant
        "00000000-0000-0000-0000-000000000011", // Rohit Verma
        "00000000-0000-0000-0000-000000000012", // Ananya Shukla
      ];

      for (const cid of hazratganjConsultantIds) {
        // Must be in Rule 1 or Rule 2
        const inRule1 = sqlContent.includes(`('${CANONICAL_RULES[0]}'::uuid, '${cid}'::uuid)`);
        const inRule2 = sqlContent.includes(`('${CANONICAL_RULES[1]}'::uuid, '${cid}'::uuid)`);
        expect(inRule1 || inRule2).toBe(true);

        // Must NOT be in Rule 3 (Gomti Nagar) or Rule 4 (Kanpur)
        expect(sqlContent.includes(`('${CANONICAL_RULES[2]}'::uuid, '${cid}'::uuid)`)).toBe(false);
        expect(sqlContent.includes(`('${CANONICAL_RULES[3]}'::uuid, '${cid}'::uuid)`)).toBe(false);
      }
    });

    it("ensures Gomti Nagar consultants are strictly mapped to Gomti Nagar rule", () => {
      const gomtiConsultantIds = [
        "00000000-0000-0000-0000-000000000013", // Faizan Khan
        "00000000-0000-0000-0000-000000000014", // Deepak Tripathi
      ];

      for (const cid of gomtiConsultantIds) {
        // Must be in Rule 3
        expect(sqlContent.includes(`('${CANONICAL_RULES[2]}'::uuid, '${cid}'::uuid)`)).toBe(true);

        // Must NOT be in Rule 1, 2, or 4
        expect(sqlContent.includes(`('${CANONICAL_RULES[0]}'::uuid, '${cid}'::uuid)`)).toBe(false);
        expect(sqlContent.includes(`('${CANONICAL_RULES[1]}'::uuid, '${cid}'::uuid)`)).toBe(false);
        expect(sqlContent.includes(`('${CANONICAL_RULES[3]}'::uuid, '${cid}'::uuid)`)).toBe(false);
      }
    });

    it("ensures Kanpur consultant is strictly mapped to Kanpur rule", () => {
      const kanpurConsultantId = "00000000-0000-0000-0000-000000000015"; // Pooja Singh

      // Must be in Rule 4
      expect(sqlContent.includes(`('${CANONICAL_RULES[3]}'::uuid, '${kanpurConsultantId}'::uuid)`)).toBe(true);

      // Must NOT be in Rule 1, 2, or 3
      expect(sqlContent.includes(`('${CANONICAL_RULES[0]}'::uuid, '${kanpurConsultantId}'::uuid)`)).toBe(false);
      expect(sqlContent.includes(`('${CANONICAL_RULES[1]}'::uuid, '${kanpurConsultantId}'::uuid)`)).toBe(false);
      expect(sqlContent.includes(`('${CANONICAL_RULES[2]}'::uuid, '${kanpurConsultantId}'::uuid)`)).toBe(false);
    });
  });

  describe("Idempotency & Database Integrity Controls", () => {
    it("uses ON CONFLICT (id) DO UPDATE for assignment_rules", () => {
      expect(sqlContent).toMatch(/ON\s+CONFLICT\s*\(id\)\s+DO\s+UPDATE\s+SET/i);
      expect(sqlContent).toContain("showroom_id = EXCLUDED.showroom_id");
      expect(sqlContent).toContain("model_id    = EXCLUDED.model_id");
      expect(sqlContent).toContain("priority    = EXCLUDED.priority");
      expect(sqlContent).toContain("is_active   = EXCLUDED.is_active");
    });

    it("uses ON CONFLICT (rule_id, consultant_id) DO NOTHING for assignment_rule_consultants", () => {
      expect(sqlContent).toMatch(/ON\s+CONFLICT\s*\(rule_id,\s*consultant_id\)\s+DO\s+NOTHING/i);
    });

    it("enforces staff_showrooms join to prevent mismatched assignments", () => {
      expect(sqlContent).toMatch(/JOIN\s+public\.staff_showrooms\s+ss\s+ON\s+ss\.profile_id\s*=\s*p\.id\s+AND\s+ss\.showroom_id\s*=\s*cc\.showroom_id/i);
    });

    it("enforces profile role = 'consultant' and is_active = true", () => {
      expect(sqlContent).toMatch(/p\.role\s*=\s*'consultant'/i);
      expect(sqlContent).toMatch(/p\.is_active\s*=\s*true/i);
    });

    it("validates all UUIDs conform strictly to RFC 4122 format", () => {
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
      const matches = sqlContent.match(uuidRegex) || [];
      expect(matches.length).toBeGreaterThan(15);
      for (const uuid of matches) {
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      }
    });

    it("includes read-only verification queries at end of script", () => {
      expect(sqlContent).toContain("Query A: Routing rules overview");
      expect(sqlContent).toContain("Query B: Detailed consultant membership across rules");
      expect(sqlContent).toContain("Query C: Auto-assignment test probe");
    });
  });
});
