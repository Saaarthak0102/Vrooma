import "server-only";

import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiFeature } from "@/server/ai/types";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_MS = 60_000;

/** Start of the current Indian calendar day, as an instant. */
export function istDayStart(now: Date): Date {
  const shifted = now.getTime() + IST_OFFSET_MS;
  return new Date(Math.floor(shifted / DAY_MS) * DAY_MS - IST_OFFSET_MS);
}

const cache = new Map<AiFeature, { at: number; over: boolean }>();

/**
 * True when a feature has already made AI_DAILY_CALL_CAP model calls today (IST). Counts real model calls only
 * (ok, blocked, error), never fallbacks. Cached for a minute so the check costs one query per feature per minute,
 * and fails open: if the count cannot be read the feature keeps working.
 */
export async function isOverDailyCap(feature: AiFeature, now: Date = new Date()): Promise<boolean> {
  const hit = cache.get(feature);
  if (hit && now.getTime() - hit.at < CACHE_MS) return hit.over;

  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("ai_logs")
      .select("id", { count: "exact", head: true })
      .eq("feature", feature)
      .in("status", ["ok", "blocked", "error"])
      .gte("created_at", istDayStart(now).toISOString());
    if (error) {
      console.warn(`[ai-budget] count failed for ${feature}: ${error.message}`);
      return false;
    }
    const over = (count ?? 0) >= env.AI_DAILY_CALL_CAP;
    cache.set(feature, { at: now.getTime(), over });
    return over;
  } catch (err: any) {
    console.warn(`[ai-budget] skipped for ${feature}: ${err?.message}`);
    return false;
  }
}

/** Test hook. */
export function resetBudgetCache() {
  cache.clear();
}
