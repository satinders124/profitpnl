import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase-server";
import { cents, getAffiliateByPromotionCodeId, type Affiliate } from "@/lib/affiliates";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_NOT_CONFIGURED");
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

type SupabaseServer = ReturnType<typeof createServerClient>;

type InvoiceLike = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
  amount_paid?: number;
  total?: number;
  discount?: { promotion_code?: string | null } | null;
  discounts?: Array<string | { promotion_code?: string | null }>;
  metadata?: Record<string, string> | null;
};

function subscriptionIdFromInvoice(invoice: InvoiceLike) {
  const subscription = invoice.subscription;
  if (!subscription) return null;
  return typeof subscription === "string" ? subscription : subscription.id;
}

function promotionCodeIdFromInvoice(invoice: InvoiceLike) {
  const direct = invoice.discount?.promotion_code;
  if (typeof direct === "string") return direct;
  const firstDiscount = invoice.discounts?.[0];
  if (firstDiscount && typeof firstDiscount !== "string" && typeof firstDiscount.promotion_code === "string") {
    return firstDiscount.promotion_code;
  }
  return null;
}

async function getAffiliateById(supabase: SupabaseServer, affiliateId?: string | null): Promise<Affiliate | null> {
  if (!affiliateId) return null;
  const { data, error } = await supabase
    .from("affiliates")
    .select("*")
    .eq("id", affiliateId)
    .maybeSingle();
  if (error) {
    console.error("Affiliate id lookup error:", error);
    return null;
  }
  return data as Affiliate | null;
}

async function getAffiliateFromAttribution(supabase: SupabaseServer, userId?: string | null): Promise<Affiliate | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("referral_attributions")
    .select("affiliates(*)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("Affiliate attribution lookup error:", error);
    return null;
  }
  return (data?.affiliates as Affiliate | undefined) || null;
}

async function getAffiliateForInvoice({
  invoice,
  stripe,
  supabase,
  userId,
}: {
  invoice: InvoiceLike;
  stripe: Stripe;
  supabase: SupabaseServer;
  userId?: string | null;
}): Promise<{ affiliate: Affiliate | null; subscriptionId: string | null; couponCode: string | null }> {
  const subscriptionId = subscriptionIdFromInvoice(invoice);
  let couponCode: string | null = null;

  // 1) Promotion code actually used in Stripe invoice wins.
  const promotionCodeId = promotionCodeIdFromInvoice(invoice);
  if (promotionCodeId) {
    const affiliate = await getAffiliateByPromotionCodeId(promotionCodeId);
    if (affiliate) return { affiliate, subscriptionId, couponCode: affiliate.coupon_code };
  }

  // 2) Subscription metadata from checkout.
  if (subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      couponCode = subscription.metadata?.coupon_code || null;
      const affiliate = await getAffiliateById(supabase, subscription.metadata?.affiliate_id || null);
      if (affiliate) return { affiliate, subscriptionId, couponCode: couponCode || affiliate.coupon_code };
    } catch (error) {
      console.error("Subscription retrieve for affiliate failed:", error);
    }
  }

  // 3) Invoice/session metadata fallback.
  const metadataAffiliate = await getAffiliateById(supabase, invoice.metadata?.affiliate_id || null);
  if (metadataAffiliate) {
    return { affiliate: metadataAffiliate, subscriptionId, couponCode: invoice.metadata?.coupon_code || metadataAffiliate.coupon_code };
  }

  // 4) Signup attribution fallback.
  const attributed = await getAffiliateFromAttribution(supabase, userId);
  if (attributed) return { affiliate: attributed, subscriptionId, couponCode: attributed.coupon_code };

  return { affiliate: null, subscriptionId, couponCode };
}

async function createAffiliateCommission({
  invoice,
  stripe,
  supabase,
  userId,
}: {
  invoice: Stripe.Invoice;
  stripe: Stripe;
  supabase: SupabaseServer;
  userId?: string | null;
}) {
  const typedInvoice = invoice as InvoiceLike;
  const grossAmountCents = cents(typedInvoice.amount_paid ?? typedInvoice.total ?? 0);
  if (grossAmountCents <= 0) return;

  const { affiliate, subscriptionId, couponCode } = await getAffiliateForInvoice({
    invoice: typedInvoice,
    stripe,
    supabase,
    userId,
  });

  if (!affiliate) return;

  const { data: existing } = await supabase
    .from("affiliate_commissions")
    .select("id")
    .eq("stripe_invoice_id", invoice.id)
    .maybeSingle();
  if (existing?.id) return;

  const commissionAmountCents = Math.round(grossAmountCents * (Number(affiliate.commission_percent) / 100));

  const { error } = await supabase.from("affiliate_commissions").insert({
    affiliate_id: affiliate.id,
    user_id: userId || null,
    stripe_customer_id: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null,
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoice.id,
    coupon_code: couponCode || affiliate.coupon_code,
    currency: invoice.currency || "usd",
    gross_amount_cents: grossAmountCents,
    commission_amount_cents: commissionAmountCents,
    commission_percent: affiliate.commission_percent,
    status: "pending",
  });

  if (error) {
    console.error("Affiliate commission insert error:", error);
  }
}

/**
 * POST /api/payments/webhook
 *
 * Receives Stripe events and updates the user's plan in Supabase.
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
      // the first affiliate commission here too when an invoice is attached;
      // createAffiliateCommission is idempotent on stripe_invoice_id, so the
      // invoice webhook can safely run later without double-paying.
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
        const subscriptionId = subscriptionIdFromInvoice(invoice as InvoiceLike);
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
