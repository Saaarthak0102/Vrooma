import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import type { BodyType, FuelType, Model, TransmissionType, Variant } from "@/types/domain";

/** A variant as the admin sees it: inactive trims included. */
export interface AdminVariant extends Variant {
  is_active: boolean;
}

export interface AdminModel extends Omit<Model, "variants"> {
  updated_at?: string;
  variants: AdminVariant[];
}

/**
 * Every model (live and draft) with every variant (active and inactive), for the admin console.
 * The public catalog repositories only expose active rows, so a deactivated model would otherwise
 * vanish from the screen that is supposed to let an admin bring it back.
 */
export async function listAdminModels(): Promise<AdminModel[]> {
  const supabase = createAdminClient();

  const [modelsRes, variantsRes] = await Promise.all([
    supabase
      .from("models")
      .select("id, slug, name, tagline, body_type, hero_image, gallery, is_active, is_featured, created_at, updated_at")
      .order("name", { ascending: true }),
    supabase
      .from("variants")
      .select("id, model_id, name, fuel, transmission, ex_showroom, specs, features, is_active")
      .order("ex_showroom", { ascending: true }),
  ]);

  if (modelsRes.error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to list models: ${modelsRes.error.message}`);
  }
  if (variantsRes.error) {
    throw new AppError("INTERNAL_ERROR", 500, `Failed to list variants: ${variantsRes.error.message}`);
  }

  const variants: AdminVariant[] = (variantsRes.data ?? []).map((r) => ({
    id: r.id,
    model_id: r.model_id,
    name: r.name,
    fuel: r.fuel as FuelType,
    transmission: r.transmission as TransmissionType,
    ex_showroom: r.ex_showroom,
    specs: (r.specs as Record<string, string>) || {},
    features: Array.isArray(r.features) ? (r.features as string[]) : [],
    is_active: r.is_active,
  }));

  return (modelsRes.data ?? []).map((row) => {
    const own = variants.filter((v) => v.model_id === row.id);
    const livePrices = own.filter((v) => v.is_active).map((v) => v.ex_showroom);
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      body_type: row.body_type as BodyType,
      tagline: row.tagline,
      hero_image: row.hero_image,
      gallery: Array.isArray(row.gallery) ? (row.gallery as string[]) : [],
      is_active: row.is_active,
      is_featured: row.is_featured,
      created_at: row.created_at,
      updated_at: row.updated_at,
      variants: own,
      min_price: livePrices.length ? Math.min(...livePrices) : undefined,
      max_price: livePrices.length ? Math.max(...livePrices) : undefined,
    };
  });
}
