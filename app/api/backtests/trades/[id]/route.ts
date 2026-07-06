import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const patch: Record<string, unknown> = {};
    if (body.symbol !== undefined)
      patch.symbol = body.symbol ? String(body.symbol) : null;
    if (body.side === "long" || body.side === "short") patch.side = body.side;
    if (body.entryPrice !== undefined) patch.entry_price = num(body.entryPrice);
    if (body.exitPrice !== undefined) patch.exit_price = num(body.exitPrice);
    if (body.stopLoss !== undefined) patch.stop_loss = num(body.stopLoss);
    if (body.takeProfit !== undefined) patch.take_profit = num(body.takeProfit);
    if (body.quantity !== undefined) patch.quantity = num(body.quantity);
    if (body.riskAmount !== undefined) patch.risk_amount = num(body.riskAmount);
    if (body.pnl !== undefined) patch.pnl = num(body.pnl);
    if (body.rMultiple !== undefined) patch.r_multiple = num(body.rMultiple);
    if (body.balanceAfter !== undefined) patch.balance_after = num(body.balanceAfter);
    if (
      typeof body.exitReason === "string" &&
      ["manual", "stop_loss", "take_profit"].includes(body.exitReason)
    )
      patch.exit_reason = body.exitReason;
    if (body.setup !== undefined)
      patch.setup = body.setup ? String(body.setup) : null;
    if (body.notes !== undefined)
      patch.notes = body.notes ? String(body.notes) : null;
    if (Array.isArray(body.ruleTicks)) patch.rule_ticks = body.ruleTicks;
    if (body.be !== undefined) patch.be = num(body.be);
    if (body.deviations !== undefined)
      patch.deviations = body.deviations ? String(body.deviations) : null;
    if (body.psychology !== undefined)
      patch.psychology = body.psychology ? String(body.psychology) : null;
    if (body.result !== undefined)
      patch.result = body.result ? String(body.result) : null;
    if (body.risk !== undefined) patch.risk = num(body.risk);
    if (body.riskUnit === "percent" || body.riskUnit === "currency")
      patch.risk_unit = body.riskUnit;
    if (body.tradeDate !== undefined)
      patch.trade_date = body.tradeDate ? String(body.tradeDate) : null;
    if (body.entryTime !== undefined)
      patch.entry_time = body.entryTime
        ? new Date(String(body.entryTime)).toISOString()
        : null;
    if (body.exitTime !== undefined)
      patch.exit_time = body.exitTime
        ? new Date(String(body.exitTime)).toISOString()
        : null;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("backtest_trades")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      console.error("Backtest trade PATCH error:", error);
      return NextResponse.json({ error: "Could not update trade." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, trade: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Backtest trade PATCH error:", error);
    return NextResponse.json({ error: "Could not update trade." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getAuthenticatedUser(_req);
    const { id } = await params;
    const supabase = createServerClient();

    const { error } = await supabase
      .from("backtest_trades")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Backtest trade DELETE error:", error);
      return NextResponse.json({ error: "Could not delete trade." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Backtest trade DELETE error:", error);
    return NextResponse.json({ error: "Could not delete trade." }, { status: 500 });
  }
}
