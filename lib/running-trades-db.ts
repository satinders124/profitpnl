import { createClient } from "@/lib/supabase-client";

export interface RunningTrade {
  id: string;
  userId: string;
  shiftId: string;
  strategyId: string | null;
  strategyName: string;
  rulesFollowed: string[]; // checklist of strings
  entryPrice: number;
  slPrice: number;
  tpPrice: number;
  riskAmount: number;
  potentialProfit: number;
  lotSize: number;
  pipsTicks: number;
  isCaution: boolean;
  status: "running" | "closed";
  exitPrice: number | null;
  pnlRealized: number | null;
  createdAt: string;
}

export async function getRunningTradesForShift(shiftId: string): Promise<RunningTrade[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("running_trades")
    .select("*")
    .eq("shift_id", shiftId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRowToRunningTrade);
}

export async function addRunningTrade(uid: string, trade: Partial<RunningTrade>): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("running_trades")
    .insert({
      user_id: uid,
      shift_id: trade.shiftId,
      strategy_id: trade.strategyId,
      strategy_name: trade.strategyName,
      rules_followed: trade.rulesFollowed || [],
      entry_price: trade.entryPrice,
      sl_price: trade.slPrice,
      tp_price: trade.tpPrice,
      risk_amount: trade.riskAmount,
      potential_profit: trade.potentialProfit,
      lot_size: trade.lotSize,
      pips_ticks: trade.pipsTicks,
      is_caution: trade.isCaution || false,
      status: "running",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function closeRunningTrade(uid: string, tradeId: string, data: {
  exitPrice: number;
  pnlRealized: number;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("running_trades")
    .update({
      exit_price: data.exitPrice,
      pnl_realized: data.pnlRealized,
      status: "closed",
    })
    .eq("id", tradeId)
    .eq("user_id", uid);

  if (error) throw error;
}

function mapRowToRunningTrade(row: any): RunningTrade {
  return {
    id: row.id,
    userId: row.user_id,
    shiftId: row.shift_id,
    strategyId: row.strategy_id,
    strategyName: row.strategy_name,
    rulesFollowed: Array.isArray(row.rules_followed) ? row.rules_followed : [],
    entryPrice: Number(row.entry_price),
    slPrice: Number(row.sl_price),
    tpPrice: Number(row.tp_price),
    riskAmount: Number(row.risk_amount),
    potentialProfit: Number(row.potential_profit),
    lotSize: Number(row.lot_size),
    pipsTicks: Number(row.pips_ticks),
    isCaution: !!row.is_caution,
    status: row.status,
    exitPrice: row.exit_price ? Number(row.exit_price) : null,
    pnlRealized: row.pnl_realized !== null ? Number(row.pnl_realized) : null,
    createdAt: row.created_at,
  };
}
