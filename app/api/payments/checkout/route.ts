import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase-server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import {
  COUPON_COOKIE,
  REF_COOKIE,
  createAttributionIfMissing,
  getAffiliateForCheckout,
  parseCookieHeader,
} from "@/lib/affiliates";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_NOT_CONFIGURED");
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate User
    const user = await getAuthenticatedUser(req);
    const uid = user.id;

    const body = await req.json().catch(() => null);
    const { email, billing, couponCode } = body || {};

    if (!email || !billing) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Payments are not available yet. Stripe integration is being set up." },
        { status: 503 }
      );
    }

    const priceId = billing === "annual"
      ? process.env.STRIPE_PRICE_ID_ANNUAL
      : process.env.STRIPE_PRICE_ID_MONTHLY;

    if (!priceId) {
      return NextResponse.json(
        { error: `${billing === "annual" ? "Annual" : "Monthly"} plan is not available yet.` },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    const supabase = createServerClient();
    const cookies = parseCookieHeader(req.headers.get("cookie"));

    const affiliateResult = await getAffiliateForCheckout({
      userId: uid,
      couponCode: couponCode || cookies[COUPON_COOKIE],
      refSlug: cookies[REF_COOKIE],
    });

    // If the user typed a coupon manually and it is unknown, fail clearly.
    if (couponCode && !affiliateResult.affiliate) {
      return NextResponse.json({ error: "Coupon code not found or inactive." }, { status: 400 });
    }

    if (affiliateResult.affiliate) {
      await createAttributionIfMissing({
        userId: uid,
        affiliate: affiliateResult.affiliate,
        source: affiliateResult.source,
        couponCode: affiliateResult.couponCode,
      }).catch((error) => console.error("Checkout attribution error:", error));
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", uid)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (customerId) {
      // Validate customer still exists
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        customerId = undefined;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabase_uid: uid },
      });
      customerId = customer.id;

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", uid);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://profitpnl.com";
    const promotionCodeId = affiliateResult.affiliate?.stripe_promotion_code_id || undefined;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: promotionCodeId ? undefined : true,
      discounts: promotionCodeId ? [{ promotion_code: promotionCodeId }] : undefined,
      success_url: `${appUrl}/settings?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/upgrade?upgrade=cancelled`,
      metadata: {
        supabase_uid: uid,
        affiliate_id: affiliateResult.affiliate?.id || "",
        affiliate_slug: affiliateResult.affiliate?.slug || "",
        coupon_code: affiliateResult.couponCode || "",
        referral_source: affiliateResult.source,
      },
      subscription_data: {
        metadata: {
          supabase_uid: uid,
          affiliate_id: affiliateResult.affiliate?.id || "",
          affiliate_slug: affiliateResult.affiliate?.slug || "",
          coupon_code: affiliateResult.couponCode || "",
          referral_source: affiliateResult.source,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    
    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (message.includes("STRIPE_NOT_CONFIGURED")) {
      return NextResponse.json(
        { error: "Payments are not available yet." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not start checkout. Please try again or contact support." },
      { status: 500 }
    );
  }
}
