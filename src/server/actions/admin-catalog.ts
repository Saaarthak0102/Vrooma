"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/server/auth/viewer";
import { safeRevalidateTag, safeRevalidatePath } from "@/server/cache";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";
import { Role, BodyType, FuelType, CarStatus } from "@/types/domain";
import type { Database } from "@/types/db";

async function logAudit(
  actorId: string,
  tableName: string,
  recordId: string,
  action: string,
  oldData?: Record<string, any> | null,
  newData?: Record<string, any> | null
) {
  try {
    const supabase = createAdminClient();
    await supabase.from("audit_log").insert({
      actor_id: actorId,
      table_name: tableName,
      record_id: recordId,
      action,
      old_values: oldData || null,
      new_values: newData || null,
    });
  } catch (err: any) {
    console.warn(`[audit] Failed to write audit log for ${tableName}: ${err?.message}`);
  }
}

// ==========================================
// 1. CAR MODELS & VARIANTS
// ==========================================

export async function saveModelAction(payload: {
  id?: string;
  slug: string;
  name: string;
  tagline: string;
  body_type: string;
  hero_image: string;
  gallery?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  expected_updated_at?: string;
}): Promise<ActionResponse<{ id: string }>> {
  try {
    const { profile } = await requireRole("admin");
    const supabase = createAdminClient();

    if (payload.id) {
      // Optimistic concurrency check
      if (payload.expected_updated_at) {
        const { data: existing } = await supabase
          .from("models")
          .select("updated_at")
          .eq("id", payload.id)
          .single();

        if (existing && existing.updated_at !== payload.expected_updated_at) {
          return errorResponse(
            "CONFLICT",
            "Someone else modified this model. Please refresh and try again."
          );
        }
      }

      const updateData: Database["public"]["Tables"]["models"]["Update"] = {
        slug: payload.slug,
        name: payload.name,
        tagline: payload.tagline,
        body_type: payload.body_type as BodyType,
        hero_image: payload.hero_image,
        gallery: payload.gallery || [],
        is_active: payload.is_active ?? true,
        is_featured: payload.is_featured ?? false,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("models")
        .update(updateData)
        .eq("id", payload.id)
        .select()
        .single();

      if (error) return errorResponse("INTERNAL_ERROR", error.message);

      await logAudit(profile.id, "models", payload.id, "UPDATE", null, data);
      safeRevalidateTag("models");
      safeRevalidatePath("/cars");
      return successResponse({ id: payload.id });
    } else {
      const { data, error } = await supabase
        .from("models")
        .insert({
          slug: payload.slug,
          name: payload.name,
          tagline: payload.tagline,
          body_type: payload.body_type as BodyType,
          hero_image: payload.hero_image,
          gallery: payload.gallery || [],
          is_active: payload.is_active ?? true,
          is_featured: payload.is_featured ?? false,
        })
        .select()
        .single();

      if (error) return errorResponse("INTERNAL_ERROR", error.message);

      await logAudit(profile.id, "models", data.id, "INSERT", null, data);
      safeRevalidateTag("models");
      safeRevalidatePath("/cars");
      return successResponse({ id: data.id });
    }
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to save model");
  }
}

export async function deactivateModelAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    const { profile } = await requireRole("admin");
    const supabase = createAdminClient();

    // Check references
    const { count: usedCount } = await supabase
      .from("used_cars")
      .select("id", { count: "exact", head: true })
      .eq("model_id", id);

    if (usedCount && usedCount > 0) {
      return errorResponse(
        "CONFLICT",
        `Cannot deactivate model: referenced by ${usedCount} certified used car(s).`
      );
    }

    const { error } = await supabase
      .from("models")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return errorResponse("INTERNAL_ERROR", error.message);

    await logAudit(profile.id, "models", id, "DEACTIVATE");
    safeRevalidateTag("models");
    safeRevalidatePath("/cars");
    return successResponse(true);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to deactivate model");
  }
}

// ==========================================
// 2. PRICING RULES (with exclusion handling)
// ==========================================

