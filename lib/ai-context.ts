import { getTrades, getJournals, getPlaybook, getAccounts, getProfile } from "@/lib/db";
import { Trade } from "@/types/trade";
import { JournalEntry } from "@/types/journal";
import { PlaybookSetup } from "@/types/playbook";
import { TradingAccount } from "@/types/account";

export type TradingContext = {
  summary: string;
  tradeCount: number;
  winRate: number;
  totalR: number;
};

function formatDate(d: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function avg(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}

function profitFactor(wins: number[], losses: number[]) {
  const grossProfit = sum(wins);
  const grossLoss = Math.abs(sum(losses));
  if (!grossLoss) return grossProfit > 0 ? 999 : 0;
  return grossProfit / grossLoss;
}

export async function buildTradingContext(uid: string): Promise<TradingContext> {
  const [tradesRaw, journalsRaw, playbookRaw, accountsRaw, profile] = await Promise.all([
    getTrades(uid).catch(() => [] as Trade[]),
    getJournals(uid).catch(() => [] as JournalEntry[]),
    getPlaybook(uid).catch(() => [] as PlaybookSetup[]),
    getAccounts(uid).catch(() => [] as TradingAccount[]),
    getProfile(uid).catch(() => null),
  ]);

  const trades = tradesRaw.filter((t) => t.result !== "" && t.result !== null);
  const tradeCount = trades.length;

  if (tradeCount === 0) {
    const summary = `This trader has not logged any trades yet. They are a new user. Encourage them to log their first trade and build a playbook. Their base currency is ${profile?.currency || "USD"}.`;
    return { summary, tradeCount: 0, winRate: 0, totalR: 0 };
  }

  const results = trades.map((t) => Number(t.result)).filter((n) => Number.isFinite(n));
  const wins = results.filter((r) => r > 0);
  const losses = results.filter((r) => r < 0);
  const breakeven = results.filter((r) => r === 0);

  const winRate = results.length ? (wins.length / results.length) * 100 : 0;
  const totalR = sum(results);
  const avgR = avg(results);
  const avgWin = avg(wins);
  const avgLoss = avg(losses);
  const pf = profitFactor(wins, losses);

  // Streak
  let currentStreak = 0;
  let streakType: "W" | "L" | "B" = "B";
  for (let i = trades.length - 1; i >= 0; i--) {
    const r = Number(trades[i].result);
    if (!Number.isFinite(r)) continue;
    if (r > 0) {
      if (streakType === "B" || streakType === "W") {
        streakType = "W";
        currentStreak++;
      } else break;
    } else if (r < 0) {
      if (streakType === "B" || streakType === "L") {
        streakType = "L";
        currentStreak++;
      } else break;
    } else {
      if (streakType === "B") currentStreak++;
      else break;
    }
  }

  // Setup performance
  const setupMap = new Map<string, { wins: number; losses: number; totalR: number; count: number }>();
  for (const t of trades) {
    const s = t.setup || "Unnamed";
    const r = Number(t.result);
    if (!Number.isFinite(r)) continue;
    const ex = setupMap.get(s) || { wins: 0, losses: 0, totalR: 0, count: 0 };
    ex.count++;
    ex.totalR += r;
    if (r > 0) ex.wins++;
    else if (r < 0) ex.losses++;
    setupMap.set(s, ex);
  }
  const setupsByR = Array.from(setupMap.entries())
    .sort((a, b) => b[1].totalR - a[1].totalR)
    .slice(0, 4);

  // Mistake frequency
  const mistakeMap = new Map<string, number>();
  for (const t of trades) {
    if (t.mistake && t.mistake !== "None") {
      mistakeMap.set(t.mistake, (mistakeMap.get(t.mistake) || 0) + 1);
    }
  }
  const topMistakes = Array.from(mistakeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Recent trades (last 5)
  const recent = trades.slice(0, 5);

  // Recent journals (last 3)
  const recentJournals = journalsRaw.slice(0, 3);

  // Active playbook
  const activePlaybook = playbookRaw.filter((p) => p.status === "Active").slice(0, 4);

  // Accounts
  const activeAccounts = accountsRaw.filter((a) => a.status === "Active");

  // Build concise context block
  const lines: string[] = [];
  lines.push(`## Trader Performance Snapshot`);
  lines.push(`- Total reviewed trades: ${tradeCount}`);
  lines.push(`- Win rate: ${winRate.toFixed(1)}% (${wins.length}W / ${losses.length}L / ${breakeven.length}BE)`);
  lines.push(`- Total R: ${totalR > 0 ? "+" : ""}${totalR.toFixed(2)} | Avg R per trade: ${avgR > 0 ? "+" : ""}${avgR.toFixed(2)}`);
  lines.push(`- Profit factor: ${pf.toFixed(2)} | Avg win: ${avgWin.toFixed(2)}R | Avg loss: ${avgLoss.toFixed(2)}R`);
  lines.push(`- Current streak: ${currentStreak}${streakType === "W" ? " wins" : streakType === "L" ? " losses" : " breakeven"}`);

  if (setupsByR.length) {
    lines.push(`\n## Setup Performance (top by total R)`);
    for (const [name, stats] of setupsByR) {
      const wr = stats.count ? ((stats.wins / stats.count) * 100).toFixed(0) : "0";
      lines.push(`- ${name}: ${stats.totalR > 0 ? "+" : ""}${stats.totalR.toFixed(1)}R over ${stats.count} trades (${wr}% WR)`);
    }
  }

  if (topMistakes.length) {
    lines.push(`\n## Recurring Mistakes`);
    for (const [m, count] of topMistakes) {
      lines.push(`- ${m}: ${count} times`);
    }
  }

  if (recent.length) {
    lines.push(`\n## Recent Trades (last ${recent.length})`);
    for (const t of recent) {
      const r = Number(t.result);
      const rStr = Number.isFinite(r) ? `${r > 0 ? "+" : ""}${r}R` : "open";
      lines.push(`- ${formatDate(t.date)} ${t.instrument} ${t.direction} | ${t.setup || "no setup"} | ${rStr} | ${t.emotion || "no emotion"}${t.mistake && t.mistake !== "None" ? ` | mistake: ${t.mistake}` : ""}`);
    }
  }

  if (recentJournals.length) {
    lines.push(`\n## Recent Journal Entries`);
    for (const j of recentJournals) {
      const snippet = (j.notes || j.text || j.entry || "").slice(0, 80).replace(/\n/g, " ");
      lines.push(`- ${formatDate(j.date)} Mood: ${j.mood || "N/A"}${snippet ? ` | "${snippet}${snippet.length >= 80 ? "..." : ""}"` : ""}`);
    }
  }

  if (activePlaybook.length) {
    lines.push(`\n## Active Playbook Strategies`);
    for (const p of activePlaybook) {
      lines.push(`- ${p.name} (${p.market || "any market"}, ${p.timeframe || "any TF"}) — ${p.directionBias || "no bias"}`);
    }
  }

  if (activeAccounts.length) {
    lines.push(`\n## Active Accounts`);
    for (const a of activeAccounts) {
      const bal = a.currentBalance !== "" && a.currentBalance != null ? `$${Number(a.currentBalance).toLocaleString()}` : "balance N/A";
      lines.push(`- ${a.name} (${a.firm || "personal"}) — ${bal}${a.maxDD ? ` | max DD: $${Number(a.maxDD).toLocaleString()}` : ""}`);
    }
  }

  // Risk settings from profile
  const dailyLoss = profile?.daily_loss_limit;
  const maxDD = profile?.max_drawdown_limit;
  const profitTarget = profile?.daily_profit_target;
  if (dailyLoss || maxDD || profitTarget) {
    lines.push(`\n## Risk Rules`);
    if (dailyLoss) lines.push(`- Daily loss limit: $${Number(dailyLoss).toLocaleString()}`);
    if (maxDD) lines.push(`- Max drawdown ceiling: $${Number(maxDD).toLocaleString()}`);
    if (profitTarget) lines.push(`- Daily profit target: $${Number(profitTarget).toLocaleString()}`);
    lines.push(`- Max consecutive losses before lockout: ${profile?.max_consecutive_losses || 3}`);
  }

  lines.push(`\n## Coaching Rules`);
  lines.push(`- Base all advice on this trader's actual data above.`);
  lines.push(`- If they broke rules recently, call it out directly.`);
  lines.push(`- Reference specific setups and mistakes by name.`);
  lines.push(`- Keep responses under 200 words unless they ask for deep analysis.`);
  lines.push(`- Never give buy/sell signals. Only review process, psychology, and risk.`);

  return {
    summary: lines.join("\n"),
    tradeCount,
    winRate,
    totalR,
  };
}
