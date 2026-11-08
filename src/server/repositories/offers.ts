import { createPublicClient } from "@/lib/supabase/public";
import { Offer, Banner } from "@/types/domain";
import { cachedQuery } from "@/server/cache";
import { AppError } from "@/lib/errors";
import { istDateString } from "@/lib/ist-format";

const OFFER_COLUMNS = "id, title, body, badge, model_id, valid_from, valid_until, is_active";
const BANNER_COLUMNS = "id, title, image_url, href, sort, is_active";

/**
 * List active and unexpired showroom/promotional offers.
 * Cached with tag 'offers'.
 */
export async function listOffers(): Promise<Offer[]> {
  const cachedFn = cachedQuery(
    async () => {
      const todayStr = istDateString(new Date());
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("offers")
        .select(OFFER_COLUMNS)
        .eq("is_active", true)
        .gte("valid_until", todayStr)
        .order("valid_until", { ascending: true })
        .order("id", { ascending: true });

      if (error) {
        throw new AppError("INTERNAL_ERROR", 500, `Failed to fetch offers: ${error.message}`);
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        badge: row.badge || undefined,
        model_id: row.model_id,
        valid_until: row.valid_until,
        active: row.is_active,
      }));
    },
    ["offers", "active"],
    { tags: ["offers"], revalidate: 3600 }
  );

  return cachedFn();
}

/**
 * Returns unique model IDs that have an active, unexpired offer.
 * Used for catalog badges and quick promo lookups.
 */
export async function listActiveOfferModelIds(today?: string): Promise<string[]> {
  const activeOffers = await listOffers();
  const todayStr = today || istDateString(new Date());
  const modelIds = new Set<string>();

  for (const offer of activeOffers) {
    if (
      offer.model_id &&
      offer.active &&
      (!offer.valid_until || offer.valid_until >= todayStr)
    ) {
      modelIds.add(offer.model_id);
    }
  }

  return Array.from(modelIds);
}

/**
 * List active marketing and promotion banners.
 * Cached with tag 'banners'.
 */
export async function listBanners(): Promise<Banner[]> {
  const cachedFn = cachedQuery(
    async () => {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("banners")
        .select(BANNER_COLUMNS)
        .eq("is_active", true)
        .order("sort", { ascending: true })
        .order("id", { ascending: true });

      if (error) {
        throw new AppError("INTERNAL_ERROR", 500, `Failed to fetch banners: ${error.message}`);
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        image_url: row.image_url,
        href: row.href || "",
        sort: row.sort,
        active: row.is_active,
      }));
    },
    ["banners", "active"],
    { tags: ["banners"], revalidate: 3600 }
  );

  return cachedFn();
}
