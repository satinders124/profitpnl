import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase-server";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_NOT_CONFIGURED");
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const { uid, email, billing } = body || {};

    if (!uid || !email || !billing) {
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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${appUrl}/settings?upgrade=success`,
      cancel_url: `${appUrl}/upgrade?upgrade=cancelled`,
      metadata: { supabase_uid: uid },
      subscription_data: { metadata: { supabase_uid: uid } },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
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
