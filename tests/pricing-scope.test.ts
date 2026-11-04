/**
 * tests/pricing-scope.test.ts
 *
 * Comprehensive validation of Price Rule Scope Semantics and GiST Exclusion Constraints.
 * Tests:
 *   1. Static schema verification of 0004_pricing.sql:
 *      - Replaces fragile STABLE generated column with robust trigger-maintained scope_key.
 *      - Exclusion constraint on (city_id, scope_key, daterange).
 *      - BEFORE INSERT OR UPDATE trigger attachment.
 *   2. Scope Key Derivation Logic:
 *      - Variant-specific scope: 'v:<variant_id>'
 *      - Model + Fuel specific scope: 'm:<model_id>_<fuel>'
 *      - Model general scope: 'm:<model_id>_all'
 *      - Rejection when neither variant_id nor model_id is provided.
 *   3. GiST Exclusion Simulation:
 *      - Overlapping date-range rejection for matching city & scope.
 *      - Non-overlapping date-range acceptance for matching city & scope.
 *      - Different scopes do not conflict (e.g. variant vs model+fuel).
 *      - Different cities do not conflict for the same scope and dates.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");
const pricingSql = fs.readFileSync(path.join(MIGRATIONS_DIR, "0004_pricing.sql"), "utf-8");

// Pure TypeScript implementation mirroring private.maintain_price_rule_scope_key()
export function derivePriceRuleScopeKey(rule: {
  variant_id?: string | null;
  model_id?: string | null;
  fuel?: string | null;
}): string {
  if (rule.variant_id) {
    return `v:${rule.variant_id}`;
  }
  if (rule.model_id) {
    return `m:${rule.model_id}_${rule.fuel || "all"}`;
  }
  throw new Error("Price rule must specify either variant_id or model_id (VR004)");
}

// Simulates PostgreSQL daterange(valid_from, valid_until, '[]') && daterange(valid_from, valid_until, '[]')
export function dateRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA <= endB && endA >= startB;
}

// Simulates PostgreSQL GiST exclusion constraint on (city_id WITH =, scope_key WITH =, daterange(...) WITH &&)
export function checkPriceRuleExclusion(
  existingRules: Array<{ city_id: string; scope_key: string; valid_from: string; valid_until: string }>,
  newRule: { city_id: string; scope_key: string; valid_from: string; valid_until: string }
): { allowed: boolean; conflictWith?: (typeof existingRules)[0] } {
  for (const existing of existingRules) {
    if (
      existing.city_id === newRule.city_id &&
      existing.scope_key === newRule.scope_key &&
      dateRangesOverlap(existing.valid_from, existing.valid_until, newRule.valid_from, newRule.valid_until)
    ) {
      return { allowed: false, conflictWith: existing };
    }
  }
  return { allowed: true };
}

describe("0004_pricing.sql Schema & Trigger Architecture", () => {
  it("eliminates non-immutable generated expression error (SQLSTATE 42P17)", () => {
    // 1. Must NOT use GENERATED ALWAYS AS (...) STORED with enum cast
    expect(pricingSql).not.toMatch(/scope_key\s+TEXT\s+GENERATED\s+ALWAYS/i);
    expect(pricingSql).not.toMatch(/fuel::text[\s\S]*?STORED/i);

    // 2. Must use regular column with default
    expect(pricingSql).toMatch(/scope_key\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+''/i);
  });

  it("defines private.maintain_price_rule_scope_key trigger function with search_path safety", () => {
    expect(pricingSql).toMatch(/FUNCTION\s+private\.maintain_price_rule_scope_key\(\)/i);
    expect(pricingSql).toMatch(/SECURITY\s+DEFINER/i);
    expect(pricingSql).toMatch(/SET\s+search_path\s*=\s*''/i);
    expect(pricingSql).toMatch(/'v:'\s*\|\|\s*NEW\.variant_id::text/);
    expect(pricingSql).toMatch(/'m:'\s*\|\|\s*NEW\.model_id::text[\s\S]*?COALESCE\(NEW\.fuel::text,\s*'all'\)/);
    expect(pricingSql).toMatch(/VR004/);
  });

  it("attaches BEFORE INSERT OR UPDATE trigger to public.price_rules", () => {
    expect(pricingSql).toMatch(/DROP\s+TRIGGER\s+IF\s+EXISTS\s+trg_price_rules_scope_key\s+ON\s+public\.price_rules/i);
    expect(pricingSql).toMatch(
      /CREATE\s+TRIGGER\s+trg_price_rules_scope_key\s+BEFORE\s+INSERT\s+OR\s+UPDATE\s+ON\s+public\.price_rules\s+FOR\s+EACH\s+ROW\s+EXECUTE\s+FUNCTION\s+private\.maintain_price_rule_scope_key\(\)/i
    );
  });

  it("preserves strict GiST exclusion constraint on (city_id, scope_key, daterange)", () => {
    expect(pricingSql).toMatch(/CONSTRAINT\s+exclude_overlapping_price_rules\s+EXCLUDE\s+USING\s+gist/i);
    expect(pricingSql).toMatch(/city_id\s+WITH\s+=/);
    expect(pricingSql).toMatch(/scope_key\s+WITH\s+=/);
    expect(pricingSql).toMatch(/daterange\(valid_from,\s*valid_until,\s*'\[\]'\)\s+WITH\s+&&/);
  });

  it("defines index on (city_id, scope_key) for fast lookup", () => {
    expect(pricingSql).toMatch(/INDEX\s+IF\s+NOT\s+EXISTS\s+idx_price_rules_scope_key\s+ON\s+public\.price_rules\s*\(\s*city_id,\s*scope_key\s*\)/i);
  });
});

describe("Price Rule Scope Key Derivation & Collision Immunity", () => {
  const cityLucknow = "c0000001-0000-0000-0000-000000000001";
  const cityKanpur = "c0000001-0000-0000-0000-000000000002";
  const modelH = "d0000001-0000-0000-0000-000000000001";
  const modelC = "d0000001-0000-0000-0000-000000000002";
  const variantZX = "e0000001-0000-0000-0000-000000000001";
  const variantVX = "e0000001-0000-0000-0000-000000000002";

  it("generates variant-specific scope key ('v:<variant_id>') regardless of model_id presence", () => {
    // When both variant_id and model_id are present (like seed data), variant takes precedence
    const scopeWithModel = derivePriceRuleScopeKey({
      variant_id: variantZX,
      model_id: modelH,
      fuel: "petrol",
    });
    expect(scopeWithModel).toBe(`v:${variantZX}`);

    // When only variant_id is present
    const scopeWithoutModel = derivePriceRuleScopeKey({
      variant_id: variantZX,
    });
    expect(scopeWithoutModel).toBe(`v:${variantZX}`);
  });

  it("generates model + fuel specific scope key ('m:<model_id>_<fuel>') when variant is null", () => {
    const scopePetrol = derivePriceRuleScopeKey({
      variant_id: null,
      model_id: modelC,
      fuel: "petrol",
    });
    expect(scopePetrol).toBe(`m:${modelC}_petrol`);

    const scopeDiesel = derivePriceRuleScopeKey({
      variant_id: null,
      model_id: modelC,
      fuel: "diesel",
    });
    expect(scopeDiesel).toBe(`m:${modelC}_diesel`);
  });

  it("generates model general scope key ('m:<model_id>_all') when variant and fuel are null", () => {
    const scopeAll = derivePriceRuleScopeKey({
      variant_id: null,
      model_id: modelH,
      fuel: null,
    });
    expect(scopeAll).toBe(`m:${modelH}_all`);
  });

  it("throws error VR004 when neither variant_id nor model_id is specified", () => {
    expect(() =>
      derivePriceRuleScopeKey({
        variant_id: null,
        model_id: null,
        fuel: "petrol",
      })
    ).toThrow(/VR004/);
  });

  it("prevents accidental collisions between variant and model scopes", () => {
    const variantScope = derivePriceRuleScopeKey({ variant_id: "test-uuid" });
    const modelScope = derivePriceRuleScopeKey({ model_id: "test-uuid", fuel: "all" });

    // Explicit 'v:' and 'm:' prefixes ensure variant scope and model scope can NEVER collide
    expect(variantScope).not.toBe(modelScope);
    expect(variantScope).toBe("v:test-uuid");
    expect(modelScope).toBe("m:test-uuid_all");
  });

  it("rejects overlapping date ranges for identical city and scope", () => {
    const scopeKey = derivePriceRuleScopeKey({ variant_id: variantZX });
    const existing = [
      {
        city_id: cityLucknow,
        scope_key: scopeKey,
        valid_from: "2026-01-01",
        valid_until: "2026-06-30",
      },
    ];

    // Overlapping rule (e.g. 2026-06-01 to 2026-12-31 overlaps in June)
    const overlappingRule = {
      city_id: cityLucknow,
      scope_key: scopeKey,
      valid_from: "2026-06-01",
      valid_until: "2026-12-31",
    };

    const check = checkPriceRuleExclusion(existing, overlappingRule);
    expect(check.allowed).toBe(false);
    expect(check.conflictWith).toBeDefined();
  });

  it("accepts non-overlapping date ranges for identical city and scope", () => {
    const scopeKey = derivePriceRuleScopeKey({ variant_id: variantZX });
    const existing = [
      {
        city_id: cityLucknow,
        scope_key: scopeKey,
        valid_from: "2026-01-01",
        valid_until: "2026-06-30",
      },
    ];

    // Contiguous but non-overlapping rule (2026-07-01 to 2026-12-31)
    const nonOverlappingRule = {
      city_id: cityLucknow,
      scope_key: scopeKey,
      valid_from: "2026-07-01",
      valid_until: "2026-12-31",
    };

    const check = checkPriceRuleExclusion(existing, nonOverlappingRule);
    expect(check.allowed).toBe(true);
  });

  it("allows different scopes in the same city with identical or overlapping dates without conflict", () => {
    const variantScope = derivePriceRuleScopeKey({ variant_id: variantZX, model_id: modelH });
    const modelFuelScope = derivePriceRuleScopeKey({ variant_id: null, model_id: modelH, fuel: "petrol" });
    const modelAllScope = derivePriceRuleScopeKey({ variant_id: null, model_id: modelH, fuel: null });
    const otherVariantScope = derivePriceRuleScopeKey({ variant_id: variantVX, model_id: modelH });

    const existing = [
      {
        city_id: cityLucknow,
        scope_key: variantScope,
        valid_from: "2026-01-01",
        valid_until: "2026-12-31",
      },
    ];

    // Model+Fuel rule co-exists with Variant rule
    expect(
      checkPriceRuleExclusion(existing, {
        city_id: cityLucknow,
        scope_key: modelFuelScope,
        valid_from: "2026-01-01",
        valid_until: "2026-12-31",
      }).allowed
    ).toBe(true);

    // Model All rule co-exists with Variant rule
    expect(
      checkPriceRuleExclusion(existing, {
        city_id: cityLucknow,
        scope_key: modelAllScope,
        valid_from: "2026-01-01",
        valid_until: "2026-12-31",
      }).allowed
    ).toBe(true);

    // Different variant rule co-exists with Variant rule
    expect(
      checkPriceRuleExclusion(existing, {
        city_id: cityLucknow,
        scope_key: otherVariantScope,
        valid_from: "2026-01-01",
        valid_until: "2026-12-31",
      }).allowed
    ).toBe(true);
  });

  it("allows identical scope in different cities with identical dates without conflict", () => {
    const scopeKey = derivePriceRuleScopeKey({ variant_id: variantZX });
    const existing = [
      {
        city_id: cityLucknow,
        scope_key: scopeKey,
        valid_from: "2026-01-01",
        valid_until: "2026-12-31",
      },
    ];

    // Same scope in Kanpur during the same period is valid
    const check = checkPriceRuleExclusion(existing, {
      city_id: cityKanpur,
      scope_key: scopeKey,
      valid_from: "2026-01-01",
      valid_until: "2026-12-31",
    });

    expect(check.allowed).toBe(true);
  });
});

