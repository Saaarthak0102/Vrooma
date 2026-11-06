import { NextRequest, NextResponse } from "next/server";
import { getOnRoadAction } from "@/server/actions/pricing";

/**
 * Gated on-road price. Same rules as the model page:
 *   signed out -> { tier: "teaser", total, validUntil } only
 *   signed in  -> { tier: "full", breakup } with every line
 * The raw price rule is never returned.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get("variantId");
    const rawCity = (searchParams.get("city") || searchParams.get("cityId") || "lucknow").toLowerCase();
    const city = rawCity.replace(/^city-/, "");
    const accessories = searchParams.get("accessories") !== "0";

    if (!variantId) {
      return NextResponse.json({ ok: false, error: "variantId is required" }, { status: 400 });
    }
    if (city !== "lucknow" && city !== "kanpur") {
      return NextResponse.json({ ok: false, error: "Unsupported city" }, { status: 400 });
    }

    const result = await getOnRoadAction({ variantId, city, includeAccessories: accessories });
    if (result.tier === "unavailable") {
      return NextResponse.json({ ok: false, error: "No active price for this variant and city" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
