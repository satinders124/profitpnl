import {
  calculateBacktestStats,
  closeTrade,
  maybeAutoCloseTrade,
} from "./engine";
import {
  type BacktestStats,
  type BacktestTrade,
  type Candle,
  type OpenBacktestTrade,
  type StrategyConfig,
  type StrategyResult,
} from "./types";
import { ema, sma } from "./indicators";

/**
 * Rule-based automated backtester (a lightweight "Strategy Tester").
 * It reuses the same trade engine as the manual replay terminal, so results
 * are directly comparable: same P&L / R-multiple / stats math.
 *
 * Currently supports a moving-average crossover:
 *   - long  when the fast MA crosses above the slow MA
 *   - short when the fast MA crosses below the slow MA
 *   - exit on the opposite cross, or on SL/TP (percent based)
 */
export function runStrategy(candles: Candle[], config: StrategyConfig): StrategyResult {
  const closes = candles.map((c) => c.close);
  const useEma = config.type === "mean_reversion";
  const fastRaw = useEma ? ema(closes, config.fastPeriod) : sma(closes, config.fastPeriod);
  const slowRaw = sma(closes, config.slowPeriod);

  const trades: BacktestTrade[] = [];
  let balance = config.initialCapital;
  let open: OpenBacktestTrade | null = null;
  let pendingSignal: "long" | "short" | null = null;

  for (let i = 0; i < candles.length; i++) {
    const f = fastRaw[i];
    const s = slowRaw[i];

    // Detect crossover using the previous bar's MA values.
    if (f != null && s != null && i > 0) {
      const pf = fastRaw[i - 1];
      const ps = slowRaw[i - 1];
      if (pf != null && ps != null) {
        if (pf <= ps && f > s) pendingSignal = "long";
        else if (pf >= ps && f < s) pendingSignal = "short";
      }
    }

    // Try to close an open trade on this bar (SL/TP can be hit intrabar).
    if (open) {
      const closed = maybeAutoCloseTrade(open, candles[i], balance);
      if (closed) {
        trades.push(closed);
        balance = closed.balanceAfter;
        open = null;
      }
    }

    // Open a new trade on the next bar after a signal.
    if (!open && pendingSignal && f != null && s != null) {
      const side = pendingSignal;
      const entry = candles[i].close;
      const sl =
        side === "long"
          ? entry * (1 - config.stopLossPercent / 100)
          : entry * (1 + config.stopLossPercent / 100);
      const tp =
        config.takeProfitPercent > 0
          ? side === "long"
            ? entry * (1 + config.takeProfitPercent / 100)
            : entry * (1 - config.takeProfitPercent / 100)
          : null;

      open = {
        id: crypto.randomUUID(),
        side,
        symbol: config.symbol,
        entryTime: candles[i].time,
        entryPrice: entry,
        stopLoss: sl,
        takeProfit: tp,
        quantity: 1,
        riskAmount: Math.abs(entry - sl),
        setup: `${config.type} ${config.fastPeriod}/${config.slowPeriod}`,
        notes: "",
      };
      pendingSignal = null;
    }
  }

  // Close any position still open at the last candle.
  if (open) {
    const last = candles[candles.length - 1];
    const closed = closeTrade(open, last.time, last.close, balance, "manual");
    trades.push(closed);
    balance = closed.balanceAfter;
  }

  const stats: BacktestStats = calculateBacktestStats(trades, config.initialCapital);
  return { trades, stats };
}
