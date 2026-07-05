import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase-server";
import { createAffiliateCommission, invoiceSubscriptionId } from "@/lib/affiliate-commissions";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_NOT_CONFIGURED");
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

/**
 * POST /api/payments/webhook
 *
 * Receives Stripe events, updates the user's plan in Supabase, and records
 * affiliate commissions. Commission creation is idempotent by stripe_invoice_id
 * so both checkout.session.completed and invoice.payment_succeeded can safely
 * try to sync the same first invoice.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServerClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = session.metadata?.supabase_uid;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (!uid) break;

      await supabase
        .from("profiles")
        .update({
          plan: "Pro Plan",
          plan_source: "paid",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          trial_ended_email_sent_at: null,
          trial_reminder_sent_at: null,
        })
        .eq("id", uid);

      if (session.metadata?.affiliate_id) {
        await supabase
          .from("referral_attributions")
          .upsert(
            {
              affiliate_id: session.metadata.affiliate_id,
              user_id: uid,
              ref_code: session.metadata.affiliate_slug || null,
              coupon_code: session.metadata.coupon_code || null,
              source: session.metadata.referral_source || "checkout_metadata",
            },
            { onConflict: "user_id", ignoreDuplicates: true }
          );
      }

      // Some Stripe setups deliver checkout.session.completed before/without the
      // first invoice.payment_succeeded event reaching us during tests. Create
      // the first affiliate commission here too when an invoice is attached.
      const invoiceId = typeof session.invoice === "string" ? session.invoice : session.invoice?.id;
      if (invoiceId) {
        try {
          const invoice = await stripe.invoices.retrieve(invoiceId);
          await createAffiliateCommission({ invoice, stripe, supabase, userId: uid });
        } catch (commissionError) {
          console.error("Checkout affiliate commission fallback error:", commissionError);
        }
      }

      console.log(`[webhook] User ${uid} upgraded to Pro Plan (paid)`);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .limit(1);

      if (profiles && profiles.length > 0) {
        await supabase
          .from("profiles")
          .update({
            plan: "Free Plan",
            plan_source: "",
            stripe_subscription_id: null,
          })
          .eq("id", profiles[0].id);

        console.log(`[webhook] User ${profiles[0].id} subscription cancelled → Free Plan`);
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      if (invoice.billing_reason !== "subscription_cycle" &&
          invoice.billing_reason !== "subscription_create") break;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .limit(1);

      let userId = profiles?.[0]?.id || null;

      // The first invoice can arrive before checkout.session.completed updates
      // profiles.stripe_customer_id. Fall back to subscription metadata so paid
      // affiliate commissions are not missed in test/live Stripe ordering.
      if (!userId) {
        const subscriptionId = invoiceSubscriptionId(invoice);
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            userId = subscription.metadata?.supabase_uid || null;
          } catch (subscriptionError) {
            console.error("Invoice subscription metadata lookup error:", subscriptionError);
          }
        }
      }

      if (userId) {
        await supabase
          .from("profiles")
          .update({ plan: "Pro Plan", plan_source: "paid", stripe_customer_id: customerId })
          .eq("id", userId);

        await createAffiliateCommission({
          invoice,
          stripe,
          supabase,
          userId,
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .limit(1);

      if (profiles && profiles.length > 0) {
        await supabase
          .from("profiles")
          .update({ payment_failed_at: new Date().toISOString() })
          .eq("id", profiles[0].id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
