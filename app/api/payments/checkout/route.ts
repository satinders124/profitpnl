import { NextResponse } from "next/server";
import Stripe from "stripe";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

async function getAdminDbSafe() {
  try {
    const { getAdminDb } = await import("@/lib/firebase-admin");
    return getAdminDb();
  } catch {
    return null;
  }
}

/**
 * POST /api/payments/checkout
 *
 * Creates a Stripe Checkout Session for upgrading to Pro Plan.
 * Accepts: { uid, email, billing: "monthly" | "annual" }
 * Returns: { url } — redirect the user to Stripe Checkout
 * Returns: { error } with 503 if Stripe not configured
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const { uid, email, billing } = body || {};

    if (!uid || !email || !billing) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Payments are not available yet. Stripe integration is being set up." },
        { status: 503 }
      );
    }

    // Determine price ID based on billing frequency
    const priceId =
      billing === "annual"
        ? process.env.STRIPE_PRICE_ID_ANNUAL
        : process.env.STRIPE_PRICE_ID_MONTHLY;

    if (!priceId) {
      const label = billing === "annual" ? "Annual" : "Monthly";
      return NextResponse.json(
        { error: `${label} plan is not available yet. Please try the other option.` },
        { status: 503 }
      );
    }

    const stripe = getStripe();

    // Get or create Stripe customer
    const adminDb = await getAdminDbSafe();
    let customerId: string | undefined;

    if (adminDb) {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      const savedCustomerId = userDoc.data()?.stripeCustomerId;

      // Validate the saved customer ID still exists in Stripe
      // (handles test/live mode switches or deleted customers)
      if (savedCustomerId) {
        try {
          await stripe.customers.retrieve(savedCustomerId);
          customerId = savedCustomerId;
        } catch {
          // Stale customer ID — clear it and create a new one
          customerId = undefined;
        }
      }

      if (!customerId) {
        const customer = await stripe.customers.create({
          email,
          metadata: { firebaseUID: uid },
        });
        customerId = customer.id;

        // Save customer ID to Firestore (use set with merge in case doc doesn't exist yet)
        await adminDb.collection("users").doc(uid).set(
          { stripeCustomerId: customerId },
          { merge: true }
        );
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://profitpnl.com";

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      ...(customerId ? { customer: customerId } : { customer_email: email }),
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${appUrl}/settings?upgrade=success`,
      cancel_url: `${appUrl}/upgrade?upgrade=cancelled`,
      metadata: {
        firebaseUID: uid,
      },
      subscription_data: {
        metadata: {
          firebaseUID: uid,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    if (
      message.includes("STRIPE_NOT_CONFIGURED") ||
      message.includes("api key") ||
      message.includes("secret")
    ) {
      return NextResponse.json(
        { error: "Payments are not available yet. Stripe integration is being set up." },
        { status: 503 }
      );
    }

    // Don't leak internal Stripe errors to the user
    return NextResponse.json(
      { error: "Could not start checkout. Please try again or contact support." },
      { status: 500 }
    );
  }
}
