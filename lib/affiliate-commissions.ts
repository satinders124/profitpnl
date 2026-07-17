import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase-server";
import {
  cents,
  getAffiliateByPromotionCodeId,
  type Affiliate,
} from "@/lib/affiliates";

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

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

async function isInsideCommissionWindow({
  supabase,
  affiliate,
  subscriptionId,
  userId,
  invoiceCreatedMs,
}: {
  supabase: SupabaseServer;
  affiliate: Affiliate;
  subscriptionId: string | null;
  userId?: string | null;
  invoiceCreatedMs: number;
}) {
  const durationMonths = Math.max(1, Math.round(Number(affiliate.commission_duration_months || 1)));

  let query = supabase
    .from("affiliate_commissions")
    .select("created_at")
    .eq("affiliate_id", affiliate.id)
    .neq("status", "reversed")
    .order("created_at", { ascending: true })
    .limit(1);

  if (subscriptionId) {
    query = query.eq("stripe_subscription_id", subscriptionId);
  } else if (userId) {
    query = query.eq("user_id", userId);
  } else {
    return true;
  }

  const { data, error } = await query;
  if (error) {
    console.error("Affiliate commission window lookup error:", error);
    // Do not block a valid commission because the reporting query failed.
    return true;
  }

  const firstCommissionAt = data?.[0]?.created_at;
  if (!firstCommissionAt) return true;

  const firstDate = new Date(firstCommissionAt);
  if (Number.isNaN(firstDate.getTime())) return true;

  return invoiceCreatedMs < addMonths(firstDate, durationMonths).getTime();
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

export async function getAffiliateForInvoice({
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

export async function createAffiliateCommission({
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
  if (grossAmountCents <= 0) return { created: false, reason: "zero_amount" };

  const { affiliate, subscriptionId, couponCode } = await getAffiliateForInvoice({
    invoice: typedInvoice,
    stripe,
    supabase,
    userId,
  });

  if (!affiliate) return { created: false, reason: "no_affiliate" };

  const { data: existing } = await supabase
    .from("affiliate_commissions")
    .select("id")
    .eq("stripe_invoice_id", invoice.id)
    .maybeSingle();
  if (existing?.id) return { created: false, reason: "already_exists" };

  const invoiceCreatedMs = typeof invoice.created === "number" ? invoice.created * 1000 : Date.now();
  const insideCommissionWindow = await isInsideCommissionWindow({
    supabase,
    affiliate,
    subscriptionId,
    userId,
    invoiceCreatedMs,
  });

  if (!insideCommissionWindow) {
    return { created: false, reason: "commission_window_elapsed" };
  }

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
    return { created: false, reason: "insert_error" };
  }

  return { created: true, affiliateId: affiliate.id, amountCents: commissionAmountCents };
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  return subscriptionIdFromInvoice(invoice as InvoiceLike);
}
