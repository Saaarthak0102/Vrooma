/**
 * The customer's address is asked only for a home test drive / vehicle pickup and stored on the booking,
 * not on the profile.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { validateHomeVisit } from "@/lib/validation/home-visit";

const root = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

describe("validateHomeVisit", () => {
  it("accepts a real address and PIN code", () => {
    expect(validateHomeVisit("14/A, MG Marg, Hazratganj", "226001")).toEqual({});
  });
  it("rejects a short address and bad PIN codes", () => {
    expect(validateHomeVisit("Home", "226001").address).toBeDefined();
    for (const bad of ["026001", "22600", "2260011", "abcdef", ""]) {
      expect(validateHomeVisit("14/A, MG Marg", bad).pincode, bad).toBeDefined();
    }
  });
});

describe("profile no longer has an address", () => {
  it("sign-up, onboarding and profile screens do not ask for it", () => {
    for (const f of ["src/app/(auth)/sign-up/page.tsx", "src/app/(auth)/onboarding/page.tsx", "src/components/profile/ProfileView.tsx"]) {
      const text = read(f);
      expect(text, f).not.toMatch(/setAddress|setPincode|Street Address/);
    }
  });
  it("the profile repository and RPC call do not touch address or pincode", () => {
    expect(read("src/server/repositories/users.ts")).not.toMatch(/address|pincode/);
    expect(read("src/server/auth/actions.ts")).not.toMatch(/p_address|p_pincode/);
  });
});

describe("booking forms ask for the address", () => {
  it("both booking pages render the home visit fields and send them", () => {
    for (const f of ["src/app/(buyer)/book/test-drive/page.tsx", "src/app/(buyer)/book/service/page.tsx"]) {
      const text = read(f);
      expect(text, f).toContain("<HomeVisitFields");
      expect(text, f).toMatch(/homeVisit,/);
      expect(text, f).toMatch(/validateHomeVisit\(address, pincode\)/);
    }
  });
  it("the server action requires address + pincode for a home visit and passes them to book_slot", () => {
    const action = read("src/server/actions/booking.ts");
    expect(action).toMatch(/homeVisit: z\.boolean\(\)/);
    expect(action).toMatch(/p_address: parsed\.data\.homeVisit/);
    expect(action).toMatch(/p_pincode: parsed\.data\.homeVisit/);
  });
});

describe("migration 0027", () => {
  const sql = read("supabase/migrations/0027_move_address_to_bookings.sql");
  it("adds booking columns and drops the profile ones", () => {
    expect(sql).toMatch(/ALTER TABLE public\.bookings\s+ADD COLUMN IF NOT EXISTS address TEXT,\s+ADD COLUMN IF NOT EXISTS pincode TEXT/);
    expect(sql).toMatch(/ALTER TABLE public\.profiles\s+DROP COLUMN IF EXISTS address,\s+DROP COLUMN IF EXISTS pincode/);
  });
  it("book_slot takes the address and stays closed to anon", () => {
    expect(sql).toMatch(/p_address TEXT DEFAULT NULL,\s+p_pincode TEXT DEFAULT NULL/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.book_slot\([^)]*\) FROM PUBLIC, anon/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.book_slot\([^)]*\) TO authenticated, service_role/);
  });
  it("complete_profile has no address params and erasure wipes booking addresses", () => {
    const cp = sql.slice(sql.indexOf("CREATE OR REPLACE FUNCTION public.complete_profile"), sql.indexOf("-- 4. Erasure"));
    expect(cp).not.toMatch(/p_address|p_pincode|address,|pincode,/);
    const an = sql.slice(sql.indexOf("CREATE OR REPLACE FUNCTION private.anonymise_user"), sql.indexOf("-- 5."));
    expect(an).toMatch(/address = NULL,\s+pincode = NULL\s+WHERE user_id = p_uid/);
    expect(an).not.toMatch(/UPDATE public\.profiles[\s\S]*address = NULL[\s\S]*WHERE id = p_uid/);
  });
});
