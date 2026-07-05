import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import {
  COUPON_COOKIE,
  REF_COOKIE,
  createAttributionIfMissing,
  getAffiliateByCoupon,
  getAffiliateBySlug,
  parseCookieHeader,
} from "@/lib/affiliates";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = (await req.json().catch(() => ({}))) as { ref?: string; couponCode?: string };
    const cookies = parseCookieHeader(req.headers.get("cookie"));

    const couponCode = body.couponCode || cookies[COUPON_COOKIE];
    const ref = body.ref || cookies[REF_COOKIE];

    const affiliate = couponCode
      ? await getAffiliateByCoupon(couponCode)
      : ref
        ? await getAffiliateBySlug(ref)
        : null;

    if (!affiliate) {
      return NextResponse.json({ ok: true, attributed: false, reason: "no_affiliate" });
    }

    const result = await createAttributionIfMissing({
      userId: user.id,
      affiliate,
      source: couponCode ? "coupon_or_cookie" : "referral_cookie",
      couponCode: couponCode || affiliate.coupon_code,
    });

    return NextResponse.json({ ok: true, attributed: result.created, affiliate: { slug: affiliate.slug, couponCode: affiliate.coupon_code } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Referral attribution error:", error);
    return NextResponse.json({ error: "Could not attribute referral." }, { status: 500 });
  }
}
