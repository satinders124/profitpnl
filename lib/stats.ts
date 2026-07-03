import { Trade } from "@/types/trade";

function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasResult(trade: Trade) {
  return (
    trade.result !== "" &&
    trade.result !== null &&
    trade.result !== undefined &&
    Number.isFinite(Number(trade.result))
  );
}

export function closedTrades(trades: Trade[]) {
  return trades.filter(hasResult);
}

export function calcStats(trades: Trade[]) {
  const closed = closedTrades(trades);

  if (!closed.length) {
    return {
      count: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalR: 0,
      expectancy: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      maxDD: 0,
      streak: 0,
      bestSetup: "—",
    };
  }

  // Breakeven trades (exactly 0R) are neither a win nor a loss — matches
  // the Trade Log's own "Losses" filter (strictly < 0), the streak
  // calculation below (which also skips breakeven), and keeps Win Rate /
  // Avg Loss / Profit Factor from being diluted by trades that didn't
  // actually lose money.
  const wins = closed.filter((t) => n(t.result) > 0);
  const losses = closed.filter((t) => n(t.result) < 0);

  const totalR = closed.reduce((sum, t) => sum + n(t.result), 0);
  const winRate = wins.length / closed.length;

  const avgWin = wins.length
    ? wins.reduce((sum, t) => sum + n(t.result), 0) / wins.length
    : 0;

  const avgLoss = losses.length
    ? Math.abs(losses.reduce((sum, t) => sum + n(t.result), 0) / losses.length)
    : 0;

  const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;

  const grossWin = wins.reduce((sum, t) => sum + n(t.result), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + n(t.result), 0));
  const profitFactor = grossLoss ? grossWin / grossLoss : grossWin ? 99 : 0;

  const bySetup: Record<string, number> = {};
  for (const trade of closed) {
    if (!trade.setup) continue;
    bySetup[trade.setup] = (bySetup[trade.setup] || 0) + n(trade.result);
  }

  const bestSetup =
    Object.entries(bySetup).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const chronological = closed.slice().sort((a, b) =>
  new Date(a.date || "").getTime() - new Date(b.date || "").getTime()
);

let streak = 0;
let streakSign: 1 | -1 | null = null;

for (let i = chronological.length - 1; i >= 0; i--) {
  const result = n(chronological[i].result);
  if (result === 0) continue; // breakeven — skip, doesn't affect streak

  const sign = result > 0 ? 1 : -1;

    if (streakSign === null) {
      streakSign = sign;
      streak = 1;
    } else if (sign === streakSign) {
      streak += 1;
    } else {
      break;
    }
  }

  let peak = 0;
  let cumulative = 0;
  let maxDD = 0;

  closed
    .slice()
    .sort(
      (a, b) =>
        new Date(a.date || "").getTime() - new Date(b.date || "").getTime()
    )
    .forEach((trade) => {
      cumulative += n(trade.result);

      if (cumulative > peak) peak = cumulative;

      const dd = peak - cumulative;
      if (dd > maxDD) maxDD = dd;
    });

  return {
    count: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    totalR,
    expectancy,
    avgWin,
    avgLoss,
    profitFactor,
    maxDD,
    streak: streak * (streakSign || 0),
    bestSetup,
  };
}

export function equityCurve(trades: Trade[]) {
  let cumulative = 0;

  return closedTrades(trades)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.date || "").getTime() - new Date(b.date || "").getTime()
    )
    .map((trade) => {
      cumulative += n(trade.result);
      return Number(cumulative.toFixed(2));
    });
}

export function directionStats(trades: Trade[]) {
  const longs = closedTrades(trades).filter((t) => t.direction === "LONG");
  const shorts = closedTrades(trades).filter((t) => t.direction === "SHORT");

  function calc(arr: Trade[]) {
    const totalR = arr.reduce((sum, t) => sum + n(t.result), 0);
    const wins = arr.filter((t) => n(t.result) > 0).length;

    return {
      count: arr.length,
      totalR,
      wins,
      winRate: arr.length ? wins / arr.length : 0,
    };
  }

  return {
    long: calc(longs),
    short: calc(shorts),
  };
}

export function formatR(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
}

export function formatPct(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function uniqueClean(values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const clean = String(value || "").trim();
    if (!clean) continue;

    const key = clean.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(clean);
  }

  return out.sort((a, b) => a.localeCompare(b));
}
