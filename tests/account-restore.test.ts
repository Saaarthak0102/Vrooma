import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { isRestorableAccount, deletionDeadline, DELETION_GRACE_DAYS } from "@/lib/account-restore";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-11-07T10:00:00Z");
const ago = (days: number) => new Date(now - days * DAY).toISOString();
const buyer = { role: "buyer", is_active: false, anonymised_at: null };

describe("isRestorableAccount", () => {
  it("allows a buyer who asked for erasure inside the window", () => {
    expect(isRestorableAccount({ ...buyer, deleted_at: ago(1) }, now)).toBe(true);
    expect(isRestorableAccount({ ...buyer, deleted_at: ago(6.9) }, now)).toBe(true);
  });

  it("refuses once the 7 days are over", () => {
    expect(isRestorableAccount({ ...buyer, deleted_at: ago(DELETION_GRACE_DAYS) }, now)).toBe(false);
    expect(isRestorableAccount({ ...buyer, deleted_at: ago(30) }, now)).toBe(false);
  });

  it("refuses anonymised, active, staff and admin-disabled accounts", () => {
    expect(isRestorableAccount({ ...buyer, deleted_at: ago(1), anonymised_at: ago(0) }, now)).toBe(false);
    expect(isRestorableAccount({ ...buyer, is_active: true, deleted_at: ago(1) }, now)).toBe(false);
    expect(isRestorableAccount({ ...buyer, role: "consultant", deleted_at: ago(1) }, now)).toBe(false);
    // Disabled by an admin: deactivated but never asked for erasure.
    expect(isRestorableAccount({ ...buyer, deleted_at: null }, now)).toBe(false);
    expect(isRestorableAccount(null, now)).toBe(false);
    expect(isRestorableAccount({ ...buyer, deleted_at: "not a date" }, now)).toBe(false);
  });

  it("computes the permanent-erasure date", () => {
    const d = deletionDeadline("2026-11-01T00:00:00Z");
    expect(d.toISOString()).toBe("2026-11-08T00:00:00.000Z");
  });
});

describe("migration 0033 cancel_account_deletion", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/0033_cancel_account_deletion.sql"), "utf8");

  it("uses the same 7-day window as finalize-deletions and is not callable by anon", () => {
    expect(sql).toMatch(/INTERVAL '7 days'/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.cancel_account_deletion\(\) FROM PUBLIC, anon/);
    expect(sql).toMatch(/SECURITY DEFINER SET search_path = ''/);
    expect(sql).toMatch(/anonymised_at IS NULL/);
  });
});
