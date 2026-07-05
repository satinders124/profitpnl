import crypto from "node:crypto";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import sgMail from "@sendgrid/mail";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";
import { normalizeCouponCode, normalizeSlug, requireAdmin, type Affiliate } from "@/lib/affiliates";

export const runtime = "nodejs";

let _stripe: Stripe | null = null;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

type CreateAffiliateBody = {
  name?: string;
  email?: string;
  slug?: string;
  couponCode?: string;
  discountPercent?: number;
  discountDurationMonths?: number;
  commissionPercent?: number;
  commissionDurationMonths?: number;
  notes?: string;
  createStripePromo?: boolean;
  grantFreeAccess?: boolean;
  sendWelcomeEmail?: boolean;
};

type SupabaseServer = ReturnType<typeof createServerClient>;

async function assertAdmin(req: Request) {
  const user = await getAuthenticatedUser(req);
  requireAdmin(user);
  return user;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://profitpnl.com";
}

async function ensureAffiliateAccount({
  supabase,
  email,
  name,
}: {
  supabase: SupabaseServer;
  email: string;
  name: string;
}) {
  let userId: string | null = null;
  let createdUser = false;
  let setupLink = `${appUrl()}/forgot-password`;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existingProfile?.id) {
    userId = existingProfile.id;
  }

  if (!userId) {
    const temporaryPassword = `${crypto.randomBytes(24).toString("base64url")}Aa1!`;
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        display_name: name,
        affiliate_partner: true,
      },
    });

    if (!createError && created.user?.id) {
      userId = created.user.id;
      createdUser = true;
    } else {
      console.error("Affiliate user create error:", createError);
      const { data: retryProfile } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      userId = retryProfile?.id || null;
    }
  }

  if (userId) {
    const profilePayload = {
      id: userId,
      email,
      display_name: name,
      plan: "Pro Plan",
      plan_source: "affiliate",
      trial_ends_at: null,
      trial_reminder_sent_at: null,
      trial_ended_email_sent_at: null,
    };

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });

    if (upsertError) {
      console.error("Affiliate profile Pro access upsert error:", upsertError);
      await supabase
        .from("profiles")
        .update({
          display_name: name,
          plan: "Pro Plan",
          plan_source: "affiliate",
          trial_ends_at: null,
          trial_reminder_sent_at: null,
          trial_ended_email_sent_at: null,
        })
        .eq("id", userId);
    }
  }

  try {
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${appUrl()}/reset-password`,
      },
    });
    const actionLink = linkData?.properties?.action_link;
    if (actionLink) setupLink = actionLink;
  } catch (error) {
    console.error("Affiliate setup link generation error:", error);
  }

  return { userId, createdUser, setupLink };
}

function affiliateWelcomeHtml({
  name,
  couponCode,
  slug,
  discountPercent,
  discountDurationMonths,
  commissionPercent,
  commissionDurationMonths,
  setupLink,
}: {
  name: string;
  couponCode: string;
  slug: string;
  discountPercent: number;
  discountDurationMonths: number;
  commissionPercent: number;
  commissionDurationMonths: number;
  setupLink: string;
}) {
  const referralLink = `${appUrl()}/r/${slug}`;
  const dashboardLink = `${appUrl()}/affiliate`;
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#080810;font-family:Arial,Helvetica,sans-serif;color:#f0f0ff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080810;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#161628;border:1px solid #1e1e38;border-radius:18px;overflow:hidden;">
          <tr><td style="height:4px;background:linear-gradient(90deg,#c8961e,#f0b429,#c8961e);"></td></tr>
          <tr><td style="padding:34px 38px;">
            <h1 style="margin:0 0 12px;font-size:28px;line-height:1.25;color:#fff;">Welcome to the ProfitPnL Affiliate Program 🚀</h1>
            <p style="margin:0 0 18px;color:#a0a0c0;line-height:1.7;">Hey ${name}, your affiliate account is ready. We also granted Pro access to this email so you can use and show ProfitPnL properly.</p>

            <div style="background:#0d0d1a;border:1px solid #1e1e38;border-radius:14px;padding:18px;margin:22px 0;">
              <p style="margin:0 0 8px;color:#5a5a80;font-size:12px;text-transform:uppercase;letter-spacing:1.6px;">Your offer</p>
              <p style="margin:0;color:#fff;font-size:18px;"><strong>${couponCode}</strong> — ${discountPercent}% off for ${discountDurationMonths} months</p>
              <p style="margin:10px 0 0;color:#a0a0c0;">Commission: <strong style="color:#f0b429;">${commissionPercent}%</strong> for ${commissionDurationMonths} months.</p>
            </div>

            <p style="margin:0 0 8px;color:#a0a0c0;">Referral link:</p>
            <p style="margin:0 0 18px;word-break:break-all;font-family:monospace;color:#f0b429;">${referralLink}</p>

            <a href="${dashboardLink}" style="display:inline-block;background:linear-gradient(135deg,#f0b429,#c8961e);color:#080810;text-decoration:none;font-weight:bold;border-radius:12px;padding:14px 24px;margin-right:10px;">Open Dashboard</a>
            <a href="${setupLink}" style="display:inline-block;border:1px solid #f0b429;color:#f0b429;text-decoration:none;font-weight:bold;border-radius:12px;padding:13px 22px;">Set Password</a>

            <p style="margin:24px 0 0;color:#5a5a80;font-size:12px;line-height:1.7;">If the password link expires, go to ${appUrl()}/forgot-password and request a new link using this email.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

async function sendAffiliateWelcomeEmail(args: {
  email: string;
  name: string;
  couponCode: string;
  slug: string;
  discountPercent: number;
  discountDurationMonths: number;
  commissionPercent: number;
  commissionDurationMonths: number;
  setupLink: string;
}) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL || "hello@profitpnl.com";
  if (!apiKey || !fromEmail) {
    return { sent: false, reason: "SendGrid not configured" };
  }

  sgMail.setApiKey(apiKey);
  await sgMail.send({
    to: args.email,
    from: { email: fromEmail, name: "ProfitPnL" },
    subject: `Your ProfitPnL affiliate code is ${args.couponCode}`,
    text:
      `Hey ${args.name},\n\n` +
      `Your ProfitPnL affiliate account is ready.\n\n` +
      `Referral link: ${appUrl()}/r/${args.slug}\n` +
      `Coupon code: ${args.couponCode}\n` +
      `Audience offer: ${args.discountPercent}% off for ${args.discountDurationMonths} months\n` +
      `Your commission: ${args.commissionPercent}% for ${args.commissionDurationMonths} months\n\n` +
      `Affiliate dashboard: ${appUrl()}/affiliate\n` +
      `Set password: ${args.setupLink}\n\n` +
      `— ProfitPnL`,
    html: affiliateWelcomeHtml(args),
  });

  return { sent: true };
}

export async function GET(req: Request) {
  try {
    await assertAdmin(req);
    const supabase = createServerClient();

    const [{ data: affiliates, error }, { data: clicks }, { data: attributions }, { data: commissions }] = await Promise.all([
      supabase.from("affiliates").select("*").order("created_at", { ascending: false }),
      supabase.from("referral_clicks").select("affiliate_id"),
      supabase.from("referral_attributions").select("affiliate_id"),
      supabase.from("affiliate_commissions").select("affiliate_id, gross_amount_cents, commission_amount_cents, status, user_id"),
    ]);

    if (error) {
      console.error("Admin affiliate list error:", error);
      return NextResponse.json({ error: "Could not load affiliates. Run the affiliate migration first." }, { status: 500 });
    }

    const rows = ((affiliates || []) as Affiliate[]).map((affiliate) => {
      const affClicks = (clicks || []).filter((row) => row.affiliate_id === affiliate.id).length;
      const affAttributions = (attributions || []).filter((row) => row.affiliate_id === affiliate.id).length;
      const affCommissions = (commissions || []).filter((row) => row.affiliate_id === affiliate.id);
      const gross = affCommissions.reduce((sum, row) => sum + Number(row.gross_amount_cents || 0), 0);
      const commission = affCommissions.reduce((sum, row) => sum + Number(row.commission_amount_cents || 0), 0);
      const paidCustomers = new Set(affCommissions.map((row) => row.user_id).filter(Boolean)).size;
      return { ...affiliate, clicks: affClicks, signups: affAttributions, paidCustomers, grossRevenueCents: gross, commissionCents: commission };
    });

    return NextResponse.json({ affiliates: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Admin affiliate route error:", error);
    return NextResponse.json({ error: "Could not load affiliates." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await assertAdmin(req);
    const body = (await req.json().catch(() => ({}))) as CreateAffiliateBody;

    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const slug = normalizeSlug(body.slug || name);
    const couponCode = normalizeCouponCode(body.couponCode || slug.replace(/-/g, "").slice(0, 10));
    const discountPercent = Number(body.discountPercent ?? 20);
    const discountDurationMonths = Math.max(1, Math.round(Number(body.discountDurationMonths ?? 3)));
    const commissionPercent = Number(body.commissionPercent ?? 30);
    const commissionDurationMonths = Math.max(1, Math.round(Number(body.commissionDurationMonths ?? 12)));
    const grantFreeAccess = body.grantFreeAccess !== false;
    const sendWelcomeEmail = body.sendWelcomeEmail !== false;

    if (!name || !email || !slug || !couponCode) {
      return NextResponse.json({ error: "Name, email, slug, and coupon code are required." }, { status: 400 });
    }

    if (discountPercent < 0 || discountPercent > 100 || commissionPercent < 0 || commissionPercent > 100) {
      return NextResponse.json({ error: "Percent values must be between 0 and 100." }, { status: 400 });
    }

    let stripeCouponId: string | null = null;
    let stripePromotionCodeId: string | null = null;

    const stripe = getStripe();
    if (body.createStripePromo !== false && stripe) {
      const coupon = await stripe.coupons.create({
        percent_off: discountPercent,
        duration: "repeating",
        duration_in_months: discountDurationMonths,
        name: `${couponCode} — ${discountPercent}% off ${discountDurationMonths} months`,
        metadata: { affiliate_slug: slug, coupon_code: couponCode },
      });
      stripeCouponId = coupon.id;

      const promo = await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: coupon.id },
        code: couponCode,
        active: true,
        metadata: { affiliate_slug: slug, coupon_code: couponCode },
      });
      stripePromotionCodeId = promo.id;
    }

    const supabase = createServerClient();
    let affiliateUserId: string | null = null;
    let setupLink = `${appUrl()}/forgot-password`;
    let accountCreated = false;

    if (grantFreeAccess) {
      const access = await ensureAffiliateAccount({ supabase, email, name });
      affiliateUserId = access.userId;
      setupLink = access.setupLink;
      accountCreated = access.createdUser;
    }

    const { data, error } = await supabase
      .from("affiliates")
      .insert({
        user_id: affiliateUserId,
        name,
        email,
        slug,
        coupon_code: couponCode,
        discount_percent: discountPercent,
        discount_duration_months: discountDurationMonths,
        commission_percent: commissionPercent,
        commission_duration_months: commissionDurationMonths,
        stripe_coupon_id: stripeCouponId,
        stripe_promotion_code_id: stripePromotionCodeId,
        notes: body.notes || null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Admin affiliate create error:", error);
      return NextResponse.json({ error: "Could not create affiliate. Code/slug may already exist or migration is missing." }, { status: 500 });
    }

    let welcomeEmail: { sent: boolean; reason?: string } = { sent: false, reason: "disabled" };
    if (sendWelcomeEmail) {
      try {
        welcomeEmail = await sendAffiliateWelcomeEmail({
          email,
          name,
          couponCode,
          slug,
          discountPercent,
          discountDurationMonths,
          commissionPercent,
          commissionDurationMonths,
          setupLink,
        });
      } catch (emailError) {
        console.error("Affiliate welcome email error:", emailError);
        welcomeEmail = { sent: false, reason: "email_failed" };
      }
    }

    return NextResponse.json({ affiliate: data, access: { userId: affiliateUserId, accountCreated }, welcomeEmail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Admin affiliate create route error:", error);
    return NextResponse.json({ error: message || "Could not create affiliate." }, { status: 500 });
  }
}
