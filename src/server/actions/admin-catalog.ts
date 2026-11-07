"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/server/auth/viewer";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { safeRevalidateTag, safeRevalidatePath } from "@/server/cache";
import { ActionResponse, successResponse, errorResponse } from "@/lib/errors";
import { priceRuleSchema } from "@/lib/validation/price-rule";
import { Role, BodyType, FuelType, CarStatus } from "@/types/domain";
import type { Database } from "@/types/database.types";

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

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(payload.slug || "")) {
      return errorResponse("VALIDATION_FAILED", "Slug may only contain lowercase letters, numbers and single hyphens.");
    }
    if (!payload.name?.trim() || payload.name.length > 100) {
      return errorResponse("VALIDATION_FAILED", "Model name is required (max 100 characters).");
    }
    if ((payload.tagline ?? "").length > 200) {
      return errorResponse("VALIDATION_FAILED", "Tagline must be 200 characters or fewer.");
    }
    if (!payload.hero_image?.trim()) {
      return errorResponse("VALIDATION_FAILED", "A hero image is required.");
    }

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

const VARIANT_FUELS = ["petrol", "diesel", "cng", "ev", "hybrid"];
const VARIANT_TRANSMISSIONS = ["manual", "automatic"];

/**
 * Create or update a trim variant. Ex-showroom is the base of every on-road quote, so it is validated as a
 * positive whole-rupee amount (integer rupees convention). Admin only.
 */
