import { describe, it, expect } from "vitest";
import { listSavedVehicles, removeSavedVehicle } from "@/server/repositories/saved";
import { memoryStore } from "@/server/store";

describe("listSavedVehicles repository", () => {
  it("resolves both models and pre-owned cars from savedCarIds", async () => {
    // Ensure standard test state
    memoryStore.savedCarIds = new Set(["model-h", "uc-1182"]);
    const saved = await listSavedVehicles();

    expect(saved.length).toBe(2);
    expect(saved.map((s) => s.type)).toContain("model");
    expect(saved.map((s) => s.type)).toContain("used");
  });

  it("count matches the list length exactly", async () => {
    memoryStore.savedCarIds = new Set(["model-h", "uc-1182"]);
    const saved = await listSavedVehicles();
    expect(saved.length).toBe(memoryStore.savedCarIds.size);
  });

  it("handles removeSavedVehicle correctly", async () => {
    memoryStore.savedCarIds = new Set(["model-h", "uc-1182"]);
    const removed = await removeSavedVehicle("model-h");
    expect(removed).toBe(true);

    const savedAfter = await listSavedVehicles();
    expect(savedAfter.length).toBe(1);
    expect(savedAfter[0].id).toBe("uc-1182");

    // Clean up
    memoryStore.savedCarIds.add("model-h");
  });
});

