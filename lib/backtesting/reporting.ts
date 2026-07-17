import type { BacktestJournalTrade, BacktestModel, BacktestProfile } from "@/lib/backtesting/journal";

export type BacktestReportMetrics = {
  tradeCount: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  totalR: number;
  expectancy: number;
  profitFactor: number;
  maxDrawdownR: number;
  grossPnl: number;
  averageRuleAdherence: number;
  bestModel: string;
  weakestModel: string;
  periodStart: string | null;
  periodEnd: string | null;
  startingBalance: number;
  endingBalance: number;
};

export type BacktestReportTrade = {
  id: string;
  modelName: string;
  symbol: string;
  side: string;
  tradeDate: string;
  resultR: number;
  pnl: number;
  ruleAdherence: number | null;
  psychology: string;
  notes: string;
};

function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateOnly(value: string | null | undefined) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

export function backtestTradeR(trade: Pick<BacktestJournalTrade, "r_multiple" | "result" | "pnl">) {
  if (trade.r_multiple !== null && trade.r_multiple !== undefined && Number.isFinite(Number(trade.r_multiple))) {
    return Number(trade.r_multiple);
  }
  const result = String(trade.result || "").toLowerCase();
  if (result.includes("win")) return 1;
  if (result.includes("loss")) return -1;
  if (result === "be" || result.includes("break")) return 0;
  const pnl = n(trade.pnl);
  if (pnl > 0) return 1;
  if (pnl < 0) return -1;
  return 0;
}

export function backtestRuleAdherence(trade: Pick<BacktestJournalTrade, "rule_ticks">) {
  const ticks = Array.isArray(trade.rule_ticks) ? trade.rule_ticks : [];
  if (!ticks.length) return null;
  return ticks.filter(Boolean).length / ticks.length;
}

export function buildBacktestReport({
  models,
  trades,
  profile,
}: {
  models: BacktestModel[];
  trades: BacktestJournalTrade[];
  profile?: BacktestProfile | null;
}) {
  const modelMap = new Map(models.map((model) => [model.id, model]));
  const reportTrades: BacktestReportTrade[] = trades.map((trade) => {
    const model = modelMap.get(trade.session_id);
    return {
      id: trade.id,
      modelName: model?.name || "Unknown model",
      symbol: trade.symbol || model?.symbol || "Backtest",
      side: trade.side,
      tradeDate: dateOnly(trade.trade_date || trade.entry_time || trade.created_at),
      resultR: backtestTradeR(trade),
      pnl: n(trade.pnl),
      ruleAdherence: backtestRuleAdherence(trade),
      psychology: trade.psychology || "",
      notes: trade.notes || trade.deviations || "",
    };
  });

  const wins = reportTrades.filter((trade) => trade.resultR > 0);
  const losses = reportTrades.filter((trade) => trade.resultR < 0);
  const breakeven = reportTrades.filter((trade) => trade.resultR === 0);
  const totalR = reportTrades.reduce((sum, trade) => sum + trade.resultR, 0);
  const grossWin = wins.reduce((sum, trade) => sum + trade.resultR, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.resultR, 0));

  let peak = 0;
  let cumulative = 0;
  let maxDrawdownR = 0;
  for (const trade of reportTrades) {
    cumulative += trade.resultR;
    if (cumulative > peak) peak = cumulative;
    maxDrawdownR = Math.max(maxDrawdownR, peak - cumulative);
  }

  const byModel = new Map<string, number>();
  for (const trade of reportTrades) {
    byModel.set(trade.modelName, (byModel.get(trade.modelName) || 0) + trade.resultR);
  }
  const rankedModels = Array.from(byModel.entries()).sort((a, b) => b[1] - a[1]);

  const adherenceRows = reportTrades.filter((trade) => trade.ruleAdherence !== null);
  const periodDates = reportTrades.map((trade) => trade.tradeDate).filter(Boolean).sort();
  const startingBalance = profile?.account_size || models[0]?.starting_balance || 0;
  const grossPnl = reportTrades.reduce((sum, trade) => sum + trade.pnl, 0);

  const metrics: BacktestReportMetrics = {
    tradeCount: reportTrades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    winRate: reportTrades.length ? wins.length / reportTrades.length : 0,
    totalR,
    expectancy: reportTrades.length ? totalR / reportTrades.length : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0,
    maxDrawdownR,
    grossPnl,
    averageRuleAdherence: adherenceRows.length ? adherenceRows.reduce((sum, trade) => sum + (trade.ruleAdherence || 0), 0) / adherenceRows.length : 0,
    bestModel: rankedModels[0]?.[0] || "No model yet",
    weakestModel: rankedModels.slice().reverse()[0]?.[0] || "No model yet",
    periodStart: periodDates[0] || null,
    periodEnd: periodDates[periodDates.length - 1] || null,
    startingBalance,
    endingBalance: startingBalance + grossPnl,
  };

  return { metrics, trades: reportTrades };
}

export function backtestReportCsv(trades: BacktestReportTrade[]) {
  const headers = ["model", "date", "symbol", "side", "resultR", "pnl", "ruleAdherence", "psychology", "notes"];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [
    headers.join(","),
    ...trades.map((trade) => [
      trade.modelName,
      trade.tradeDate,
      trade.symbol,
      trade.side,
      trade.resultR,
      trade.pnl,
      trade.ruleAdherence === null ? "" : Math.round(trade.ruleAdherence * 100),
      trade.psychology,
      trade.notes,
    ].map(escape).join(",")),
  ].join("\n");
}
