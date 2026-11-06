import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import type { Banner, Offer } from "@/types/domain";

/**
 * Every offer, including hidden and expired ones. The public repository only returns live offers, which would
 * leave an admin unable to see (let alone re-enable) something they switched off.
 */
export async function listAllOffers(): Promise<Offer[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("offers")
    .select("id, title, body, badge, model_id, valid_until, is_active")
    .order("valid_until", { ascending: false })
    .limit(300);

  if (error) throw new AppError("INTERNAL_ERROR", 500, `Failed to list offers: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    badge: row.badge || undefined,
    model_id: row.model_id,
    valid_until: row.valid_until,
    active: row.is_active,
  }));
}

export async function listAllBanners(): Promise<Banner[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("banners")
    .select("id, title, image_url, href, sort, is_active")
    .order("sort", { ascending: true })
    .limit(100);

  if (error) throw new AppError("INTERNAL_ERROR", 500, `Failed to list banners: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    image_url: row.image_url,
    href: row.href || "",
    sort: row.sort,
    active: row.is_active,
  }));
}
