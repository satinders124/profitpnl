import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase-server";
import { getAuthenticatedUser } from "@/lib/auth-utils";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_NOT_CONFIGURED");
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const uid = user.id;

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe key is missing in environment." },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    const supabase = createServerClient();

    // Query Stripe Customer ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", uid)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        metadata: { supabase_uid: uid },
      });
      customerId = customer.id;

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", uid);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://profitpnl.com";

    // Create checkout session specifically for the $149 Lifetime License of Bias Desk Pro
    // By setting allow_promotion_codes to true, Stripe will render the native promo-code 
    // input box directly on the checkout screen so coupons created in Stripe will work perfectly!
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: "price_1TthUmGUMM5VeCxDbpn9dnHC", // Your exact Stripe Product Price ID
          quantity: 1,
        },
      ],
      mode: "payment",
      allow_promotion_codes: true, // Fixes: Unlocks promotion/coupon inputs on Stripe checkout page!
      success_url: `${appUrl}/settings?indicator_purchased=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/bias-desk-pro?cancelled=true`,
      metadata: {
        supabase_uid: uid,
        purchase_type: "indicator_license",
        indicator_name: "bias_desk_pro",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Indicator checkout error:", error);
    return NextResponse.json({ error: error?.message || "Checkout failed" }, { status: 500 });
  }
}