export async function savePriceRuleAction(payload: {
  id?: string;
  city_id: string;
  model_id?: string | null;
  variant_id?: string | null;
  fuel?: string | null;
  road_tax_pct: number;
  registration: number;
  insurance: number;
  handling: number;
  accessories: number;
  tcs_pct: number;
  valid_from: string;
  valid_until: string;
  notes?: string | null;
}): Promise<ActionResponse<{ id: string }>> {
  try {
    const { profile } = await requireRole("admin");
    const supabase = createAdminClient();

    const ruleData: Database["public"]["Tables"]["price_rules"]["Insert"] = {
      city_id: payload.city_id,
      model_id: payload.model_id || null,
      variant_id: payload.variant_id || null,
      fuel: (payload.fuel || null) as FuelType | null,
      road_tax_pct: payload.road_tax_pct,
      registration: payload.registration,
      insurance: payload.insurance,
      handling: payload.handling,
      accessories: payload.accessories,
      tcs_pct: payload.tcs_pct,
      valid_from: payload.valid_from,
      valid_until: payload.valid_until,
      notes: payload.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (payload.id) {
      const { data, error } = await supabase
        .from("price_rules")
        .update(ruleData)
        .eq("id", payload.id)
        .select()
        .single();

      if (error) {
        if (error.code === "23P01" || error.message.includes("VR001") || error.message.includes("overlap")) {
          return errorResponse(
            "CONFLICT",
            "This pricing rule conflicts with an existing overlapping validity range for the same city and vehicle scope."
          );
        }
        return errorResponse("INTERNAL_ERROR", error.message);
      }

      await logAudit(profile.id, "price_rules", payload.id, "UPDATE", null, data);
      safeRevalidateTag("price");
      return successResponse({ id: payload.id });
    } else {
      const { data, error } = await supabase
        .from("price_rules")
        .insert(ruleData)
        .select()
        .single();

      if (error) {
        if (error.code === "23P01" || error.message.includes("VR001") || error.message.includes("overlap")) {
          return errorResponse(
            "CONFLICT",
            "This pricing rule conflicts with an existing overlapping validity range for the same city and vehicle scope."
          );
        }
        return errorResponse("INTERNAL_ERROR", error.message);
      }

      await logAudit(profile.id, "price_rules", data.id, "INSERT", null, data);
      safeRevalidateTag("price");
      return successResponse({ id: data.id });
    }
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to save price rule");
  }
}

export async function deletePriceRuleAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    const { profile } = await requireRole("admin");
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("price_rules")
      .delete()
      .eq("id", id);

    if (error) return errorResponse("INTERNAL_ERROR", error.message);

    await logAudit(profile.id, "price_rules", id, "DELETE");
    safeRevalidateTag("price");
    return successResponse(true);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to delete price rule");
  }
}

// ==========================================
// 3. USED CARS (Manager / Admin CRUD)
// ==========================================

export async function saveUsedCarAction(payload: {
  id?: string;
  stock_id: string;
  model_id?: string | null;
  model_name: string;
  variant_name: string;
  fuel: string;
  year: number;
  km: number;
  owners: number;
  price: number;
  status?: string;
  reg_no_private: string;
  showroom_id?: string | null;
  certified?: boolean;
  inspection?: Record<string, any>;
  inspection_score?: number | null;
  images?: string[];
}): Promise<ActionResponse<{ id: string }>> {
  try {
    const { profile } = await requireRole("admin", "manager");
    const supabase = createAdminClient();

    const carData: Database["public"]["Tables"]["used_cars"]["Insert"] = {
      stock_id: payload.stock_id,
      model_id: payload.model_id || null,
      model_name: payload.model_name,
      variant_name: payload.variant_name,
      fuel: payload.fuel as FuelType,
      year: payload.year,
      km: payload.km,
      owners: payload.owners,
      price: payload.price,
      status: (payload.status || "available") as CarStatus,
      reg_no_private: payload.reg_no_private,
      showroom_id: payload.showroom_id || "s0000001-0000-0000-0000-000000000001",
      certified: payload.certified ?? true,
      inspection: payload.inspection || {},
      inspection_score: payload.inspection_score ?? null,
      images: payload.images || [],
      listed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (payload.id) {
      const { data, error } = await supabase
        .from("used_cars")
        .update(carData)
        .eq("id", payload.id)
        .select()
        .single();

      if (error) return errorResponse("INTERNAL_ERROR", error.message);

      await logAudit(profile.id, "used_cars", payload.id, "UPDATE", null, data);
      safeRevalidateTag("used");
      safeRevalidatePath("/used-cars");
      return successResponse({ id: payload.id });
    } else {
      const { data, error } = await supabase
        .from("used_cars")
        .insert(carData)
        .select()
        .single();

      if (error) return errorResponse("INTERNAL_ERROR", error.message);

      await logAudit(profile.id, "used_cars", data.id, "INSERT", null, data);
      safeRevalidateTag("used");
      safeRevalidatePath("/used-cars");
      return successResponse({ id: data.id });
    }
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to save used car");
  }
}

export async function updateUsedCarStatusAction(
  id: string,
  status: "available" | "booked" | "sold",
  finalPrice?: number
): Promise<ActionResponse<boolean>> {
  try {
    const { profile } = await requireRole("admin", "manager");
    const supabase = createAdminClient();

    const updates: Database["public"]["Tables"]["used_cars"]["Update"] = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "sold") {
      updates.sold_at = new Date().toISOString();
      if (finalPrice !== undefined) updates.price = finalPrice;
    }

    const { error } = await supabase
      .from("used_cars")
      .update(updates)
      .eq("id", id);

    if (error) return errorResponse("INTERNAL_ERROR", error.message);

    await logAudit(profile.id, "used_cars", id, "STATUS_CHANGE", null, updates);
    safeRevalidateTag("used");
    safeRevalidatePath("/used-cars");
    return successResponse(true);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to update used car status");
  }
}

