import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";
import { formatMoney, type Affiliate } from "@/lib/affiliates";

export const runtime = "nodejs";

type CommissionRow = {
  id: string;
  user_id: string | null;
  stripe_invoice_id: string | null;
  coupon_code: string | null;
  currency: string;
  gross_amount_cents: number;
  commission_amount_cents: number;
  status: string;
  created_at: string;
};

function sum(rows: CommissionRow[], field: "gross_amount_cents" | "commission_amount_cents") {
  return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const supabase = createServerClient();

    const { data: byUserId, error: byUserError } = await supabase
      .from("affiliates")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (byUserError) {
      console.error("Affiliate dashboard user_id lookup error:", byUserError);
      return NextResponse.json({ error: "Could not load affiliate dashboard." }, { status: 500 });
    }

    let affiliate = byUserId as Affiliate | null;

    if (!affiliate && user.email) {
      const { data: byEmail, error: byEmailError } = await supabase
        .from("affiliates")
        .select("*")
        .ilike("email", user.email)
        .maybeSingle();

      if (byEmailError) {
        console.error("Affiliate dashboard email lookup error:", byEmailError);
        return NextResponse.json({ error: "Could not load affiliate dashboard." }, { status: 500 });
      }
      affiliate = byEmail as Affiliate | null;
    }

    if (!affiliate) {
      return NextResponse.json({ affiliate: null, summary: null, commissions: [], payouts: [] });
    }

    const aff = affiliate;
    const [{ count: clicks }, { count: signups }, { data: commissions }, { data: payouts }] = await Promise.all([
      supabase.from("referral_clicks").select("id", { count: "exact", head: true }).eq("affiliate_id", aff.id),
      supabase.from("referral_attributions").select("id", { count: "exact", head: true }).eq("affiliate_id", aff.id),
      supabase
        .from("affiliate_commissions")
        .select("id, user_id, stripe_invoice_id, coupon_code, currency, gross_amount_cents, commission_amount_cents, status, created_at")
        .eq("affiliate_id", aff.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("affiliate_payouts")
        .select("id, amount_cents, currency, status, period_start, period_end, paid_at, notes, created_at")
        .eq("affiliate_id", aff.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const rows = (commissions || []) as CommissionRow[];
    const paidCustomers = new Set(rows.filter((row) => row.status !== "reversed" && row.user_id).map((row) => row.user_id)).size;
    const pending = rows.filter((row) => row.status === "pending");
    const approved = rows.filter((row) => row.status === "approved");
    const paid = rows.filter((row) => row.status === "paid");

    return NextResponse.json({
      affiliate: {
        name: aff.name,
        email: aff.email,
        slug: aff.slug,
        couponCode: aff.coupon_code,
        discountPercent: aff.discount_percent,
        discountDurationMonths: aff.discount_duration_months,
        commissionPercent: aff.commission_percent,
        commissionDurationMonths: aff.commission_duration_months,
        status: aff.status,
      },
      links: {
        referralPath: `/r/${aff.slug}`,
      },
      summary: {
        clicks: clicks || 0,
        signups: signups || 0,
        paidCustomers,
        grossRevenueCents: sum(rows, "gross_amount_cents"),
        pendingCommissionCents: sum(pending, "commission_amount_cents"),
        approvedCommissionCents: sum(approved, "commission_amount_cents"),
        paidCommissionCents: sum(paid, "commission_amount_cents"),
      },
      commissions: rows.map((row) => ({
        ...row,
        customer: row.user_id ? `Customer ${row.user_id.slice(0, 8)}` : "Customer",
        grossFormatted: formatMoney(row.gross_amount_cents, row.currency),
        commissionFormatted: formatMoney(row.commission_amount_cents, row.currency),
      })),
      payouts: payouts || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Affiliate dashboard route error:", error);
    return NextResponse.json({ error: "Could not load affiliate dashboard." }, { status: 500 });
  }
}
