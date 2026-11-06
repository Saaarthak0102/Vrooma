/**
 * /used-cars lists the client's sample stock; the detail page used to read only the database, so cars
 * missing from it (e.g. UC-1210) gave a 404. The repository now falls back to the sample stock.
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

describe("getUsedCarByStockId sample-stock fallback", () => {
  it("opens a listed car that is not in the database, without the private registration", async () => {
    state.row = null;
    state.error = null;
    const car = await getUsedCarByStockId("uc-1210");
    expect(car?.stock_id).toBe("UC-1210");
    expect(car).not.toHaveProperty("reg_no_private");
    expect(car?.reg_no_masked).toContain("1820");
  });

  it("falls back when the database query errors", async () => {
    state.row = null;
    state.error = { message: "boom" };
    expect((await getUsedCarByStockId("UC-1195"))?.stock_id).toBe("UC-1195");
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