// ==========================================
// 4. OFFERS & BANNERS
// ==========================================

export async function saveOfferAction(payload: {
  id?: string;
  title: string;
  body: string;
  badge?: string | null;
  model_id?: string | null;
  valid_from?: string;
  valid_until: string;
  is_active?: boolean;
}): Promise<ActionResponse<{ id: string }>> {
  try {
    const { profile } = await requireRole("admin");
    const supabase = createAdminClient();

    const offerData: Database["public"]["Tables"]["offers"]["Insert"] = {
      title: payload.title,
      body: payload.body,
      badge: payload.badge || null,
      model_id: payload.model_id || null,
      valid_from: payload.valid_from || new Date().toISOString().slice(0, 10),
      valid_until: payload.valid_until,
      is_active: payload.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    if (payload.id) {
      const { data, error } = await supabase
        .from("offers")
        .update(offerData)
        .eq("id", payload.id)
        .select()
        .single();

      if (error) return errorResponse("INTERNAL_ERROR", error.message);

      await logAudit(profile.id, "offers", payload.id, "UPDATE", null, data);
      safeRevalidateTag("offers");
      safeRevalidatePath("/offers");
      return successResponse({ id: payload.id });
    } else {
      const { data, error } = await supabase
        .from("offers")
        .insert(offerData)
        .select()
        .single();

      if (error) return errorResponse("INTERNAL_ERROR", error.message);

      await logAudit(profile.id, "offers", data.id, "INSERT", null, data);
      safeRevalidateTag("offers");
      safeRevalidatePath("/offers");
      return successResponse({ id: data.id });
    }
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to save offer");
  }
}

export async function deleteOfferAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    const { profile } = await requireRole("admin");
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("offers")
      .delete()
      .eq("id", id);

    if (error) return errorResponse("INTERNAL_ERROR", error.message);

    await logAudit(profile.id, "offers", id, "DELETE");
    safeRevalidateTag("offers");
    safeRevalidatePath("/offers");
    return successResponse(true);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to delete offer");
  }
}

export async function saveBannerAction(payload: {
  id?: string;
  title: string;
  image_url: string;
  href: string;
  sort?: number;
  is_active?: boolean;
}): Promise<ActionResponse<{ id: string }>> {
  try {
    const { profile } = await requireRole("admin");
    const supabase = createAdminClient();

    const bannerData: Database["public"]["Tables"]["banners"]["Insert"] = {
      title: payload.title,
      image_url: payload.image_url,
      href: payload.href || null,
      sort: payload.sort ?? 1,
      is_active: payload.is_active ?? true,
    };

    if (payload.id) {
      const { data, error } = await supabase
        .from("banners")
        .update(bannerData)
        .eq("id", payload.id)
        .select()
        .single();

      if (error) return errorResponse("INTERNAL_ERROR", error.message);

      await logAudit(profile.id, "banners", payload.id, "UPDATE", null, data);
      safeRevalidateTag("banners");
      return successResponse({ id: payload.id });
    } else {
      const { data, error } = await supabase
        .from("banners")
        .insert(bannerData)
        .select()
        .single();

      if (error) return errorResponse("INTERNAL_ERROR", error.message);

      await logAudit(profile.id, "banners", data.id, "INSERT", null, data);
      safeRevalidateTag("banners");
      return successResponse({ id: data.id });
    }
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to save banner");
  }
}

// ==========================================
// 5. USER ROLES & ACCESS
// ==========================================

export async function setStaffRoleAction(userId: string, newRole: Role): Promise<ActionResponse<boolean>> {
  try {
    const { profile } = await requireRole("admin");

    if (userId === profile.id && newRole !== "admin") {
      return errorResponse("FORBIDDEN", "Cannot demote your own admin account.");
    }

    const supabase = createAdminClient();
    const { error } = await supabase.rpc("admin_set_role", {
      p_user_id: userId,
      p_new_role: newRole,
    });

    if (error) return errorResponse("INTERNAL_ERROR", error.message);

    await logAudit(profile.id, "profiles", userId, "SET_ROLE", null, { new_role: newRole });
    return successResponse(true);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to change user role");
  }
}

