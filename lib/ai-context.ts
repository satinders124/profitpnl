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
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

export async function buildTradingContext(uid: string, customClient?: any): Promise<TradingContext> {
  const [tradesRaw, journalsRaw, playbookRaw, accountsRaw, profile] = await Promise.all([
    getTrades(uid, customClient).catch(() => [] as Trade[]),
    getJournals(uid, customClient).catch(() => [] as JournalEntry[]),
    getPlaybook(uid, customClient).catch(() => [] as PlaybookSetup[]),
    getAccounts(uid, customClient).catch(() => [] as TradingAccount[]),
    getProfile(uid, customClient).catch(() => null),
  ]);

  const trades = tradesRaw.filter((t) => t.result !== "" && t.result !== null);
  const tradeCount = trades.length;

  if (tradeCount === 0) {
    const summary = `This trader has not logged any completed trades yet. They are a new user or exploring the system. Encourage them to log their first trade and define their playbook strategies. Base currency: ${profile?.currency || "USD"}.`;
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

  // Streak calculation
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

  // Setup performance breakdown
  const setupMap = new Map<string, { wins: number; losses: number; totalR: number; count: number }>();
  for (const t of trades) {
    const s = t.setup || "Unnamed Setup";
    const r = Number(t.result);
    if (!Number.isFinite(r)) continue;
    const ex = setupMap.get(s) || { wins: 0, losses: 0, totalR: 0, count: 0 };
    ex.count++;
    ex.totalR += r;
    if (r > 0) ex.wins++;
    else if (r < 0) ex.losses++;
    setupMap.set(s, ex);
  }
  const setupsByR = Array.from(setupMap.entries()).sort((a, b) => b[1].totalR - a[1].totalR);

  // Trading Session performance breakdown
  const sessionMap = new Map<string, { wins: number; losses: number; totalR: number; count: number }>();
  for (const t of trades) {
    const sess = t.session || "Unspecified Session";
    const r = Number(t.result);
    if (!Number.isFinite(r)) continue;
    const ex = sessionMap.get(sess) || { wins: 0, losses: 0, totalR: 0, count: 0 };
    ex.count++;
    ex.totalR += r;
    if (r > 0) ex.wins++;
    else if (r < 0) ex.losses++;
    sessionMap.set(sess, ex);
  }

  // Execution Rating & Discipline breakdown
  let ratedCount = 0;
  let highDisciplineR = 0;
  let highDisciplineCount = 0;
  let lowDisciplineR = 0;
  let lowDisciplineCount = 0;
  for (const t of trades) {
    const rating = Number(t.executionRating);
    const r = Number(t.result);
    if (Number.isFinite(rating) && Number.isFinite(r)) {
      ratedCount++;
      if (rating >= 4) {
        highDisciplineR += r;
        highDisciplineCount++;
      } else if (rating <= 2) {
        lowDisciplineR += r;
        lowDisciplineCount++;
      }
    }
  }

  // Mistake frequency
  const mistakeMap = new Map<string, number>();
  for (const t of trades) {
    if (t.mistake && t.mistake !== "None") {
      mistakeMap.set(t.mistake, (mistakeMap.get(t.mistake) || 0) + 1);
    }
  }
  const topMistakes = Array.from(mistakeMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Build Comprehensive Context Markdown
  const lines: string[] = [];
  lines.push(`## 📊 Overall Trader Performance Snapshot`);
  lines.push(`- Total reviewed trades: ${tradeCount}`);
  lines.push(`- Win rate: ${winRate.toFixed(1)}% (${wins.length} Wins / ${losses.length} Losses / ${breakeven.length} Breakeven)`);
  lines.push(`- Net P&L (R-Multiple): ${totalR > 0 ? "+" : ""}${totalR.toFixed(2)}R | Expected Value per trade: ${avgR > 0 ? "+" : ""}${avgR.toFixed(2)}R`);
  lines.push(`- Profit Factor: ${pf.toFixed(2)} | Average Win: +${avgWin.toFixed(2)}R | Average Loss: ${avgLoss.toFixed(2)}R`);
  lines.push(`- Current Streak: ${currentStreak} consecutive ${streakType === "W" ? "WINS 🔥" : streakType === "L" ? "LOSSES ⚠️" : "breakeven trades"}`);

  // Execution Discipline Analysis
  if (ratedCount > 0) {
    lines.push(`\n## 🧠 Execution Discipline & Plan Compliance Analysis`);
    lines.push(`- High Discipline Trades (Rating 4-5 out of 5): ${highDisciplineCount} trades generating ${highDisciplineR > 0 ? "+" : ""}${highDisciplineR.toFixed(2)}R`);
    lines.push(`- Low Discipline / Impulse Trades (Rating 1-2 out of 5): ${lowDisciplineCount} trades generating ${lowDisciplineR > 0 ? "+" : ""}${lowDisciplineR.toFixed(2)}R`);
    if (lowDisciplineR < 0 && highDisciplineR > 0) {
      lines.push(`- ⚠️ CRITICAL INSIGHT: Following the plan yields net profit (+${highDisciplineR.toFixed(1)}R), while breaking discipline accounts for ${lowDisciplineR.toFixed(1)}R of losses!`);
    }
  }

  // Session Breakdown
  if (sessionMap.size > 0) {
    lines.push(`\n## 🕒 Performance by Trading Session`);
    for (const [sess, stats] of sessionMap.entries()) {
      const wr = stats.count ? ((stats.wins / stats.count) * 100).toFixed(0) : "0";
      lines.push(`- ${sess}: ${stats.totalR > 0 ? "+" : ""}${stats.totalR.toFixed(2)}R over ${stats.count} trades (${wr}% WR)`);
    }
  }

  // Setup Performance
  if (setupsByR.length > 0) {
    lines.push(`\n## 🎯 Playbook Setup Breakdown (Sorted by Net R)`);
    for (const [name, stats] of setupsByR) {
      const wr = stats.count ? ((stats.wins / stats.count) * 100).toFixed(0) : "0";
      lines.push(`- ${name}: ${stats.totalR > 0 ? "+" : ""}${stats.totalR.toFixed(2)}R across ${stats.count} trades (${wr}% WR)`);
    }
  }

  // Mistakes
  if (topMistakes.length > 0) {
    lines.push(`\n## 🚨 Recurring Execution Leaks / Mistakes`);
    for (const [m, count] of topMistakes) {
      lines.push(`- ${m}: Logged ${count} time${count !== 1 ? "s" : ""}`);
    }
  }

  // Detailed Active Playbook Strategies
  const activePlaybooks = playbookRaw.filter((p) => p.status === "Active" || !p.status);
  if (activePlaybooks.length > 0) {
    lines.push(`\n## 📘 Active Playbook Strategies & Execution Rules`);
    for (const p of activePlaybooks.slice(0, 5)) {
      lines.push(`### Strategy: ${p.name} (${p.market || "Any Market"} | TF: ${p.timeframe || "Any"} | Bias: ${p.directionBias || "Neutral"})`);
      if (p.description) lines.push(`- Description: ${p.description}`);
      if (p.entryModel) lines.push(`- Entry Model & Trigger: ${p.entryModel}`);
      if (p.invalidation) lines.push(`- Stop Loss / Invalidation Level: ${p.invalidation}`);
      if (p.targetModel) lines.push(`- Target / Take Profit Rule: ${p.targetModel}`);
      if (p.riskRule) lines.push(`- Risk Management Rule: ${p.riskRule}`);
      if (p.rules && p.rules.length > 0) lines.push(`- Checklist Rules: ${p.rules.join("; ")}`);
      if (p.mistakesToAvoid && p.mistakesToAvoid.length > 0) lines.push(`- Mistakes to Avoid: ${p.mistakesToAvoid.join("; ")}`);
    }
  }

  // Active Trading Accounts & Drawdown Health
  const activeAccounts = accountsRaw.filter((a) => a.status === "Active" || !a.status);
  if (activeAccounts.length > 0) {
    lines.push(`\n## 💼 Active Trading Accounts & Prop Firm Drawdown Health`);
    for (const a of activeAccounts) {
      const balNum = Number(a.currentBalance);
      const startNum = Number(a.startingBalance || a.size);
      const balStr = Number.isFinite(balNum) ? `$${balNum.toLocaleString()}` : "N/A";
      const pnlDollars = Number.isFinite(balNum) && Number.isFinite(startNum) ? balNum - startNum : 0;
      const pnlPct = Number.isFinite(startNum) && startNum > 0 ? (pnlDollars / startNum) * 100 : 0;

      let ddInfo = "";
      if (a.maxDD && Number.isFinite(Number(a.maxDD)) && Number.isFinite(balNum)) {
        const ddCeiling = Number(a.maxDD);
        const cushion = balNum - ddCeiling;
        ddInfo = ` | Max DD Breach Level: $${ddCeiling.toLocaleString()} (Cushion Remaining: $${cushion.toLocaleString()})`;
      }

      lines.push(`- ${a.name} (${a.firm || "Personal"} | Type: ${a.type || "Funded"}): Current Balance ${balStr} (${pnlDollars >= 0 ? "+" : ""}$${pnlDollars.toLocaleString()} / ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%)${ddInfo}`);
    }
  }

  // Last 10 Trade Logs
  const recentTrades = trades.slice(0, 10);
  if (recentTrades.length > 0) {
    lines.push(`\n## 📜 Recent 10 Trade Logs (Most Recent First)`);
    for (const t of recentTrades) {
      const r = Number(t.result);
      const rStr = Number.isFinite(r) ? `${r > 0 ? "+" : ""}${r}R` : "Open";
      const pnlStr = t.pnl && Number.isFinite(Number(t.pnl)) ? ` ($${Number(t.pnl) > 0 ? "+" : ""}${t.pnl})` : "";
      const notesSnippet = t.notes ? ` | Notes: "${t.notes.slice(0, 90).replace(/\n/g, " ")}"` : "";
      lines.push(`- [${formatDate(t.date)}] ${t.instrument} ${t.direction} | Setup: ${t.setup || "None"} | Session: ${t.session || "N/A"} | Result: ${rStr}${pnlStr} | Rating: ${t.executionRating || "-"}/5${t.mistake && t.mistake !== "None" ? ` | Mistake: ${t.mistake}` : ""}${notesSnippet}`);
    }
  }

  // Last 5 Psychology Journals
  const recentJournals = journalsRaw.slice(0, 5);
  if (recentJournals.length > 0) {
    lines.push(`\n## 📓 Recent Psychology & Mindset Journal Entries`);
    for (const j of recentJournals) {
      const textSnippet = (j.notes || j.text || j.entry || "").slice(0, 120).replace(/\n/g, " ");
      lines.push(`- [${formatDate(j.date)}] Mood: ${j.mood || "Unspecified"}${j.tags && j.tags.length ? ` | Tags: [${j.tags.join(", ")}]` : ""}${textSnippet ? ` | Notes: "${textSnippet}..."` : ""}`);
    }
  }

  // Profile Risk Limits
  if (profile) {
    const dl = profile.daily_loss_limit;
    const md = profile.max_drawdown_limit;
    const pt = profile.daily_profit_target;
    if (dl || md || pt) {
      lines.push(`\n## 🛑 Trader's Hard Risk Limits`);
      if (dl) lines.push(`- Daily Loss Limit: $${Number(dl).toLocaleString()}`);
      if (md) lines.push(`- Max Drawdown Limit: $${Number(md).toLocaleString()}`);
      if (pt) lines.push(`- Daily Profit Target: $${Number(pt).toLocaleString()}`);
    }
  }

  lines.push(`\n## 🎯 Coaching Mandate & Behavioral Directives`);
  lines.push(`- You have COMPLETE visibility into this user's trading journal, playbook rules, accounts, and psychology above.`);
  lines.push(`- Always hold the trader accountable to their own written Playbook entry models and stop loss rules.`);
  lines.push(`- If they ask about an account or prop firm challenge, calculate their remaining drawdown cushion and advise on lot size / risk adjustment.`);
  lines.push(`- Be elite, direct, analytical, and highly personalized.`);

  return {
    summary: lines.join("\n"),
    tradeCount,
    winRate,
    totalR,
  };
}
