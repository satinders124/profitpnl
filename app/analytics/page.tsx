"use client";

import { useEffect, useMemo, useState, ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/providers/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card } from "@/components/ui/Card";
import { getAccounts, getPlaybook, getTrades } from "@/lib/firestore";
import { TradingAccount } from "@/types/account";
import { PlaybookSetup } from "@/types/playbook";
import { Trade } from "@/types/trade";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Filter,
  Gauge,
  Layers3,
  LineChart as LineChartIcon,
  Search,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TradeOutcome = "win" | "loss" | "breakeven" | "unknown";

type AnalyticsTrade = Trade & {
  _r: number;
  _pnl: number;
  _outcome: TradeOutcome;
  _date: Date | null;
  _strategy: string;
  _account: string;
  _instrument: string;
  _direction: string;
};

type BreakdownRow = {
  name: string;
  trades: number;
  wins: number;
  losses: number;
  totalR: number;
  winRate: number;
  expectancy: number;
  profitFactor: number;
};

function num(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/\$/g, "")
    .replace(/%/g, "")
    .replace(/r/gi, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function clean(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function pretty(value: unknown, fallback = "Unknown") {
  const text = String(value || "").trim();
  return text || fallback;
}

function getFirstNumber(t: any, fields: string[]) {
  for (const field of fields) {
    const value = t[field];

    if (value !== undefined && value !== "") {
      const n = num(value);
      if (Number.isFinite(n) && n !== 0) return n;
    }
  }

  return 0;
}

function getFieldValue(t: any, fields: string[]) {
  for (const field of fields) {
    const value = t[field];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

function getTradePnl(trade: Trade) {
  const t = trade as any;

  const pnl = getFirstNumber(t, [
    "pnl",
    "pnlAmount",
    "pnlValue",
    "profitLoss",
    "profit_loss",
    "netPnl",
    "netPNL",
    "netProfit",
    "realizedPnl",
    "realisedPnl",
    "realizedProfit",
    "realisedProfit",
    "resultAmount",
    "amount",
    "pl",
    "p_l",
  ]);

  if (pnl !== 0) return pnl;

  const profit = getFirstNumber(t, ["profit", "profitAmount", "gain"]);
  if (profit !== 0) return Math.abs(profit);

  const loss = getFirstNumber(t, ["loss", "lossAmount"]);
  if (loss !== 0) return -Math.abs(loss);

  return 0;
}

function getActualR(trade: Trade) {
  const t = trade as any;

  // Important: your Trade Log saves actual R in "result".
  return getFirstNumber(t, [
    "result",
    "rMultiple",
    "r_multiple",
    "resultR",
    "netR",
    "realizedR",
    "realisedR",
    "actualR",
    "tradeR",
    "outcomeR",
  ]);
}

function getPlannedRR(trade: Trade) {
  const t = trade as any;

  return getFirstNumber(t, [
    "rr",
    "riskReward",
    "riskRewardRatio",
    "plannedR",
    "plannedRR",
    "rewardRisk",
  ]);
}

function getDirection(trade: Trade) {
  const t = trade as any;

  return pretty(
    getFieldValue(t, ["direction", "side", "type", "position", "tradeType", "bias"]),
    "Unknown"
  );
}

function getEntryPrice(trade: Trade) {
  const t = trade as any;

  return getFirstNumber(t, [
    "entry",
    "entryPrice",
    "entry_price",
    "openPrice",
    "avgEntry",
    "averageEntry",
    "entryLevel",
  ]);
}

function getExitPrice(trade: Trade) {
  const t = trade as any;

  return getFirstNumber(t, [
    "exit",
    "exitPrice",
    "exit_price",
    "closePrice",
    "avgExit",
    "averageExit",
    "exitLevel",
  ]);
}

function getPriceMoveResult(trade: Trade) {
  const direction = clean(getDirection(trade));
  const entry = getEntryPrice(trade);
  const exit = getExitPrice(trade);

  if (!entry || !exit || !direction) return 0;

  const isLong =
    direction.includes("long") ||
    direction.includes("buy") ||
    direction.includes("bull");

  const isShort =
    direction.includes("short") ||
    direction.includes("sell") ||
    direction.includes("bear");

  if (isLong) return exit - entry;
  if (isShort) return entry - exit;

  return 0;
}

function getResultText(trade: Trade) {
  const t = trade as any;

  const directValues = [
    t.outcome,
    t.tradeResult,
    t.closeResult,
    t.reviewResult,
    t.pnlResult,
    t.winLoss,
    t.resultType,
  ];

  const scannedValues = Object.entries(t)
    .filter(([key]) => {
      const k = clean(key);
      return (
        k.includes("outcome") ||
        k.includes("winloss") ||
        k === "win" ||
        k === "loss" ||
        k === "winner" ||
        k === "loser"
      );
    })
    .map(([, value]) => value);

  const statusText = clean(t.status);

  const values = [...directValues, ...scannedValues]
    .map(clean)
    .filter(Boolean);

  if (
    statusText.includes("win") ||
    statusText.includes("loss") ||
    statusText.includes("tp") ||
    statusText.includes("sl") ||
    statusText.includes("profit") ||
    statusText.includes("red") ||
    statusText.includes("green")
  ) {
    values.push(statusText);
  }

  return values.join(" ");
}

function getTradeOutcome(trade: Trade): TradeOutcome {
  const actualR = getActualR(trade);

  if (actualR > 0) return "win";
  if (actualR < 0) return "loss";

  const resultText = getResultText(trade);

  if (
    resultText.includes("win") ||
    resultText.includes("won") ||
    resultText.includes("winner") ||
    resultText.includes("tp") ||
    resultText.includes("target hit") ||
    resultText.includes("take profit") ||
    resultText.includes("profit") ||
    resultText.includes("green")
  ) {
    return "win";
  }

  if (
    resultText.includes("loss") ||
    resultText.includes("lost") ||
    resultText.includes("loser") ||
    resultText.includes("sl") ||
    resultText.includes("stop") ||
    resultText.includes("stop loss") ||
    resultText.includes("red")
  ) {
    return "loss";
  }

  if (
    resultText === "be" ||
    resultText.includes("break even") ||
    resultText.includes("breakeven") ||
    resultText.includes("scratch") ||
    resultText.includes("flat")
  ) {
    return "breakeven";
  }

  const pnl = getTradePnl(trade);
  if (pnl > 0) return "win";
  if (pnl < 0) return "loss";

  const priceMove = getPriceMoveResult(trade);
  if (priceMove > 0) return "win";
  if (priceMove < 0) return "loss";

  return "unknown";
}

function getTradeResultR(trade: Trade) {
  const outcome = getTradeOutcome(trade);
  const actualR = getActualR(trade);
  const plannedRR = getPlannedRR(trade);
  const pnl = getTradePnl(trade);
  const priceMove = getPriceMoveResult(trade);

  if (actualR !== 0) return actualR;

  if (plannedRR !== 0) {
    if (outcome === "win") return Math.abs(plannedRR);
    if (outcome === "loss") return -1;
    if (outcome === "breakeven") return 0;
  }

  if (pnl > 0) return 1;
  if (pnl < 0) return -1;

  if (priceMove > 0) return 1;
  if (priceMove < 0) return -1;

  if (outcome === "win") return 1;
  if (outcome === "loss") return -1;

  return 0;
}

function parseDateValue(value: any): Date | null {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (typeof value?.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }

  if (typeof value?.seconds === "number") {
    const date = new Date(value.seconds * 1000);
    return !Number.isNaN(date.getTime()) ? date : null;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) ? date : null;
}

function getTradeDate(trade: Trade) {
  const t = trade as any;

  const value = getFieldValue(t, [
    "date",
    "tradeDate",
    "entryDate",
    "openDate",
    "closeDate",
    "createdAt",
    "updatedAt",
  ]);

  return parseDateValue(value);
}

function getStrategy(trade: Trade) {
  const t = trade as any;

  return pretty(
    getFieldValue(t, [
      "setup",
      "strategy",
      "setupName",
      "playbook",
      "playbookName",
      "strategyName",
      "model",
      "edge",
    ]),
    "No Strategy"
  );
}

function getInstrument(trade: Trade) {
  const t = trade as any;

  return pretty(getFieldValue(t, ["instrument", "symbol", "ticker", "pair"]), "Unknown");
}

function getAccountName(trade: Trade, accounts: TradingAccount[]) {
  const t = trade as any;

  const rawAccount = getFieldValue(t, [
    "account",
    "accountName",
    "accountLabel",
    "broker",
    "accountId",
  ]);

  if (!rawAccount) return "No Account";

  const match = accounts.find(
    (account) =>
      clean(account.id) === clean(rawAccount) ||
      clean(account.name) === clean(rawAccount)
  );

  return match?.name || String(rawAccount);
}

function enhanceTrade(trade: Trade, accounts: TradingAccount[]): AnalyticsTrade {
  const outcome = getTradeOutcome(trade);
  const r = getTradeResultR(trade);

  return {
    ...trade,
    _r: r,
    _pnl: getTradePnl(trade),
    _outcome: outcome,
    _date: getTradeDate(trade),
    _strategy: getStrategy(trade),
    _account: getAccountName(trade, accounts),
    _instrument: getInstrument(trade),
    _direction: getDirection(trade),
  };
}

function formatR(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

function calcStats(trades: AnalyticsTrade[]) {
  const wins = trades.filter((trade) => trade._outcome === "win");
  const losses = trades.filter((trade) => trade._outcome === "loss");
  const breakeven = trades.filter((trade) => trade._outcome === "breakeven");

  const totalR = trades.reduce((sum, trade) => sum + trade._r, 0);

  const winR = wins.map((trade) => trade._r).filter((value) => value > 0);
  const lossR = losses.map((trade) => trade._r).filter((value) => value < 0);

  const grossWin = winR.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(lossR.reduce((sum, value) => sum + value, 0));

  const avgWin = winR.length
    ? grossWin / winR.length
    : 0;

  const avgLoss = lossR.length
    ? lossR.reduce((sum, value) => sum + value, 0) / lossR.length
    : 0;

  const profitFactor =
    grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? grossWin : 0;

  const biggestWin = trades.reduce(
    (max, trade) => Math.max(max, trade._r),
    0
  );

  const biggestLoss = trades.reduce(
    (min, trade) => Math.min(min, trade._r),
    0
  );

  return {
    trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    totalR,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    expectancy: trades.length ? totalR / trades.length : 0,
    avgWin,
    avgLoss,
    profitFactor,
    biggestWin,
    biggestLoss,
    grossWin,
    grossLoss,
  };
}

function buildEquityCurve(trades: AnalyticsTrade[]) {
  let runningR = 0;

  const sorted = [...trades].sort((a, b) => {
    const aTime = a._date?.getTime() || 0;
    const bTime = b._date?.getTime() || 0;
    return aTime - bTime;
  });

  return sorted.map((trade, index) => {
    runningR += trade._r;

    return {
      name: trade._date
        ? trade._date.toLocaleDateString("en-AU", {
            day: "2-digit",
            month: "short",
          })
        : `#${index + 1}`,
      trade: index + 1,
      equity: Number(runningR.toFixed(2)),
      r: trade._r,
      instrument: trade._instrument,
      strategy: trade._strategy,
    };
  });
}

function breakdownBy(trades: AnalyticsTrade[], key: keyof AnalyticsTrade): BreakdownRow[] {
  const map = new Map<string, AnalyticsTrade[]>();

  for (const trade of trades) {
    const group = String(trade[key] || "Unknown");
    map.set(group, [...(map.get(group) || []), trade]);
  }

  return Array.from(map.entries())
    .map(([name, rows]) => {
      const stats = calcStats(rows);

      return {
        name,
        trades: stats.trades,
        wins: stats.wins,
        losses: stats.losses,
        totalR: stats.totalR,
        winRate: stats.winRate,
        expectancy: stats.expectancy,
        profitFactor: stats.profitFactor,
      };
    })
    .sort((a, b) => b.totalR - a.totalR);
}

function inTimeRange(trade: AnalyticsTrade, range: string) {
  if (range === "all") return true;
  if (!trade._date) return true;

  const now = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - days);

  return trade._date >= cutoff;
}

function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
  tone?: "neutral" | "good" | "bad" | "gold";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-300"
      : tone === "bad"
      ? "text-red-300"
      : tone === "gold"
      ? "text-amber-300"
      : "text-white";

  return (
    <div className="relative min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-[#12101c] p-5 shadow-lg shadow-black/20">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
            {label}
          </p>
          <p className={`mt-2 truncate text-2xl font-semibold ${toneClass}`}>
            {value}
          </p>
          <p className="mt-2 truncate text-xs text-zinc-500">{sub}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-amber-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="overflow-hidden">
      <div className="relative flex flex-col items-center px-6 py-16 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/10 text-amber-300">
          <BarChart3 size={30} />
        </div>

        <h2 className="text-2xl font-semibold text-white">
          No analytics data yet
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Add trades with a setup, direction, result, and account. ProfitPnL will
          turn them into strategy performance, win rate, expectancy, and edge
          diagnostics.
        </p>
      </div>
    </Card>
  );
}

function BreakdownTable({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: BreakdownRow[];
  empty: string;
}) {
  return (
    <Card className="min-w-0">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{empty}</p>
        </div>
      </div>

      <div className="space-y-3">
        {rows.slice(0, 8).map((row) => (
          <div
            key={row.name}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{row.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {row.trades} trades · {row.wins}W / {row.losses}L
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-right">
                <div>
                  <p className="text-xs text-zinc-500">Total R</p>
                  <p
                    className={`font-semibold ${
                      row.totalR >= 0 ? "text-emerald-300" : "text-red-300"
                    }`}
                  >
                    {formatR(row.totalR)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500">Win</p>
                  <p className="font-semibold text-white">
                    {formatPct(row.winRate)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500">Exp.</p>
                  <p
                    className={`font-semibold ${
                      row.expectancy >= 0 ? "text-emerald-300" : "text-red-300"
                    }`}
                  >
                    {formatR(row.expectancy)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-500">
            No breakdown data available.
          </div>
        )}
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [playbook, setPlaybook] = useState<PlaybookSetup[]>([]);

  const [accountFilter, setAccountFilter] = useState("all");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [rangeFilter, setRangeFilter] = useState("all");
  const [search, setSearch] = useState("");

  async function loadData() {
    if (!user) return;

    setLoading(true);

    try {
      const [tradeData, accountData, playbookData] = await Promise.all([
        getTrades(user.uid),
        getAccounts(user.uid),
        getPlaybook(user.uid),
      ]);

      setTrades(tradeData as Trade[]);
      setAccounts(accountData as TradingAccount[]);
      setPlaybook(playbookData as PlaybookSetup[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const enhancedTrades = useMemo(() => {
    return trades.map((trade) => enhanceTrade(trade, accounts));
  }, [trades, accounts]);

  const strategies = useMemo(() => {
    const fromTrades = enhancedTrades.map((trade) => trade._strategy);
    const fromPlaybook = playbook.map((setup) => setup.name);

    return Array.from(new Set([...fromPlaybook, ...fromTrades]))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [enhancedTrades, playbook]);

  const accountNames = useMemo(() => {
    const fromTrades = enhancedTrades.map((trade) => trade._account);
    const fromAccounts = accounts.map((account) => account.name);

    return Array.from(new Set([...fromAccounts, ...fromTrades]))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [enhancedTrades, accounts]);

  const filteredTrades = useMemo(() => {
    const q = clean(search);

    return enhancedTrades.filter((trade) => {
      const accountOk =
        accountFilter === "all" || clean(trade._account) === clean(accountFilter);

      const strategyOk =
        strategyFilter === "all" ||
        clean(trade._strategy) === clean(strategyFilter);

      const rangeOk = inTimeRange(trade, rangeFilter);

      const haystack = [
        trade._instrument,
        trade._strategy,
        trade._account,
        trade._direction,
        (trade as any).notes,
        (trade as any).mistake,
        (trade as any).emotion,
        (trade as any).tags,
      ]
        .join(" ")
        .toLowerCase();

      const searchOk = !q || haystack.includes(q);

      return accountOk && strategyOk && rangeOk && searchOk;
    });
  }, [enhancedTrades, accountFilter, strategyFilter, rangeFilter, search]);

  const stats = useMemo(() => calcStats(filteredTrades), [filteredTrades]);

  const equity = useMemo(() => buildEquityCurve(filteredTrades), [filteredTrades]);

  const strategyRows = useMemo(
    () => breakdownBy(filteredTrades, "_strategy"),
    [filteredTrades]
  );

  const directionRows = useMemo(
    () => breakdownBy(filteredTrades, "_direction"),
    [filteredTrades]
  );

  const instrumentRows = useMemo(
    () => breakdownBy(filteredTrades, "_instrument"),
    [filteredTrades]
  );

  const distributionData = useMemo(
    () => [
      { name: "Wins", value: stats.wins, color: "#34d399" },
      { name: "Breakeven", value: stats.breakeven, color: "#a1a1aa" },
      { name: "Losses", value: stats.losses, color: "#f87171" },
    ],
    [stats]
  );

  const leakMessage = useMemo(() => {
    if (stats.trades === 0) return "Add trades to generate edge diagnostics.";

    if (stats.winRate < 45 && stats.expectancy < 0) {
      return "Main leak: win rate and expectancy are both weak. Review setup selection and avoid low-quality entries.";
    }

    if (stats.avgLoss < -1.2) {
      return "Main leak: average loss is larger than planned. Tighten stop discipline and avoid moving stops.";
    }

    if (stats.profitFactor < 1) {
      return "Main leak: losses are overpowering winners. Focus on cutting losers faster or improving target selection.";
    }

    if (stats.expectancy > 0 && stats.profitFactor >= 1.3) {
      return "Edge is positive. Next focus: consistency, repeatability, and only scaling the strongest strategies.";
    }

    return "Analytics are stable but not elite yet. Improve sample size and review low-expectancy strategies.";
  }, [stats]);

  return (
    <ProtectedRoute>
      <AppShell title="Analytics">
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d0b16] p-6 shadow-2xl shadow-black/30 md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_35%)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
                  <Activity size={14} />
                  Performance Intelligence
                </div>

                <h1 className="break-words text-3xl font-semibold tracking-tight text-white md:text-5xl">
                  Analytics
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400 md:text-base">
                  Measure your edge by strategy, account, direction, and
                  instrument. Find what deserves more size and what needs to be
                  removed.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Current sample
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {filteredTrades.length}
                </p>
                <p className="mt-1 text-xs text-zinc-500">filtered trades</p>
              </div>
            </div>
          </section>

          <Card className="border-white/10 bg-white/[0.03]">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_160px]">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search instrument, notes, emotion, tags..."
                  className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-amber-400/50"
                />
              </div>

              <div className="relative">
                <Filter
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-amber-400/50"
                >
                  <option value="all" className="bg-zinc-950">
                    All Accounts
                  </option>
                  {accountNames.map((account) => (
                    <option key={account} value={account} className="bg-zinc-950">
                      {account}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Layers3
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <select
                  value={strategyFilter}
                  onChange={(e) => setStrategyFilter(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-amber-400/50"
                >
                  <option value="all" className="bg-zinc-950">
                    All Strategies
                  </option>
                  {strategies.map((strategy) => (
                    <option
                      key={strategy}
                      value={strategy}
                      className="bg-zinc-950"
                    >
                      {strategy}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <CalendarDays
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <select
                  value={rangeFilter}
                  onChange={(e) => setRangeFilter(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-amber-400/50"
                >
                  <option value="all" className="bg-zinc-950">
                    All Time
                  </option>
                  <option value="7d" className="bg-zinc-950">
                    Last 7D
                  </option>
                  <option value="30d" className="bg-zinc-950">
                    Last 30D
                  </option>
                  <option value="90d" className="bg-zinc-950">
                    Last 90D
                  </option>
                  <option value="365d" className="bg-zinc-950">
                    Last 1Y
                  </option>
                </select>
              </div>
            </div>
          </Card>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-32 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]"
                />
              ))}
            </div>
          ) : filteredTrades.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Net R"
                  value={formatR(stats.totalR)}
                  sub={`${stats.wins}W / ${stats.losses}L / ${stats.breakeven}BE`}
                  icon={<TrendingUp size={20} />}
                  tone={stats.totalR >= 0 ? "good" : "bad"}
                />

                <StatCard
                  label="Win Rate"
                  value={formatPct(stats.winRate)}
                  sub={`${stats.trades} classified trades`}
                  icon={<Target size={20} />}
                  tone={stats.winRate >= 50 ? "good" : "neutral"}
                />

                <StatCard
                  label="Expectancy"
                  value={formatR(stats.expectancy)}
                  sub="Average R per trade"
                  icon={<Gauge size={20} />}
                  tone={stats.expectancy >= 0 ? "good" : "bad"}
                />

                <StatCard
                  label="Profit Factor"
                  value={stats.profitFactor.toFixed(2)}
                  sub={`Gross win ${formatR(stats.grossWin)} / loss ${formatR(-stats.grossLoss)}`}
                  icon={<Trophy size={20} />}
                  tone={stats.profitFactor >= 1.3 ? "good" : "gold"}
                />
              </section>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Average Win"
                  value={formatR(stats.avgWin)}
                  sub="Mean winning trade"
                  icon={<TrendingUp size={20} />}
                  tone="good"
                />

                <StatCard
                  label="Average Loss"
                  value={formatR(stats.avgLoss)}
                  sub="Mean losing trade"
                  icon={<AlertTriangle size={20} />}
                  tone="bad"
                />

                <StatCard
                  label="Biggest Win"
                  value={formatR(stats.biggestWin)}
                  sub="Best single execution"
                  icon={<Trophy size={20} />}
                  tone="good"
                />

                <StatCard
                  label="Biggest Loss"
                  value={formatR(stats.biggestLoss)}
                  sub="Worst single execution"
                  icon={<AlertTriangle size={20} />}
                  tone="bad"
                />
              </section>

              <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
                <Card className="min-w-0">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <LineChartIcon size={18} className="text-amber-300" />
                        <h3 className="text-lg font-semibold text-white">
                          Equity Curve
                        </h3>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">
                        Running R across filtered trades.
                      </p>
                    </div>
                  </div>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equity}>
                        <defs>
                          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#71717a"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#71717a"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#09090b",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "16px",
                            color: "#fff",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="equity"
                          stroke="#fbbf24"
                          strokeWidth={2}
                          fill="url(#equityFill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="min-w-0">
                  <div className="mb-5">
                    <h3 className="text-lg font-semibold text-white">
                      Distribution
                    </h3>
                    <p className="mt-1 text-sm text-zinc-400">
                      Wins vs losses.
                    </p>
                  </div>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distributionData}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#71717a"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#71717a"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#09090b",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "16px",
                            color: "#fff",
                          }}
                        />
                        <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                          {distributionData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </section>

              <section className="grid gap-4 xl:grid-cols-3">
                <BreakdownTable
                  title="Strategy Performance"
                  rows={strategyRows}
                  empty="Which setups are creating edge."
                />

                <BreakdownTable
                  title="Direction Breakdown"
                  rows={directionRows}
                  empty="Long vs short performance."
                />

                <BreakdownTable
                  title="Instrument Breakdown"
                  rows={instrumentRows}
                  empty="Symbols/pairs driving results."
                />
              </section>

              <Card className="border-amber-400/15 bg-amber-400/[0.035]">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={18} className="text-amber-300" />
                      <h3 className="text-lg font-semibold text-white">
                        Edge Diagnostic
                      </h3>
                    </div>

                    <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-300">
                      {leakMessage}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-zinc-300">
                    Sample: {stats.trades} trades
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}