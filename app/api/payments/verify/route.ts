import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase-server";

let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

async function handleVerify(sessionId?: string | null, uid?: string | null) {
  if (!sessionId && !uid) {
    return NextResponse.json({ error: "Missing session_id or uid" }, { status: 400 });
  }

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

        if (targetUid) {
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
            .eq("id", targetUid);

          return NextResponse.json({ success: true, plan: "Pro Plan", planSource: "paid" });
        }
      }
    } catch (err) {
      console.error("Error retrieving checkout session:", err);
    }
  }

  // 2. If no session_id or session check failed, check active subscriptions by user profile
  if (uid) {
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

  return NextResponse.json({ error: "Could not verify payment" }, { status: 400 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const { session_id, uid } = body || {};
    return await handleVerify(session_id, uid);
  } catch (err) {
    console.error("Verify endpoint error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get("session_id");
    const uid = searchParams.get("uid");
    return await handleVerify(session_id, uid);
  } catch (err) {
    console.error("Verify endpoint error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
