import { Trade } from "@/types/trade";

function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function hasResult(trade: Trade) {
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
      breakeven: 0,
      winRate: 0,
      totalR: 0,
      expectancy: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      maxDD: 0,
      streak: 0,
      bestSetup: "—",
      biggestWin: 0,
      biggestLoss: 0,
    };
  }

  // Breakeven trades (exactly 0R) are neither a win nor a loss — matches
  // the Trade Log's own "Losses" filter (strictly < 0), the streak
  // calculation below (which also skips breakeven), and keeps Win Rate /
  // Avg Loss / Profit Factor from being diluted by trades that didn't
  // actually lose money.
  const wins = closed.filter((t) => n(t.result) > 0);
  const losses = closed.filter((t) => n(t.result) < 0);
  const breakeven = closed.filter((t) => n(t.result) === 0);

  const totalR = closed.reduce((sum, t) => sum + n(t.result), 0);
  const winRate = wins.length / closed.length;

  const avgWin = wins.length
    ? wins.reduce((sum, t) => sum + n(t.result), 0) / wins.length
    : 0;

  const avgLoss = losses.length
    ? Math.abs(losses.reduce((sum, t) => sum + n(t.result), 0) / losses.length)
    : 0;

  // Expectancy = average R per closed trade. Using totalR / closed.length
  // (rather than winRate*avgWin - lossRate*avgLoss) is the only version
  // that's correct once breakeven trades exist: winRate is defined as
  // wins / all closed trades (including breakevens), so "1 - winRate"
  // silently treated every breakeven as a loss in the old formula and
  // overweighted the loss side. totalR already nets everything correctly
  // (wins add, losses subtract, breakevens contribute 0), so dividing by
  // the same closed-trade count gives the true per-trade expectancy.
  const expectancy = closed.length ? totalR / closed.length : 0;

  const grossWin = wins.reduce((sum, t) => sum + n(t.result), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + n(t.result), 0));
  // No losses yet: an undefined/infinite ratio, not "grossWin" itself —
  // 99 is this app's established "effectively infinite" sentinel (see
  // Dashboard's `stats.profitFactor >= 99 ? "∞" : ...` display logic).
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;


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

  const biggestWin = closed.reduce((max, t) => Math.max(max, n(t.result)), 0);
  const biggestLoss = closed.reduce((min, t) => Math.min(min, n(t.result)), 0);

  return {
    count: closed.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    winRate,
    totalR,
    expectancy,
    avgWin,
    avgLoss,
    profitFactor,
    maxDD,
    streak: streak * (streakSign || 0),
    bestSetup,
    biggestWin,
    biggestLoss,
  };
}

export type BreakdownRow = {
  name: string;
  trades: number;
  wins: number;
  losses: number;
  totalR: number;
  winRate: number;
  expectancy: number;
  profitFactor: number;
};

/**
 * Groups CLOSED trades by an arbitrary key (e.g. setup, direction,
 * instrument) and runs the same calcStats() engine on each group, so any
 * breakdown table built on this always agrees with the top-line stats
 * shown elsewhere in the app for the exact same trades.
 */
export function breakdownBy(
  trades: Trade[],
  getKey: (trade: Trade) => string,
  fallback = "Unknown"
): BreakdownRow[] {
  const closed = closedTrades(trades);
  const groups = new Map<string, Trade[]>();

  for (const trade of closed) {
    const key = (getKey(trade) || "").trim() || fallback;
    const bucket = groups.get(key);
    if (bucket) bucket.push(trade);
    else groups.set(key, [trade]);
  }

  return Array.from(groups.entries())
    .map(([name, rows]) => {
      const stats = calcStats(rows);
      return {
        name,
        trades: stats.count,
        wins: stats.wins,
        losses: stats.losses,
        totalR: stats.totalR,
        winRate: stats.winRate * 100,
        expectancy: stats.expectancy,
        profitFactor: stats.profitFactor,
      };
    })
    .sort((a, b) => b.totalR - a.totalR);
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

export type EquityPoint = {
  name: string;
  trade: number;
  equity: number;
  r: number;
  instrument: string;
  strategy: string;
};

/**
 * Same chronological running-R approach as equityCurve(), but returns a
 * labeled point per trade (short date, sequence number, instrument,
 * strategy) for charts that need a tooltip — e.g. Dashboard's equity
 * chart and the Analytics equity chart both use this exact shape.
 */
export function buildEquityPoints(trades: Trade[]): EquityPoint[] {
  let runningR = 0;

  const closed = closedTrades(trades)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.date || "").getTime() - new Date(b.date || "").getTime()
    );

  return closed.map((trade, index) => {
    runningR += n(trade.result);
    const parsedDate = trade.date ? new Date(trade.date) : null;

    return {
      name:
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleDateString("en-AU", {
              day: "2-digit",
              month: "short",
            })
          : `#${index + 1}`,
      trade: index + 1,
      equity: Number(runningR.toFixed(2)),
      r: n(trade.result),
      instrument: trade.instrument || "—",
      strategy: trade.setup || "—",
    };
  });
}

/**
 * Trades with no logged result yet — same "open/pending" concept the
 * Trade Log's "Open" filter and Dashboard's Risk Desk already use.
 */
export function openTrades(trades: Trade[]) {
  return trades.filter((t) => !hasResult(t));
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

/**
 * Weekday label for a trade's date (e.g. "Monday"), for the Day-of-Week
 * breakdown. Returns "" for unparseable/missing dates so callers can fall
 * back to breakdownBy()'s own "Unknown" bucket.
 */
export function dayOfWeekLabel(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

const WEEKDAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * Sorts BreakdownRow[] into calendar weekday order (Mon -> Sun) instead of
 * breakdownBy()'s default best-to-worst totalR order — only meaningful for
 * the Day-of-Week breakdown specifically.
 */
export function sortByWeekday(rows: BreakdownRow[]): BreakdownRow[] {
  return rows.slice().sort((a, b) => {
    const ai = WEEKDAY_ORDER.indexOf(a.name);
    const bi = WEEKDAY_ORDER.indexOf(b.name);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
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
