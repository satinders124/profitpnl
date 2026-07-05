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

/**
 * POST /api/payments/manage
 *
 * Creates a Stripe Customer Portal session for billing management.
 */
export async function POST(req: Request) {
  try {
    // 1. Authenticate User
    const user = await getAuthenticatedUser(req);
    const uid = user.id;

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Billing portal coming soon — Stripe integration is being set up." },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    const supabase = createServerClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", uid)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account found yet. Once you subscribe, billing management will be available here." },
        { status: 400 }
      );
    }

    // Verify customer still exists in Stripe
    try {
      await stripe.customers.retrieve(profile.stripe_customer_id);
    } catch {
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: null })
        .eq("id", uid);

      return NextResponse.json(
        { error: "Your billing account was reset. Please subscribe again to access billing management." },
        { status: 400 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://profitpnl.com"}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Manage billing error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (message.includes("STRIPE_NOT_CONFIGURED")) {
      return NextResponse.json(
        { error: "Billing portal coming soon — Stripe integration is being set up." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Billing portal is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
