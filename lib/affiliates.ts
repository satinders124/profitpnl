import crypto from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase-server";

export const REF_COOKIE = "ppnl_ref";
export const COUPON_COOKIE = "ppnl_coupon";
export const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 60; // 60 days

export type Affiliate = {
  id: string;
  user_id?: string | null;
  name: string;
  email: string;
  slug: string;
  coupon_code: string;
  discount_percent: number;
  discount_duration_months: number;
  commission_percent: number;
  commission_duration_months: number;
  status: "active" | "inactive" | string;
  stripe_coupon_id?: string | null;
  stripe_promotion_code_id?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AffiliateSummary = {
  clicks: number;
  signups: number;
  paidCustomers: number;
  grossRevenueCents: number;
  pendingCommissionCents: number;
  paidCommissionCents: number;
  approvedCommissionCents: number;
};

export function normalizeCouponCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
}

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function parseCookieHeader(cookieHeader: string | null) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (!key) continue;
    out[key] = decodeURIComponent(rest.join("="));
  }
  return out;
}

export function hashForPrivacy(value: string | null | undefined) {
  if (!value) return null;
  const secret = process.env.AFFILIATE_HASH_SECRET || process.env.CERTIFICATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-affiliate-hash";
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function maskEmail(email?: string | null) {
  if (!email || !email.includes("@")) return "Customer";
  const [name, domain] = email.split("@");
  const start = name.slice(0, 2);
  return `${start}${"*".repeat(Math.max(2, Math.min(5, name.length - 2)))}@${domain}`;
}

function configuredAdminEmails() {
  return [
    process.env.ADMIN_EMAILS,
    process.env.ADMIN_EMAIL,
    process.env.OWNER_EMAIL,
    // Fallbacks for projects that accidentally configured the public-prefixed
    // variable name in Vercel. Prefer ADMIN_EMAILS for production.
    process.env.NEXT_PUBLIC_ADMIN_EMAILS,
    process.env.NEXT_PUBLIC_ADMIN_EMAIL,
  ]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  const configured = configuredAdminEmails();
  if (!configured.length || !email) return false;
  return configured.includes(email.toLowerCase());
}

function hasAdminAppMetadata(user: User) {
  const appMetadata = user.app_metadata || {};
  const roles = Array.isArray(appMetadata.roles) ? appMetadata.roles : [];

  return (
    appMetadata.role === "admin" ||
    appMetadata.admin === true ||
    appMetadata.is_admin === true ||
    roles.includes("admin")
  );
}

export function requireAdmin(user: User) {
  if (!isAdminEmail(user.email) && !hasAdminAppMetadata(user)) {
    throw new Error("Forbidden");
  }
}

export async function getAffiliateBySlug(slug: string): Promise<Affiliate | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("affiliates")
    .select("*")
    .eq("slug", normalizeSlug(slug))
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Affiliate slug lookup error:", error);
    return null;
  }
  return data as Affiliate | null;
}

export async function getAffiliateByCoupon(code: string): Promise<Affiliate | null> {
  const coupon = normalizeCouponCode(code);
  if (!coupon) return null;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("affiliates")
    .select("*")
    .ilike("coupon_code", coupon)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Affiliate coupon lookup error:", error);
    return null;
  }
  return data as Affiliate | null;
}

export async function getAffiliateByPromotionCodeId(promotionCodeId?: string | null): Promise<Affiliate | null> {
  if (!promotionCodeId) return null;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("affiliates")
    .select("*")
    .eq("stripe_promotion_code_id", promotionCodeId)
    .maybeSingle();
  if (error) {
    console.error("Affiliate promotion lookup error:", error);
    return null;
  }
  return data as Affiliate | null;
}

export async function getExistingAttribution(userId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("referral_attributions")
    .select("*, affiliates(*)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("Referral attribution lookup error:", error);
    return null;
  }
  return data;
}

export async function createAttributionIfMissing({
  userId,
  affiliate,
  source,
  couponCode,
}: {
  userId: string;
  affiliate: Affiliate;
  source: string;
  couponCode?: string | null;
}) {
  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from("referral_attributions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.id) return { created: false };

  const { error } = await supabase.from("referral_attributions").insert({
    affiliate_id: affiliate.id,
    user_id: userId,
    ref_code: affiliate.slug,
    coupon_code: normalizeCouponCode(couponCode || affiliate.coupon_code),
    source,
  });

  if (error) {
    console.error("Referral attribution insert error:", error);
    throw error;
  }

  return { created: true };
}

export async function getAffiliateForCheckout({
  userId,
  couponCode,
  refSlug,
}: {
  userId: string;
  couponCode?: string | null;
  refSlug?: string | null;
}): Promise<{ affiliate: Affiliate | null; source: string; couponCode: string | null }> {
  // Manual coupon wins.
  if (couponCode) {
    const affiliate = await getAffiliateByCoupon(couponCode);
    if (affiliate) return { affiliate, source: "manual_coupon", couponCode: affiliate.coupon_code };
  }

  // Referral cookie next.
  if (refSlug) {
    const affiliate = await getAffiliateBySlug(refSlug);
    if (affiliate) return { affiliate, source: "referral_cookie", couponCode: affiliate.coupon_code };
  }

  // Existing signup attribution last.
  const existing = await getExistingAttribution(userId);
  const affiliate = existing?.affiliates as Affiliate | undefined;
  if (affiliate?.id && affiliate.status === "active") {
    return { affiliate, source: "existing_attribution", couponCode: affiliate.coupon_code };
  }

  return { affiliate: null, source: "none", couponCode: null };
}

export function cents(amount?: number | null) {
  return Number.isFinite(amount || 0) ? Math.max(0, Math.round(amount || 0)) : 0;
}

export function formatMoney(centsValue: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format((centsValue || 0) / 100);
}
