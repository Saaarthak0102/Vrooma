import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  existingVehicle: null as null | { id: string; odometer_km: number | null },
  ops: [] as { table: string; op: string; row?: any; opts?: any; filters?: Record<string, unknown> }[],
  insertVehicleError: null as null | { message: string },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const chain: any = {
        select: () => chain,
        eq: (col: string, val: unknown) => ((filters[col] = val), chain),
        maybeSingle: async () => ({ data: table === "owner_vehicles" ? state.existingVehicle : null }),
        single: async () => ({
          data: state.insertVehicleError ? null : { id: "new-vehicle" },
          error: state.insertVehicleError,
        }),
        insert: (row: any) => (state.ops.push({ table, op: "insert", row }), chain),
        upsert: async (row: any, opts: any) => (state.ops.push({ table, op: "upsert", row, opts }), { error: null }),
        update: (row: any) => (state.ops.push({ table, op: "update", row, filters }), chain),
        then: (resolve: any) => resolve({ error: null }),
      };
      return chain;
    },
  }),
}));

import { recordServiceVisit } from "@/server/services/garage";

const booking = { id: "b1", user_id: "u1", kind: "service", vehicle_info: { model_name: "Model H", variant_name: "ZX", reg_no: "up32 ab 1234" }, servicedAt: "2026-11-08T05:00:00Z" };
const visit = { odometerKm: 18250, nextDueOn: null, nextDueKm: null, summary: "Periodic service" };

beforeEach(() => {
  state.existingVehicle = null;
  state.ops = [];
  state.insertVehicleError = null;
});

describe("recordServiceVisit", () => {
  it("refuses non-service bookings, bookings without an account and bookings without a valid registration number", async () => {
    expect(await recordServiceVisit({ booking: { ...booking, kind: "test_drive" }, visit, staffId: "s" })).toMatchObject({ recorded: false });
    expect(await recordServiceVisit({ booking: { ...booking, user_id: null }, visit, staffId: "s" })).toMatchObject({ recorded: false });
    expect(await recordServiceVisit({ booking: { ...booking, vehicle_info: { model_name: "X" } }, visit, staffId: "s" })).toMatchObject({
      recorded: false,
      reason: expect.stringContaining("registration"),
    });
    expect(state.ops).toEqual([]);
  });

  it("adds the car to the owner's garage when it is not there yet, masked, then records the visit with a suggested next service", async () => {
    const res = await recordServiceVisit({ booking, visit, staffId: "staff-1" });
    expect(res).toEqual({ recorded: true, vehicleId: "new-vehicle", createdVehicle: true });
    const car = state.ops.find((o) => o.table === "owner_vehicles" && o.op === "insert")!.row;
    expect(car).toMatchObject({ user_id: "u1", reg_no_private: "UP32AB1234", reg_masked: "UP32 ** **** 1234", model_name: "Model H", variant_name: "ZX", odometer_km: 18250 });
    const rec = state.ops.find((o) => o.table === "service_records")!;
    expect(rec.opts).toEqual({ onConflict: "booking_id" });
    expect(rec.row).toMatchObject({ vehicle_id: "new-vehicle", booking_id: "b1", serviced_on: "2026-11-08", odometer_km: 18250, next_due_on: "2027-05-08", next_due_km: 28250, created_by: "staff-1", summary: "Periodic service" });
  });

  it("reuses an existing car, keeps staff-entered next-service values, and only moves the odometer forward", async () => {
    state.existingVehicle = { id: "v9", odometer_km: 12000 };
    const res = await recordServiceVisit({ booking, visit: { ...visit, nextDueOn: "2027-01-15", nextDueKm: 25000 }, staffId: "s" });
    expect(res).toEqual({ recorded: true, vehicleId: "v9", createdVehicle: false });
    expect(state.ops.some((o) => o.table === "owner_vehicles" && o.op === "insert")).toBe(false);
    expect(state.ops.find((o) => o.table === "service_records")!.row).toMatchObject({ vehicle_id: "v9", next_due_on: "2027-01-15", next_due_km: 25000 });
    expect(state.ops.find((o) => o.table === "owner_vehicles" && o.op === "update")!.row).toEqual({ odometer_km: 18250 });

    state.ops = [];
    state.existingVehicle = { id: "v9", odometer_km: 40000 };
    await recordServiceVisit({ booking, visit, staffId: "s" });
    expect(state.ops.some((o) => o.table === "owner_vehicles" && o.op === "update")).toBe(false);
  });

  it("reports why when the car could not be added", async () => {
    state.insertVehicleError = { message: "duplicate key" };
    expect(await recordServiceVisit({ booking, visit, staffId: "s" })).toEqual({ recorded: false, reason: "duplicate key" });
    expect(state.ops.some((o) => o.table === "service_records")).toBe(false);
  });
});
