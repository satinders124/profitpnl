import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";
import type { BacktestTrade } from "@/lib/backtesting/types";

export const runtime = "nodejs";

type SaveBody = {
  name?: string;
  symbol?: string;
  market?: string;
  timeframe?: string;
  startDate?: string;
  endDate?: string;
  startingBalance?: number;
  currentBalance?: number;
  commissionPerTrade?: number;
  slippageTicks?: number;
  notes?: string;
  rules?: string[];
  kind?: "lab" | "journal";
  trades?: BacktestTrade[];
};

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const supabase = createServerClient();
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind");

    let query = supabase
      .from("backtest_sessions")
      .select("*, backtest_trades(count)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (kind) query = query.eq("kind", kind);

    const { data, error } = await query;

    if (error) {
      console.error("Backtest sessions list error:", error);
      return NextResponse.json(
        { error: "Could not load backtest sessions." },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Backtest sessions GET error:", error);
    return NextResponse.json(
      { error: "Could not load backtest sessions." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = (await req.json().catch(() => ({}))) as SaveBody;

    const kind = body.kind === "journal" ? "journal" : "lab";
    const name = (body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const supabase = createServerClient();

    const insertRow: Record<string, unknown> = {
      user_id: user.id,
      name: name.slice(0, 120),
      kind,
      market: body.market || null,
      notes: body.notes || null,
      status: "active",
      rules: Array.isArray(body.rules) ? body.rules : [],
      starting_balance: Number(body.startingBalance || 0),
    };

    if (kind === "lab") {
      insertRow.symbol = (body.symbol || "BTCUSDT").trim().toUpperCase();
      insertRow.timeframe = (body.timeframe || "5m").trim();
      insertRow.current_balance = Number(
        body.currentBalance || body.startingBalance || 0
      );
      insertRow.commission_per_trade = Number(body.commissionPerTrade || 0);
      insertRow.slippage_ticks = Number(body.slippageTicks || 0);
    } else {
      insertRow.symbol = body.symbol ? body.symbol.trim().toUpperCase() : null;
      insertRow.timeframe = body.timeframe ? body.timeframe.trim() : null;
      insertRow.current_balance = null;
    }

    const { data: session, error: sessionError } = await supabase
      .from("backtest_sessions")
      .insert(insertRow)
      .select("id")
      .single();

    if (sessionError || !session?.id) {
      console.error("Backtest session create error:", sessionError);
      return NextResponse.json(
        { error: "Could not save backtest. Run the backtesting migration first." },
        { status: 500 }
      );
    }

    const trades = body.trades || [];
    if (kind === "lab" && trades.length) {
      const { error: tradeError } = await supabase.from("backtest_trades").insert(
        trades.map((trade) => ({
          session_id: session.id,
          user_id: user.id,
          symbol: insertRow.symbol as string,
          side: trade.side,
          entry_time: new Date(trade.entryTime * 1000).toISOString(),
          exit_time: new Date(trade.exitTime * 1000).toISOString(),
          entry_price: trade.entryPrice,
          exit_price: trade.exitPrice,
          stop_loss: trade.stopLoss,
          take_profit: trade.takeProfit ?? null,
          quantity: trade.quantity,
          risk_amount: trade.riskAmount,
          pnl: trade.pnl,
          r_multiple: trade.rMultiple,
          balance_after: trade.balanceAfter,
          exit_reason: trade.exitReason,
          setup: trade.setup || null,
          notes: trade.notes || null,
        }))
      );

      if (tradeError) {
        console.error("Backtest trades insert error:", tradeError);
      }
    }

    return NextResponse.json({ ok: true, sessionId: session.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Backtest sessions POST error:", error);
    return NextResponse.json({ error: "Could not save backtest." }, { status: 500 });
  }
}
