import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase-admin";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * POST /api/payments/webhook
 *
 * Receives Stripe events and updates the user's plan in Firestore.
 *
 * Key events handled:
 * - checkout.session.completed  → upgrade user to Pro Plan
 * - customer.subscription.deleted → revert user to Free Plan
 * - invoice.payment_succeeded  → ensure plan stays Pro (renewal)
 * - customer.subscription.updated → handle plan changes
 *
 * IMPORTANT: This route must NOT have body parsing middleware applied —
 * Stripe requires the raw request body to verify the webhook signature.
 * In Next.js App Router, use the `req.text()` method to get the raw body.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const adminDb = getAdminDb();

  switch (event.type) {
    // ─── New subscription created via Checkout ───
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = session.metadata?.firebaseUID;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (!uid) break;

      await adminDb.collection("users").doc(uid).update({
        plan: "Pro Plan",
        planSource: "paid",
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        // Clear any trial fields — user is now a paying customer
        trialEndedEmailSentAt: null,
        trialReminderSentAt: null,
      });

      console.log(`[webhook] User ${uid} upgraded to Pro Plan (paid)`);
      break;
    }

    // ─── Subscription cancelled / not renewed ───
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Find user by Stripe customer ID
      const snap = await adminDb
        .collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

      if (snap.empty) break;

      const userDoc = snap.docs[0];
      await userDoc.ref.update({
        plan: "Free Plan",
        planSource: "",
        stripeSubscriptionId: null,
      });

      console.log(
        `[webhook] User ${userDoc.id} subscription cancelled → reverted to Free Plan`
      );
      break;
    }

    // ─── Recurring payment succeeded (monthly/annual renewal) ───
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      // Only handle subscription invoices, not one-off payments
      if (invoice.billing_reason !== "subscription_cycle" && 
          invoice.billing_reason !== "subscription_create") break;

      const snap = await adminDb
        .collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

      if (snap.empty) break;

      const userDoc = snap.docs[0];
      await userDoc.ref.update({
        plan: "Pro Plan",
        planSource: "paid",
      });

      console.log(
        `[webhook] User ${userDoc.id} payment succeeded — plan confirmed Pro`
      );
      break;
    }

    // ─── Recurring payment failed ───
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const snap = await adminDb
        .collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

      if (snap.empty) break;

      const userDoc = snap.docs[0];
      // Don't immediately downgrade — Stripe will retry.
      // Just flag it so you can email the user or show a banner.
      await userDoc.ref.update({
        paymentFailedAt: new Date(),
      });

      console.log(
        `[webhook] User ${userDoc.id} payment failed — flagged for follow-up`
      );
      break;
    }

    default:
      // Unhandled event type — safe to ignore
      break;
  }

  return NextResponse.json({ received: true });
}
