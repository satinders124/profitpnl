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
 * POST /api/payments/manage
 *
 * Creates a Stripe Customer Portal session so the user can:
 * - View billing history & download invoices
 * - Update payment method
 * - Cancel subscription
 * - Update subscription plan
 *
 * Accepts: { uid }
 * Returns: { url } — redirect the user to the Stripe portal
 * Returns: { error } with 503 if not configured yet
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const uid = body?.uid;

    if (!uid) {
      return NextResponse.json(
        { error: "Missing uid" },
        { status: 400 }
      );
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Billing portal coming soon — Stripe integration is being set up." },
        { status: 503 }
      );
    }

    // Check if Firebase Admin is available
    const adminDb = await getAdminDbSafe();
    if (!adminDb) {
      return NextResponse.json(
        { error: "Billing portal coming soon — server configuration in progress." },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    const userDoc = await adminDb.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const customerId = userDoc.data()?.stripeCustomerId;

    if (!customerId) {
      return NextResponse.json(
        { error: "No billing account found yet. Once you subscribe, billing management will be available here." },
        { status: 400 }
      );
    }

    // Verify the customer still exists in Stripe (handles test/live mode switches)
    try {
      await stripe.customers.retrieve(customerId);
    } catch {
      // Stale customer ID — clear it from Firestore
      await adminDb.collection("users").doc(uid).update({
        stripeCustomerId: null,
      });
      return NextResponse.json(
        { error: "Your billing account was reset. Please subscribe again to access billing management." },
        { status: 400 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://profitpnl.com"}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Manage billing error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    // Always return a friendly message — never leak internal errors to the user
    if (
      message.includes("STRIPE_NOT_CONFIGURED") ||
      message.includes("api key") ||
      message.includes("secret")
    ) {
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
