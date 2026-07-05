import { NextResponse } from "next/server";
import {
  COUPON_COOKIE,
  REF_COOKIE,
  REF_COOKIE_MAX_AGE,
  getAffiliateBySlug,
  hashForPrivacy,
} from "@/lib/affiliates";
import { createServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(req: Request, context: RouteContext) {
  const { slug } = await context.params;
  const affiliate = await getAffiliateBySlug(slug);
  const url = new URL(req.url);
  const destination = new URL(url.searchParams.get("to") || "/", url.origin);

  if (!affiliate) {
    destination.pathname = "/";
    destination.searchParams.set("ref", "invalid");
    return NextResponse.redirect(destination);
  }

  try {
    const supabase = createServerClient();
    await supabase.from("referral_clicks").insert({
      affiliate_id: affiliate.id,
      ref_code: affiliate.slug,
      landing_url: destination.toString(),
      ip_hash: hashForPrivacy(req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip")),
      user_agent_hash: hashForPrivacy(req.headers.get("user-agent")),
    });
  } catch (error) {
    // Click tracking should never block redirect.
    console.error("Referral click tracking error:", error);
  }

  destination.searchParams.set("ref", affiliate.slug);
  destination.searchParams.set("coupon", affiliate.coupon_code);

  const res = NextResponse.redirect(destination);
  res.cookies.set(REF_COOKIE, affiliate.slug, {
    maxAge: REF_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  res.cookies.set(COUPON_COOKIE, affiliate.coupon_code, {
    maxAge: REF_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
