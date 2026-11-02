import { NextRequest, NextResponse } from "next/server";
import { getPriceRule } from "@/server/repositories/pricing";
import { getVariantById } from "@/server/repositories/variants";
import { computeOnRoad } from "@/lib/price-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get("variantId");
    const cityId = searchParams.get("cityId") || "city-lucknow";
    const accessories = searchParams.get("accessories") !== "0";

    if (!variantId) {
      return NextResponse.json({ ok: false, error: "variantId is required" }, { status: 400 });
    }

    const variant = await getVariantById(variantId);
    if (!variant) {
      return NextResponse.json({ ok: false, error: "Variant not found" }, { status: 404 });
    }

    const rule = await getPriceRule({ variantId, cityId });
    const breakup = computeOnRoad({
      variant,
      rule,
      includeAccessories: accessories,
    });

    return NextResponse.json({ ok: true, data: breakup });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

