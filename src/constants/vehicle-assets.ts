/**
 * VROOMA — Centralized Vehicle Asset System
 *
 * Single source of truth for all vehicle illustrations site-wide.
 * ONLY the five approved SVG assets in /images/cars/ may be used.
 */

export const APPROVED_VEHICLE_ASSETS = {
  s: "/images/cars/s.svg",
  y: "/images/cars/y.svg",
  c: "/images/cars/c.svg",
  x: "/images/cars/x.svg",
  r: "/images/cars/r.svg",
} as const;

export type VehicleAssetKey = keyof typeof APPROVED_VEHICLE_ASSETS;
export type VehicleAssetPath = (typeof APPROVED_VEHICLE_ASSETS)[VehicleAssetKey];

export const VEHICLE_ASSETS = APPROVED_VEHICLE_ASSETS;

/**
 * Array of all 5 approved SVG paths for validation.
 */
export const APPROVED_VEHICLE_ASSET_PATHS: readonly string[] = Object.values(APPROVED_VEHICLE_ASSETS);

/**
 * Default fallback asset when no vehicle info is available.
 */
export const DEFAULT_VEHICLE_ASSET: VehicleAssetPath = APPROVED_VEHICLE_ASSETS.s;

/**
 * Deterministic mapping from model slugs/IDs/names to approved assets.
 * 
 * - Model S -> s.svg (matches Model S naming and sleek sedan silhouette)
 * - Model H -> y.svg (flagship executive sedan, elegant profile)
 * - Model C -> c.svg (matches Model C naming and rugged angular utility profile)
 * - Model X -> x.svg (matches Model X naming and electric fastback profile)
 * - Model T -> r.svg (rugged 4x4 offroader / adventure profile)
 */
export const MODEL_ASSET_MAP: Record<string, VehicleAssetPath> = {
  // Model S
  "model-s": APPROVED_VEHICLE_ASSETS.s,
  "model s": APPROVED_VEHICLE_ASSETS.s,
  models: APPROVED_VEHICLE_ASSETS.s,
  s: APPROVED_VEHICLE_ASSETS.s,

  // Model H (Executive Sedan / Flagship)
  "model-h": APPROVED_VEHICLE_ASSETS.y,
  "model h": APPROVED_VEHICLE_ASSETS.y,
  modelh: APPROVED_VEHICLE_ASSETS.y,
  h: APPROVED_VEHICLE_ASSETS.y,
  y: APPROVED_VEHICLE_ASSETS.y,

  // Model C
  "model-c": APPROVED_VEHICLE_ASSETS.c,
  "model c": APPROVED_VEHICLE_ASSETS.c,
  modelc: APPROVED_VEHICLE_ASSETS.c,
  c: APPROVED_VEHICLE_ASSETS.c,

  // Model X (Luxury EV)
  "model-x": APPROVED_VEHICLE_ASSETS.x,
  "model x": APPROVED_VEHICLE_ASSETS.x,
  modelx: APPROVED_VEHICLE_ASSETS.x,
  x: APPROVED_VEHICLE_ASSETS.x,

  // Model T (Rugged Offroader 4x4)
  "model-t": APPROVED_VEHICLE_ASSETS.r,
  "model t": APPROVED_VEHICLE_ASSETS.r,
  modelt: APPROVED_VEHICLE_ASSETS.r,
  t: APPROVED_VEHICLE_ASSETS.r,
  r: APPROVED_VEHICLE_ASSETS.r,
};

/**
 * Body type fallback mapping ensuring each category resolves consistently.
 */
export const BODY_TYPE_ASSET_MAP: Record<string, VehicleAssetPath> = {
  sedan: APPROVED_VEHICLE_ASSETS.y,
  hatchback: APPROVED_VEHICLE_ASSETS.s,
  suv: APPROVED_VEHICLE_ASSETS.c,
  ev: APPROVED_VEHICLE_ASSETS.x,
  mpv: APPROVED_VEHICLE_ASSETS.r,
};

