import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase-server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createAffiliateCommission } from "@/lib/affiliate-commissions";

let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

async function handleVerify(req: Request, sessionId?: string | null) {
  let authUser;
  try {
    authUser = await getAuthenticatedUser(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = authUser.id;
  const supabase = createServerClient();
  const stripe = getStripe();

  // 1. If we have a session_id and Stripe secret key is configured
  if (sessionId && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session && (session.status === "complete" || session.payment_status === "paid")) {
        const targetUid = session.metadata?.supabase_uid || uid;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        // Ensure user only verifies their own session
        if (targetUid === uid) {
          await supabase
            .from("profiles")
            .update({
              plan: "Pro Plan",
              plan_source: "paid",
              stripe_customer_id: customerId || undefined,
              stripe_subscription_id: subscriptionId || undefined,
              trial_ended_email_sent_at: null,
              trial_reminder_sent_at: null,
            })
            .eq("id", uid);

          // Safety net for affiliate commissions: if Stripe webhooks are delayed
          // or missed in test mode, the success redirect verification can still
          // sync the first invoice commission. This is idempotent by invoice id.
          const invoiceId = typeof session.invoice === "string" ? session.invoice : session.invoice?.id;
          if (invoiceId) {
            try {
              const invoice = await stripe.invoices.retrieve(invoiceId);
              await createAffiliateCommission({ invoice, stripe, supabase, userId: uid });
            } catch (commissionError) {
              console.error("Verify affiliate commission sync error:", commissionError);
            }
          }

          return NextResponse.json({ success: true, plan: "Pro Plan", planSource: "paid" });
        }
      }
    } catch (err) {
      console.error("Error retrieving checkout session:", err);
    }
  }

  // 2. Check active subscriptions by authenticated user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, plan, plan_source")
    .eq("id", uid)
    .single();

  if (profile?.stripe_customer_id && stripe) {
    try {
      const subs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: "active",
        limit: 1,
      });

      if (subs && subs.data && subs.data.length > 0) {
        await supabase
          .from("profiles")
          .update({
            plan: "Pro Plan",
            plan_source: "paid",
            stripe_subscription_id: subs.data[0].id,
            trial_ended_email_sent_at: null,
            trial_reminder_sent_at: null,
          })
          .eq("id", uid);

        return NextResponse.json({ success: true, plan: "Pro Plan", planSource: "paid" });
      }
    } catch (err) {
      console.error("Error checking active subscriptions:", err);
    }
  }

  // Return current profile status if no active subscription update occurred
  return NextResponse.json({
    success: true,
    plan: profile?.plan || "Free Plan",
    planSource: profile?.plan_source || "",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const { session_id } = body || {};
    return await handleVerify(req, session_id);
  } catch (err) {
    console.error("Verify endpoint error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get("session_id");
    return await handleVerify(req, session_id);
  } catch (err) {
    console.error("Verify endpoint error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
