/**
 * /used-cars and the detail page both read the database. The old sample-stock fallback was removed, so a car
 * that is not in the database is a 404 and a database error is surfaced.
 */
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const state = vi.hoisted(() => ({ row: null as any, error: null as any }));

vi.mock("@/lib/supabase/public", () => ({
  createPublicClient: () => ({
    from: () => ({
      select: () => ({
        ilike: () => ({ maybeSingle: async () => ({ data: state.row, error: state.error }) }),
      }),
    }),
  }),
}));
vi.mock("@/server/cache", () => ({ cachedQuery: (fn: () => unknown) => fn }));

import { getUsedCarByStockId } from "@/server/repositories/used-cars";

describe("getUsedCarByStockId reads only the database", () => {
  it("a car that is not in the database is not found (no sample-stock fallback)", async () => {
    state.row = null;
    state.error = null;
    expect(await getUsedCarByStockId("uc-1210")).toBeNull();
  });

  it("a database error is raised, not hidden behind sample data", async () => {
    state.row = null;
    state.error = { message: "boom" };
    await expect(getUsedCarByStockId("UC-1195")).rejects.toThrow(/Failed to fetch used car/);
  });

  it("the database row wins when it exists", async () => {
    state.error = null;
    state.row = {
      id: "db-1", stock_id: "UC-1210", model_id: "m", model_name: "From DB", variant_name: "V", fuel: "petrol",
      year: 2020, km: 1, owners: 1, price: 1, status: "available", reg_no_masked: "UP32 ** **** 0001",
      showroom_id: "s", certified: true, inspection: {}, images: [], created_at: "2026-01-01", updated_at: "2026-01-01",
    };
    expect((await getUsedCarByStockId("UC-1210"))?.model_name).toBe("From DB");
  });

  it("an unknown stock id is still not found", async () => {
    state.row = null;
    state.error = null;
    expect(await getUsedCarByStockId("UC-9999")).toBeNull();
  });
});

describe("page changes open at the top", () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, "..", "src/components/motion/SmoothScrollProvider.tsx"),
    "utf8"
  );
  it("resets Lenis and the window on pathname change, skipping hash links", () => {
    expect(src).toMatch(/usePathname\(\)/);
    expect(src).toMatch(/window\.location\.hash/);
    expect(src).toMatch(/lenis\.scrollTo\(0, \{ immediate: true, force: true \}\)/);
    expect(src).toMatch(/window\.scrollTo\(0, 0\)/);
  });
});
