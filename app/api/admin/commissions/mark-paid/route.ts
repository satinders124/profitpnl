import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/affiliates";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    requireAdmin(user);

    const { affiliateId, commissionIds, notes } = (await req.json().catch(() => ({}))) as {
      affiliateId?: string;
      commissionIds?: string[];
      notes?: string;
    };

    if (!affiliateId && (!commissionIds || commissionIds.length === 0)) {
      return NextResponse.json({ error: "affiliateId or commissionIds required." }, { status: 400 });
    }

    const supabase = createServerClient();
    let query = supabase
      .from("affiliate_commissions")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .in("status", ["pending", "approved"]);

    if (commissionIds && commissionIds.length > 0) {
      query = query.in("id", commissionIds);
    } else if (affiliateId) {
      query = query.eq("affiliate_id", affiliateId);
    }

    const { data: updated, error } = await query.select("affiliate_id, commission_amount_cents, currency");

    if (error) {
      console.error("Mark commissions paid error:", error);
      return NextResponse.json({ error: "Could not mark commissions paid." }, { status: 500 });
    }

    const rows = updated || [];
    const totals = new Map<string, { amount: number; currency: string }>();
    for (const row of rows) {
      const key = row.affiliate_id;
      const current = totals.get(key) || { amount: 0, currency: row.currency || "usd" };
      current.amount += Number(row.commission_amount_cents || 0);
      totals.set(key, current);
    }

    for (const [affId, total] of totals.entries()) {
      if (total.amount > 0) {
        await supabase.from("affiliate_payouts").insert({
          affiliate_id: affId,
          amount_cents: total.amount,
          currency: total.currency,
          status: "paid",
          paid_at: new Date().toISOString(),
          notes: notes || "Marked paid from admin dashboard",
        });
      }
    }

    return NextResponse.json({ ok: true, updated: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Mark paid route error:", error);
    return NextResponse.json({ error: "Could not mark commissions paid." }, { status: 500 });
  }
}
