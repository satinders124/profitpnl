import type { BacktestSide, BacktestStats, BacktestTrade, Candle, OpenBacktestTrade } from "./types";

export function parseCandlesCsv(input: string): Candle[] {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());

  return lines.slice(1).flatMap((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => { row[header] = values[index] || ""; });

    const timeRaw = getText(row, ["time", "date", "datetime", "timestamp"]);
    const time = parseTime(timeRaw);
    const open = getNumber(row, ["open", "o"]);
    const high = getNumber(row, ["high", "h"]);
    const low = getNumber(row, ["low", "l"]);
    const close = getNumber(row, ["close", "c"]);
    const volume = getNumber(row, ["volume", "vol", "v"]);

    if (!time || open === null || high === null || low === null || close === null) return [];
    return [{ time, open, high, low, close, volume: volume ?? undefined }];
  }).sort((a, b) => a.time - b.time);
}

function splitCsvLine(line: string) {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && next === '"') { current += '"'; i++; }
    else if (char === '"') inQuotes = !inQuotes;
    else if (char === "," && !inQuotes) { out.push(current.trim()); current = ""; }
    else current += char;
  }
  out.push(current.trim());
  return out;
}

function getText(row: Record<string, string>, keys: string[]) {
  for (const key of keys) if (row[key]) return row[key];
  return "";
}

function getNumber(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (!value) continue;
    const parsed = Number(value.replace(/[$,%]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseTime(value: string) {
  if (!value) return null;
  const n = Number(value);
  if (Number.isFinite(n)) return n > 1_000_000_000_000 ? Math.floor(n / 1000) : Math.floor(n);
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
}

export function calculateQuantity({
  balance,
  riskPercent,
  entryPrice,
  stopLoss,
}: {
  balance: number;
  riskPercent: number;
  entryPrice: number;
  stopLoss: number;
}) {
  const riskAmount = balance * (riskPercent / 100);
  const stopDistance = Math.abs(entryPrice - stopLoss);
  const quantity = stopDistance > 0 ? riskAmount / stopDistance : 0;
  return { riskAmount, quantity };
}

export function calculatePnl(side: BacktestSide, entryPrice: number, exitPrice: number, quantity: number) {
  return side === "long"
    ? (exitPrice - entryPrice) * quantity
    : (entryPrice - exitPrice) * quantity;
}

export function maybeAutoCloseTrade(openTrade: OpenBacktestTrade, candle: Candle, balanceBefore: number): BacktestTrade | null {
  if (openTrade.side === "long") {
    // Conservative when SL and TP are both touched in same candle: stop first.
    if (candle.low <= openTrade.stopLoss) return closeTrade(openTrade, candle.time, openTrade.stopLoss, balanceBefore, "stop_loss");
    if (openTrade.takeProfit && candle.high >= openTrade.takeProfit) return closeTrade(openTrade, candle.time, openTrade.takeProfit, balanceBefore, "take_profit");
  } else {
    if (candle.high >= openTrade.stopLoss) return closeTrade(openTrade, candle.time, openTrade.stopLoss, balanceBefore, "stop_loss");
    if (openTrade.takeProfit && candle.low <= openTrade.takeProfit) return closeTrade(openTrade, candle.time, openTrade.takeProfit, balanceBefore, "take_profit");
  }
  return null;
}

export function closeTrade(
  openTrade: OpenBacktestTrade,
  exitTime: number,
  exitPrice: number,
  balanceBefore: number,
  exitReason: BacktestTrade["exitReason"]
): BacktestTrade {
  const pnl = calculatePnl(openTrade.side, openTrade.entryPrice, exitPrice, openTrade.quantity);
  const rMultiple = openTrade.riskAmount > 0 ? pnl / openTrade.riskAmount : 0;
  return {
    ...openTrade,
    exitTime,
    exitPrice,
    pnl,
    rMultiple,
    balanceAfter: balanceBefore + pnl,
    exitReason,
  };
}

export function calculateBacktestStats(trades: BacktestTrade[], startingBalance: number): BacktestStats {
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const netPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const grossWin = wins.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
  const totalR = trades.reduce((sum, t) => sum + t.rMultiple, 0);

  let peak = startingBalance;
  let maxDrawdown = 0;
  for (const trade of trades) {
    peak = Math.max(peak, trade.balanceAfter);
    maxDrawdown = Math.max(maxDrawdown, peak - trade.balanceAfter);
  }

  return {
    trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: trades.length ? wins.length / trades.length : 0,
    netPnl,
    returnPercent: startingBalance > 0 ? netPnl / startingBalance : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0,
    expectancyR: trades.length ? totalR / trades.length : 0,
    maxDrawdown,
    bestTradeR: trades.reduce((max, t) => Math.max(max, t.rMultiple), 0),
    worstTradeR: trades.reduce((min, t) => Math.min(min, t.rMultiple), 0),
  };
}

export function equityCurveFromTrades(trades: BacktestTrade[], startingBalance: number) {
  let equity = startingBalance;
  return [{ trade: 0, equity }, ...trades.map((trade, index) => {
    equity += trade.pnl;
    return { trade: index + 1, equity: Number(equity.toFixed(2)) };
  })];
}
