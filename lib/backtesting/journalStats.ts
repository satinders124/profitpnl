import type { BacktestJournalTrade } from "@/lib/backtesting/journal";

export type JournalStats = {
  total: number;
  wins: number;
  losses: number;
  be: number;
  winRate: number;
  expectancyR: number;
};

export function outcomeOf(
  t: BacktestJournalTrade
): "win" | "loss" | "be" | "unknown" {
  const r = (t.result || "").trim().toLowerCase();
  if (r === "win" || r.includes("win")) return "win";
  if (r === "loss" || r.includes("loss")) return "loss";
  if (
    r === "be" ||
    r.includes("breakeven") ||
    r.includes("break even")
  )
    return "be";
  return "unknown";
}

export function computeJournalStats(
  trades: BacktestJournalTrade[]
): JournalStats {
  let wins = 0;
  let losses = 0;
  let be = 0;
  for (const t of trades) {
    const o = outcomeOf(t);
    if (o === "win") wins++;
    else if (o === "loss") losses++;
    else if (o === "be") be++;
  }
  const total = trades.length;
  const decided = wins + losses + be;
  const totalR = wins * 1 + losses * -1;
  return {
    total,
    wins,
    losses,
    be,
    winRate: decided ? (wins / decided) * 100 : 0,
    expectancyR: total ? totalR / total : 0,
  };
}