export async function saveVariantAction(payload: {
  id?: string;
  model_id: string;
  name: string;
  fuel: string;
  transmission: string;
  ex_showroom: number;
  specs?: Record<string, string>;
  features?: string[];
  is_active?: boolean;
}): Promise<ActionResponse<{ id: string }>> {
  try {
    const { profile } = await requireRole("admin");
    const supabase = createAdminClient();

    if (!payload.model_id) {
      return errorResponse("VALIDATION_FAILED", "Choose the model this variant belongs to.");
    }
    const name = (payload.name ?? "").trim();
    if (!name || name.length > 100) {
      return errorResponse("VALIDATION_FAILED", "Variant name is required (max 100 characters).");
    }
    if (!VARIANT_FUELS.includes(payload.fuel)) {
      return errorResponse("VALIDATION_FAILED", "Choose a valid fuel type.");
    }
    if (!VARIANT_TRANSMISSIONS.includes(payload.transmission)) {
      return errorResponse("VALIDATION_FAILED", "Choose manual or automatic transmission.");
    }
    if (!Number.isInteger(payload.ex_showroom) || payload.ex_showroom <= 0 || payload.ex_showroom > 100_000_000) {
      return errorResponse("VALIDATION_FAILED", "Ex-showroom price must be a whole number of rupees greater than zero.");
    }

    const specs: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload.specs ?? {})) {
      const k = key.trim().slice(0, 60);
      const v = String(value ?? "").trim().slice(0, 120);
      if (k && v) specs[k] = v;
    }
    const features = (payload.features ?? [])
      .map((f) => String(f).trim().slice(0, 120))
      .filter(Boolean)
      .slice(0, 40);

    const row = {
      model_id: payload.model_id,
      name,
      fuel: payload.fuel as FuelType,
      transmission: payload.transmission as Database["public"]["Tables"]["variants"]["Insert"]["transmission"],
      ex_showroom: payload.ex_showroom,
      specs,
      features,
      is_active: payload.is_active ?? true,
    };

    if (payload.id) {
      const { data, error } = await supabase
        .from("variants")
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq("id", payload.id)
        .select()
        .single();
      if (error) return errorResponse("INTERNAL_ERROR", error.message);

      await logAudit(profile.id, "variants", payload.id, "UPDATE", null, data);
      safeRevalidateTag("models");
      safeRevalidateTag("price");
      safeRevalidatePath("/cars");
      return successResponse({ id: payload.id });
    }

    const { data, error } = await supabase.from("variants").insert(row).select().single();
    if (error) return errorResponse("INTERNAL_ERROR", error.message);

    await logAudit(profile.id, "variants", data.id, "INSERT", null, data);
    safeRevalidateTag("models");
    safeRevalidatePath("/cars");
    return successResponse({ id: data.id });
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to save variant");
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

    // On-road prices come from this table, so reject bad numbers and impossible date ranges here.
    const parsed = priceRuleSchema.safeParse(payload);
    if (!parsed.success) {
      return errorResponse("VALIDATION_FAILED", parsed.error.errors[0]?.message || "Invalid price rule.");
    }
    const rule = parsed.data;

    const ruleData: Database["public"]["Tables"]["price_rules"]["Insert"] = {
      city_id: rule.city_id,
      model_id: rule.model_id || null,
      variant_id: rule.variant_id || null,
      fuel: (rule.fuel || null) as FuelType | null,
      road_tax_pct: rule.road_tax_pct,
      registration: rule.registration,
      insurance: rule.insurance,
      handling: rule.handling,
      accessories: rule.accessories,
      tcs_pct: rule.tcs_pct ?? 1,
      valid_from: rule.valid_from,
      valid_until: rule.valid_until,
      notes: rule.notes || null,
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

/**
 * Create (no `id`) or patch (with `id`) a used car.
 *
 * Patch semantics on update: only fields that are present in the payload are validated and written.
 * Omitting a field leaves it untouched. This matters because the edit form does not carry photos, the
 * inspection score, the private registration number or the manager's price, and an update must never
 * blank or revert them. Creating a car requires every core field.
 */
export async function saveUsedCarAction(payload: {
  id?: string;
  stock_id?: string;
  model_id?: string | null;
  model_name?: string;
  variant_name?: string;
  fuel?: string;
  year?: number;
  km?: number;
  owners?: number;
  price?: number;
  status?: string;
  /** The real plate. Never the masked form; rejected if it contains "*". */
  reg_no_private?: string;
  showroom_id?: string | null;
  certified?: boolean;
  inspection?: Record<string, any>;
  inspection_score?: number | null;
  images?: string[];
}): Promise<ActionResponse<{ id: string }>> {
  try {
    const { profile } = await requireRole("admin", "manager");
    const supabase = createAdminClient();
    const isUpdate = Boolean(payload.id);

    // Server-side validation: never trust numbers coming from the form.
    const isInt = (n: unknown, min: number, max: number) =>
      typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
    const provided = (v: unknown) => v !== undefined && v !== null;

    if (!isUpdate && (!payload.stock_id?.trim() || !payload.model_name?.trim() || !payload.variant_name?.trim())) {
      return errorResponse("VALIDATION_FAILED", "Stock ID, model and variant are required.");
    }
    if (!isUpdate && !payload.fuel) {
      return errorResponse("VALIDATION_FAILED", "Fuel type is required.");
    }
    if ((!isUpdate || provided(payload.price)) && !isInt(payload.price, 1, 100_000_000)) {
      return errorResponse("VALIDATION_FAILED", "Price must be a whole number of rupees between 1 and 10,00,00,000.");
    }
    if ((!isUpdate || provided(payload.km)) && !isInt(payload.km, 0, 2_000_000)) {
      return errorResponse("VALIDATION_FAILED", "Odometer must be a whole number of kilometres.");
    }
    if ((!isUpdate || provided(payload.year)) && !isInt(payload.year, 1990, new Date().getFullYear() + 1)) {
      return errorResponse("VALIDATION_FAILED", "Please enter a valid manufacturing year.");
    }
    if ((!isUpdate || provided(payload.owners)) && !isInt(payload.owners, 1, 10)) {
      return errorResponse("VALIDATION_FAILED", "Owners must be between 1 and 10.");
    }
    if ((!isUpdate || provided(payload.reg_no_private)) && !payload.reg_no_private?.trim()) {
      return errorResponse("VALIDATION_FAILED", "Registration number is required.");
    }
    if (payload.reg_no_private?.includes("*")) {
      return errorResponse(
        "VALIDATION_FAILED",
        "That looks like a masked registration number. Enter the full plate, or leave it unchanged."
      );
    }

    let showroomId = payload.showroom_id || null;
    if (!showroomId && !isUpdate) {
      const { data: firstShowroom } = await supabase.from("showrooms").select("id").eq("is_active", true).limit(1).maybeSingle();
      showroomId = firstShowroom?.id ?? null;
    }

    type UsedCarUpdate = Database["public"]["Tables"]["used_cars"]["Update"];
    const patch: UsedCarUpdate = { updated_at: new Date().toISOString() };
    if (provided(payload.stock_id)) patch.stock_id = payload.stock_id!;
    if (payload.model_id !== undefined) patch.model_id = payload.model_id || null;
    if (provided(payload.model_name)) patch.model_name = payload.model_name!;
    if (provided(payload.variant_name)) patch.variant_name = payload.variant_name!;
    if (provided(payload.fuel)) patch.fuel = payload.fuel as FuelType;
    if (provided(payload.year)) patch.year = payload.year!;
    if (provided(payload.km)) patch.km = payload.km!;
    if (provided(payload.owners)) patch.owners = payload.owners!;
    if (provided(payload.price)) patch.price = payload.price!;
    if (provided(payload.status)) patch.status = payload.status as CarStatus;
    if (provided(payload.reg_no_private)) patch.reg_no_private = payload.reg_no_private!.trim();
    if (provided(payload.showroom_id)) patch.showroom_id = payload.showroom_id!;
    if (provided(payload.certified)) patch.certified = payload.certified!;
    if (provided(payload.inspection)) patch.inspection = payload.inspection!;
    if (payload.inspection_score !== undefined) patch.inspection_score = payload.inspection_score;
    if (provided(payload.images)) patch.images = payload.images!;

    // Insert defaults apply only when creating.
    const carData = {
      ...patch,
      status: (patch.status ?? "available") as CarStatus,
      certified: patch.certified ?? true,
      inspection: patch.inspection ?? {},
      inspection_score: patch.inspection_score ?? null,
      images: patch.images ?? [],
    } as Database["public"]["Tables"]["used_cars"]["Insert"];

    if (payload.id) {
      const { data, error } = await supabase
        .from("used_cars")
        .update(patch)
        .eq("id", payload.id)
        .select()
        .single();

      if (error) return errorResponse("INTERNAL_ERROR", error.message);

      await logAudit(profile.id, "used_cars", payload.id, "UPDATE", null, data);
      safeRevalidateTag("used");
      safeRevalidatePath("/used-cars");
      return successResponse({ id: payload.id });
    } else {
      if (!showroomId) return errorResponse("VALIDATION_FAILED", "Please choose the showroom or yard that holds this car.");
      const { data, error } = await supabase
        .from("used_cars")
        .insert({ ...carData, showroom_id: showroomId, listed_at: new Date().toISOString() } as Database["public"]["Tables"]["used_cars"]["Insert"])
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

/**
 * The used-car manager sets the FINAL listing price (the AI band is only a suggestion).
 */
export async function setUsedCarFinalPriceAction(id: string, price: number): Promise<ActionResponse<boolean>> {
  try {
    const { profile } = await requireRole("admin", "manager");
    if (!Number.isInteger(price) || price < 1 || price > 100_000_000) {
      return errorResponse("VALIDATION_FAILED", "Price must be a whole number of rupees between 1 and 10,00,00,000.");
    }
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("used_cars")
      .update({ price, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return errorResponse("INTERNAL_ERROR", error.message);

    await logAudit(profile.id, "used_cars", id, "SET_FINAL_PRICE", null, { price });
    safeRevalidateTag("used");
    safeRevalidatePath("/used-cars");
    return successResponse(true);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to save final price");
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
      // banners.href is NOT NULL: an empty link means "the home page".
      href: payload.href?.trim() || "/",
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

export async function deleteBannerAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    const { profile } = await requireRole("admin");
    const supabase = createAdminClient();

    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) return errorResponse("INTERNAL_ERROR", error.message);

    await logAudit(profile.id, "banners", id, "DELETE");
    safeRevalidateTag("banners");
    return successResponse(true);
  } catch (err: any) {
    return errorResponse("INTERNAL_ERROR", err?.message || "Failed to delete banner");
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

    // admin_set_role authorises via auth.uid(), which the service-role client does not have.
    const supabase = await createUserClient();
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

