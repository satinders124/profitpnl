import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";
import { normalizeCouponCode, normalizeSlug, requireAdmin, type Affiliate } from "@/lib/affiliates";

export const runtime = "nodejs";

let _stripe: Stripe | null = null;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

type CreateAffiliateBody = {
  name?: string;
  email?: string;
  slug?: string;
  couponCode?: string;
  discountPercent?: number;
  discountDurationMonths?: number;
  commissionPercent?: number;
  commissionDurationMonths?: number;
  notes?: string;
  createStripePromo?: boolean;
};

async function assertAdmin(req: Request) {
  const user = await getAuthenticatedUser(req);
  requireAdmin(user);
  return user;
}

export async function GET(req: Request) {
  try {
    await assertAdmin(req);
    const supabase = createServerClient();

    const [{ data: affiliates, error }, { data: clicks }, { data: attributions }, { data: commissions }] = await Promise.all([
      supabase.from("affiliates").select("*").order("created_at", { ascending: false }),
      supabase.from("referral_clicks").select("affiliate_id"),
      supabase.from("referral_attributions").select("affiliate_id"),
      supabase.from("affiliate_commissions").select("affiliate_id, gross_amount_cents, commission_amount_cents, status, user_id"),
    ]);

    if (error) {
      console.error("Admin affiliate list error:", error);
      return NextResponse.json({ error: "Could not load affiliates. Run the affiliate migration first." }, { status: 500 });
    }

    const rows = ((affiliates || []) as Affiliate[]).map((affiliate) => {
      const affClicks = (clicks || []).filter((row) => row.affiliate_id === affiliate.id).length;
      const affAttributions = (attributions || []).filter((row) => row.affiliate_id === affiliate.id).length;
      const affCommissions = (commissions || []).filter((row) => row.affiliate_id === affiliate.id);
      const gross = affCommissions.reduce((sum, row) => sum + Number(row.gross_amount_cents || 0), 0);
      const commission = affCommissions.reduce((sum, row) => sum + Number(row.commission_amount_cents || 0), 0);
      const paidCustomers = new Set(affCommissions.map((row) => row.user_id).filter(Boolean)).size;
      return { ...affiliate, clicks: affClicks, signups: affAttributions, paidCustomers, grossRevenueCents: gross, commissionCents: commission };
    });

    return NextResponse.json({ affiliates: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Admin affiliate route error:", error);
    return NextResponse.json({ error: "Could not load affiliates." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await assertAdmin(req);
    const body = (await req.json().catch(() => ({}))) as CreateAffiliateBody;

    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const slug = normalizeSlug(body.slug || name);
    const couponCode = normalizeCouponCode(body.couponCode || slug.replace(/-/g, "").slice(0, 10));
    const discountPercent = Number(body.discountPercent ?? 20);
    const discountDurationMonths = Math.max(1, Math.round(Number(body.discountDurationMonths ?? 3)));
    const commissionPercent = Number(body.commissionPercent ?? 30);
    const commissionDurationMonths = Math.max(1, Math.round(Number(body.commissionDurationMonths ?? 12)));

    if (!name || !email || !slug || !couponCode) {
      return NextResponse.json({ error: "Name, email, slug, and coupon code are required." }, { status: 400 });
    }

    if (discountPercent < 0 || discountPercent > 100 || commissionPercent < 0 || commissionPercent > 100) {
      return NextResponse.json({ error: "Percent values must be between 0 and 100." }, { status: 400 });
    }

    let stripeCouponId: string | null = null;
    let stripePromotionCodeId: string | null = null;

    const stripe = getStripe();
    if (body.createStripePromo !== false && stripe) {
      const coupon = await stripe.coupons.create({
        percent_off: discountPercent,
        duration: "repeating",
        duration_in_months: discountDurationMonths,
        name: `${couponCode} — ${discountPercent}% off ${discountDurationMonths} months`,
        metadata: { affiliate_slug: slug, coupon_code: couponCode },
      });
      stripeCouponId = coupon.id;

      const promo = await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: coupon.id },
        code: couponCode,
        active: true,
        metadata: { affiliate_slug: slug, coupon_code: couponCode },
      });
      stripePromotionCodeId = promo.id;
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("affiliates")
      .insert({
        name,
        email,
        slug,
        coupon_code: couponCode,
        discount_percent: discountPercent,
        discount_duration_months: discountDurationMonths,
        commission_percent: commissionPercent,
        commission_duration_months: commissionDurationMonths,
        stripe_coupon_id: stripeCouponId,
        stripe_promotion_code_id: stripePromotionCodeId,
        notes: body.notes || null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Admin affiliate create error:", error);
      return NextResponse.json({ error: "Could not create affiliate. Code/slug may already exist or migration is missing." }, { status: 500 });
    }

    return NextResponse.json({ affiliate: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Admin affiliate create route error:", error);
    return NextResponse.json({ error: message || "Could not create affiliate." }, { status: 500 });
  }
}
