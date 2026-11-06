export const LUCKNOW_CITY_ID = "c0000001-0000-0000-0000-000000000001";
export const KANPUR_CITY_ID = "c0000001-0000-0000-0000-000000000002";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Maps a city slug, a legacy mock id ("city-lucknow") or a UUID to the database city UUID.
 * Returns null when the value cannot be resolved.
 */
export function normalizeCityId(id?: string | null): string | null {
  if (!id) return null;
  const lower = id.toLowerCase().trim();
  if (lower === "city-lucknow" || lower === "lucknow") return LUCKNOW_CITY_ID;
  if (lower === "city-kanpur" || lower === "kanpur") return KANPUR_CITY_ID;
  return UUID_REGEX.test(lower) ? lower : null;
}
