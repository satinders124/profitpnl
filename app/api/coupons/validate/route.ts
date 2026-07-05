import { NextResponse } from "next/server";
import { getAffiliateByCoupon, getAffiliateBySlug, normalizeCouponCode } from "@/lib/affiliates";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const ref = searchParams.get("ref");

    const affiliate = code
      ? await getAffiliateByCoupon(code)
      : ref
        ? await getAffiliateBySlug(ref)
        : null;

    if (!affiliate) {
      return NextResponse.json({ valid: false, error: "Coupon code not found." }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      affiliate: {
        name: affiliate.name,
        slug: affiliate.slug,
        couponCode: normalizeCouponCode(affiliate.coupon_code),
        discountPercent: affiliate.discount_percent,
        discountDurationMonths: affiliate.discount_duration_months,
      },
    });
  } catch (error) {
    console.error("Coupon validate error:", error);
    return NextResponse.json({ valid: false, error: "Could not validate coupon." }, { status: 500 });
  }
}
