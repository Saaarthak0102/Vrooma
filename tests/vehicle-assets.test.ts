import { describe, it, expect } from "vitest";
import {
  APPROVED_VEHICLE_ASSETS,
  APPROVED_VEHICLE_ASSET_PATHS,
  DEFAULT_VEHICLE_ASSET,
  isApprovedVehicleAsset,
  getVehicleAsset,
  normalizeVehicleAsset } from "@/constants/vehicle-assets";

describe("Vehicle Asset Centralized System", () => {
  it("defines exactly the five approved SVG assets", () => {
    expect(APPROVED_VEHICLE_ASSETS).toEqual({
      s: "/images/cars/s.svg",
      y: "/images/cars/y.svg",
      c: "/images/cars/c.svg",
      x: "/images/cars/x.svg",
      r: "/images/cars/r.svg",
    });
    expect(APPROVED_VEHICLE_ASSET_PATHS).toHaveLength(5);
  });

  it("validates approved paths correctly", () => {
    expect(isApprovedVehicleAsset("/images/cars/s.svg")).toBe(true);
    expect(isApprovedVehicleAsset("/images/cars/y.svg")).toBe(true);
    expect(isApprovedVehicleAsset("/images/cars/c.svg")).toBe(true);
    expect(isApprovedVehicleAsset("/images/cars/x.svg")).toBe(true);
    expect(isApprovedVehicleAsset("/images/cars/r.svg")).toBe(true);

    expect(isApprovedVehicleAsset("/images/cars/hero-model-h.svg")).toBe(false);
    expect(isApprovedVehicleAsset("/images/placeholders/car-1.svg")).toBe(false);
    expect(isApprovedVehicleAsset("")).toBe(false);
    expect(isApprovedVehicleAsset(null)).toBe(false);
    expect(isApprovedVehicleAsset(undefined)).toBe(false);
  });

  it("maps models to approved assets deterministically", () => {
    expect(getVehicleAsset("model-s")).toBe(APPROVED_VEHICLE_ASSETS.s);
    expect(getVehicleAsset("model-h")).toBe(APPROVED_VEHICLE_ASSETS.y);
    expect(getVehicleAsset("model-c")).toBe(APPROVED_VEHICLE_ASSETS.c);
    expect(getVehicleAsset("model-x")).toBe(APPROVED_VEHICLE_ASSETS.x);
    expect(getVehicleAsset("model-t")).toBe(APPROVED_VEHICLE_ASSETS.r);

    // Case-insensitive model names
    expect(getVehicleAsset("Model S")).toBe(APPROVED_VEHICLE_ASSETS.s);
    expect(getVehicleAsset("Model H")).toBe(APPROVED_VEHICLE_ASSETS.y);
    expect(getVehicleAsset("Model C")).toBe(APPROVED_VEHICLE_ASSETS.c);
    expect(getVehicleAsset("Model X")).toBe(APPROVED_VEHICLE_ASSETS.x);
    expect(getVehicleAsset("Model T")).toBe(APPROVED_VEHICLE_ASSETS.r);
  });

  it("maps vehicle objects with various shapes correctly", () => {
    expect(getVehicleAsset({ model_id: "model-h", model_name: "Model H" })).toBe(APPROVED_VEHICLE_ASSETS.y);
    expect(getVehicleAsset({ slug: "model-c" })).toBe(APPROVED_VEHICLE_ASSETS.c);
    expect(getVehicleAsset({ id: "model-x" })).toBe(APPROVED_VEHICLE_ASSETS.x);
    expect(getVehicleAsset({ body_type: "sedan" })).toBe(APPROVED_VEHICLE_ASSETS.y);
    expect(getVehicleAsset({ body_type: "suv" })).toBe(APPROVED_VEHICLE_ASSETS.c);
    expect(getVehicleAsset({ body_type: "hatchback" })).toBe(APPROVED_VEHICLE_ASSETS.s);
    expect(getVehicleAsset({ body_type: "ev" })).toBe(APPROVED_VEHICLE_ASSETS.x);
  });

  it("preserves already approved asset in query object", () => {
    expect(getVehicleAsset({ hero_image: APPROVED_VEHICLE_ASSETS.r })).toBe(APPROVED_VEHICLE_ASSETS.r);
    expect(getVehicleAsset({ images: [APPROVED_VEHICLE_ASSETS.s] })).toBe(APPROVED_VEHICLE_ASSETS.s);
  });

  it("normalizes obsolete assets to approved assets", () => {
    expect(normalizeVehicleAsset("/images/placeholders/car-1.svg", "model-h")).toBe(APPROVED_VEHICLE_ASSETS.y);
    expect(normalizeVehicleAsset("/images/cars/hero-model-h.svg", "model-h")).toBe(APPROVED_VEHICLE_ASSETS.y);
    expect(normalizeVehicleAsset(null, "model-s")).toBe(APPROVED_VEHICLE_ASSETS.s);
    expect(normalizeVehicleAsset(APPROVED_VEHICLE_ASSETS.c, "model-s")).toBe(APPROVED_VEHICLE_ASSETS.c);
  });

  it("falls back safely to default approved asset when unknown", () => {
    expect(getVehicleAsset(null)).toBe(DEFAULT_VEHICLE_ASSET);
    expect(getVehicleAsset("unknown-car")).toBe(DEFAULT_VEHICLE_ASSET);
    expect(getVehicleAsset({})).toBe(DEFAULT_VEHICLE_ASSET);
  });
});

