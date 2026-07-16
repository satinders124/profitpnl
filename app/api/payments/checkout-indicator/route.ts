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
    const user = await getAuthenticatedUser(req).catch(() => null);
    const uid = user?.id || null;

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe key is missing in environment variables." },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    const supabase = createServerClient();

    let customerId: string | undefined = undefined;
    let tvUsernameDefault = "";

    if (uid) {
      // Query Stripe Customer ID & their current saved TradingView username from database
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id, email, tradingview_username")
        .eq("id", uid)
        .single();

      customerId = profile?.stripe_customer_id || undefined;
      tvUsernameDefault = profile?.tradingview_username || "";

      if (!customerId) {
        try {
          const customer = await stripe.customers.create({
            email: profile?.email || user?.email || undefined,
            metadata: { supabase_uid: uid },
          });
          customerId = customer.id;

          await supabase
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", uid);
        } catch (err) {
          console.warn("Could not create Stripe customer:", err);
        }
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://profitpnl.com";

    // Setup checkout session configuration
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: "price_1TthUmGUMM5VeCxDbpn9dnHC", // Your exact Stripe Product Price ID
          quantity: 1,
        },
      ],
      mode: "payment",
      allow_promotion_codes: true,
      success_url: `${appUrl}/settings?indicator_purchased=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/bias-desk-pro?cancelled=true`,
      
      // 🚨 AUTOMATION UPGRADE (Stripe Custom Fields):
      // Forces Stripe Checkout to render an explicit, required text-input box on the payment form
      // asking directly for their "TradingView Username". Stripe collects it, includes it in the completion webhook,
      // and displays it directly in your Stripe dashboard purchase info!
      custom_fields: [
        {
          key: "tradingview_username",
          label: {
            type: "custom",
            custom: "Your TradingView Username (For Indicator Access)",
          },
          type: "text",
          text: {
            minimum_length: 3,
            maximum_length: 50,
          },
          optional: false, // Required field so they can never skip entering it!
        },
      ],
      metadata: {
        supabase_uid: uid || "guest",
        purchase_type: "indicator_license",
        indicator_name: "bias_desk_pro",
      },
    };

    // If logged in, pass customerId to link existing card profiles
    if (customerId) {
      sessionConfig.customer = customerId;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Indicator checkout error:", error);
    return NextResponse.json({ error: error?.message || "Checkout failed" }, { status: 500 });
  }
}
