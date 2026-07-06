import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await getAuthenticatedUser(_req);
    const { id } = await params;
    const supabase = createServerClient();

    const { data: sess } = await supabase
      .from("backtest_sessions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (!sess) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const { data: trades } = await supabase
      .from("backtest_trades")
      .select("*")
      .eq("session_id", id)
      .eq("user_id", user.id)
      .order("trade_date", { ascending: true })
      .order("created_at", { ascending: true });

    return NextResponse.json({ trades: trades || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Backtest trades GET error:", error);
    return NextResponse.json({ error: "Could not load trades." }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    if (body.side !== "long" && body.side !== "short") {
      return NextResponse.json(
        { error: "Side must be long or short." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data: sess } = await supabase
      .from("backtest_sessions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (!sess) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const entryTime =
      body.entryTime || body.tradeDate
        ? new Date(String(body.entryTime || body.tradeDate)).toISOString()
        : new Date().toISOString();
    const exitTime = body.exitTime
      ? new Date(String(body.exitTime)).toISOString()
      : new Date().toISOString();

    const row: Record<string, unknown> = {
      session_id: id,
      user_id: user.id,
      symbol: body.symbol ? String(body.symbol) : null,
      side: body.side,
      entry_time: entryTime,
      exit_time: exitTime,
      entry_price: num(body.entryPrice),
      exit_price: num(body.exitPrice),
      stop_loss: num(body.stopLoss),
      take_profit: num(body.takeProfit),
      quantity: num(body.quantity),
      risk_amount: num(body.riskAmount),
      pnl: num(body.pnl),
      r_multiple: num(body.rMultiple),
      balance_after: num(body.balanceAfter),
      exit_reason: ["manual", "stop_loss", "take_profit"].includes(
        String(body.exitReason)
      )
        ? body.exitReason
        : "manual",
      setup: body.setup ? String(body.setup) : null,
      notes: body.notes ? String(body.notes) : null,
      rule_ticks: Array.isArray(body.ruleTicks) ? body.ruleTicks : [],
      be: num(body.be),
      deviations: body.deviations ? String(body.deviations) : null,
      psychology: body.psychology ? String(body.psychology) : null,
      result: body.result ? String(body.result) : null,
      risk: num(body.risk),
      risk_unit: body.riskUnit === "percent" ? "percent" : "currency",
      trade_date: body.tradeDate ? String(body.tradeDate) : null,
    };

    const { data, error } = await supabase
      .from("backtest_trades")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      console.error("Backtest trade insert error:", error);
      return NextResponse.json({ error: "Could not save trade." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, trade: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Backtest trade POST error:", error);
    return NextResponse.json({ error: "Could not save trade." }, { status: 500 });
  }
}