/**
 * Checks if a string is one of the five approved SVG paths.
 */
export function isApprovedVehicleAsset(path?: string | null): path is VehicleAssetPath {
  if (!path) return false;
  return APPROVED_VEHICLE_ASSET_PATHS.includes(path);
}

export interface VehicleQueryObject {
  id?: string;
  slug?: string;
  name?: string;
  model_id?: string;
  model_name?: string;
  modelSlug?: string;
  body_type?: string;
  bodyType?: string;
  hero_image?: string;
  heroImage?: string;
  images?: string[];
  image?: string;
}

/**
 * Resolves any vehicle identifier, model, category, or path to one of the 5 approved SVGs.
 * NEVER returns an obsolete or non-approved asset path.
 */
export function getVehicleAsset(
  query?: string | VehicleQueryObject | null
): VehicleAssetPath {
  if (!query) {
    return DEFAULT_VEHICLE_ASSET;
  }

  // If query is an object
  if (typeof query === "object") {
    // 1. If explicit hero_image / heroImage / image is already an approved path, use it
    const candidatePath = query.hero_image || query.heroImage || query.image || query.images?.[0];
    if (isApprovedVehicleAsset(candidatePath)) {
      return candidatePath;
    }

    // 2. Try model_id / id / slug / modelSlug
    const modelKey = (query.model_id || query.slug || query.modelSlug || query.id || "")
      .trim()
      .toLowerCase();
    if (modelKey && MODEL_ASSET_MAP[modelKey]) {
      return MODEL_ASSET_MAP[modelKey];
    }

    // 3. Try model_name / name
    const nameKey = (query.model_name || query.name || "").trim().toLowerCase();
    if (nameKey && MODEL_ASSET_MAP[nameKey]) {
      return MODEL_ASSET_MAP[nameKey];
    }

    // Check if nameKey contains one of the model identifiers
    for (const [key, asset] of Object.entries(MODEL_ASSET_MAP)) {
      if (key.length > 2 && nameKey.includes(key)) {
        return asset;
      }
    }

    // 4. Try body_type / bodyType
    const bodyKey = (query.body_type || query.bodyType || "").trim().toLowerCase();
    if (bodyKey && BODY_TYPE_ASSET_MAP[bodyKey]) {
      return BODY_TYPE_ASSET_MAP[bodyKey];
    }

    return DEFAULT_VEHICLE_ASSET;
  }

  // If query is a string
  const str = query.trim();

  // If already an approved asset path
  if (isApprovedVehicleAsset(str)) {
    return str;
  }

  const lower = str.toLowerCase();

  // Exact model match
  if (MODEL_ASSET_MAP[lower]) {
    return MODEL_ASSET_MAP[lower];
  }

  // Check body types
  if (BODY_TYPE_ASSET_MAP[lower]) {
    return BODY_TYPE_ASSET_MAP[lower];
  }

  // Check for model substring
  if (lower.includes("model-s") || lower.includes("model s")) return APPROVED_VEHICLE_ASSETS.s;
  if (lower.includes("model-h") || lower.includes("model h")) return APPROVED_VEHICLE_ASSETS.y;
  if (lower.includes("model-c") || lower.includes("model c")) return APPROVED_VEHICLE_ASSETS.c;
  if (lower.includes("model-x") || lower.includes("model x")) return APPROVED_VEHICLE_ASSETS.x;
  if (lower.includes("model-t") || lower.includes("model t")) return APPROVED_VEHICLE_ASSETS.r;

  return DEFAULT_VEHICLE_ASSET;
}

/**
 * Normalizes an image path: if already approved, keep it; otherwise resolve via vehicle context or default.
 */
export function normalizeVehicleAsset(
  src?: string | null,
  context?: string | VehicleQueryObject | null
): VehicleAssetPath {
  if (isApprovedVehicleAsset(src)) {
    return src;
  }
  return getVehicleAsset(context);
}
