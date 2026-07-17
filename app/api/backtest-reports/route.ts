import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";
import { buildBacktestReport } from "@/lib/backtesting/reporting";
import type { BacktestJournalTrade, BacktestModel, BacktestProfile } from "@/lib/backtesting/journal";

export const runtime = "nodejs";

type Body = {
  title?: string;
  modelIds?: string[];
  visibility?: "public" | "private";
};

function publicId() {
  return `bt_${crypto.randomBytes(8).toString("hex")}`;
}

function appUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("backtest_reports")
      .select("public_id, title, visibility, period_start, period_end, metrics, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return NextResponse.json({ reports: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization") || message.includes("session")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Backtest reports GET error:", error);
    return NextResponse.json({ error: "Could not load reports." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = (await req.json().catch(() => ({}))) as Body;
    const requestedModelIds = Array.isArray(body.modelIds) ? body.modelIds.filter(Boolean) : [];
    const title = (body.title || "Backtesting Performance Report").trim().slice(0, 120);
    const visibility = body.visibility === "private" ? "private" : "public";
    const supabase = createServerClient();

    let sessionQuery = supabase
      .from("backtest_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("kind", "journal");
    if (requestedModelIds.length) sessionQuery = sessionQuery.in("id", requestedModelIds);

    const { data: modelsRaw, error: modelError } = await sessionQuery.order("created_at", { ascending: false });
    if (modelError) throw modelError;
    const models = (modelsRaw || []) as BacktestModel[];
    const ids = models.map((model) => model.id);
    if (!ids.length) return NextResponse.json({ error: "No backtest models selected." }, { status: 400 });

    const [{ data: tradesRaw, error: tradeError }, { data: profileRaw }] = await Promise.all([
      supabase
        .from("backtest_trades")
        .select("*")
        .eq("user_id", user.id)
        .in("session_id", ids)
        .order("trade_date", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase.from("backtest_profile").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    if (tradeError) throw tradeError;
    const { metrics, trades } = buildBacktestReport({
      models,
      trades: (tradesRaw || []) as BacktestJournalTrade[],
      profile: (profileRaw || null) as BacktestProfile | null,
    });

    const id = publicId();
    const { data, error } = await supabase
      .from("backtest_reports")
      .insert({
        public_id: id,
        user_id: user.id,
        title,
        visibility,
        model_ids: ids,
        period_start: metrics.periodStart,
        period_end: metrics.periodEnd,
        metrics,
        trades,
      })
      .select("public_id, title, visibility, period_start, period_end, metrics, created_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ report: data, url: `${appUrl(req)}/backtest-report/${id}`, pdfUrl: `${appUrl(req)}/api/backtest-reports/${id}/pdf` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization") || message.includes("session")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Backtest reports POST error:", error);
    return NextResponse.json({ error: "Could not create report." }, { status: 500 });
  }
}
