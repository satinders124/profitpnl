"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAccounts, getPlaybook, getTrades } from "@/lib/db";
import {
  breakdownBy,
  buildEquityPoints,
  calcStats,
  dayOfWeekLabel,
  formatPct,
  formatR,
  openTrades,
  sortByWeekday,
  uniqueClean,
  type BreakdownRow,
} from "@/lib/stats";
import { Trade } from "@/types/trade";
import { TradingAccount } from "@/types/account";
import { PlaybookSetup } from "@/types/playbook";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Brain,
  CalendarClock,
  Clock,
  Compass,
  Gauge,
  Layers3,
  LineChart as LineChartIcon,
  Search,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
  Filter,
} from "lucide-react";

type TimeRange = "all" | "7d" | "30d" | "90d" | "365d";

const AnalyticsEquityChart = dynamic(
  () => import("@/components/charts/AnalyticsEquityChart"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-xl border border-[#1E1E38] bg-[#070712] text-xs text-[#5A5A80]">
        Loading chart…
      </div>
    ),
  }
);

const AnalyticsDistributionChart = dynamic(
  () => import("@/components/charts/AnalyticsDistributionChart"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-xl border border-[#1E1E38] bg-[#070712] text-xs text-[#5A5A80]">
        Loading chart…
      </div>
    ),
  }
);

function inTimeRange(trade: Trade, range: TimeRange) {
  if (range === "all") return true;
  if (!trade.date) return true;

  const days =
    range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return new Date(`${trade.date}T12:00:00`) >= cutoff;
}

const selectClass =
  "mt-1.5 w-full cursor-pointer appearance-none truncate rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-2.5 text-sm font-semibold text-white outline-none transition-colors focus:border-[#F0B429]";

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <div className="min-w-0">
      <label className="text-xs font-semibold text-[#8080A0]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        <option value="">{allLabel}</option>
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [playbook, setPlaybook] = useState<PlaybookSetup[]>([]);

  const [accountFilter, setAccountFilter] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("");
  const [rangeFilter, setRangeFilter] = useState<TimeRange>("all");
  const [search, setSearch] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  async function loadData() {
    if (!user) return;

    setLoading(true);

    try {
      const [tradeData, accountData, playbookData] = await Promise.all([
        getTrades(user.id),
        getAccounts(user.id),
        getPlaybook(user.id),
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const accountNames = useMemo(
    () =>
      uniqueClean([
        ...accounts.map((a) => a.name),
        ...trades.map((t) => t.account),
      ]),
    [accounts, trades]
  );

  const strategyNames = useMemo(
    () =>
      uniqueClean([
        ...playbook.map((p) => p.name),
        ...trades.map((t) => t.setup),
      ]),
    [playbook, trades]
  );

  const filteredTrades = useMemo(() => {
    const q = search.trim().toLowerCase();

    return trades.filter((trade) => {
      if (accountFilter && trade.account !== accountFilter) return false;
      if (strategyFilter && trade.setup !== strategyFilter) return false;
      if (!inTimeRange(trade, rangeFilter)) return false;

      if (q) {
        const haystack = [
          trade.instrument,
          trade.setup,
          trade.account,
          trade.direction,
          trade.notes,
          trade.mistake,
          trade.emotion,
          trade.tags,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [trades, accountFilter, strategyFilter, rangeFilter, search]);

  // Same closed-trades engine as Dashboard and Trade Log — guarantees this
  // page never disagrees with them on the same underlying data.
  const stats = useMemo(() => calcStats(filteredTrades), [filteredTrades]);
  const pendingTrades = useMemo(
    () => openTrades(filteredTrades),
    [filteredTrades]
  );

  const equity = useMemo(
    () => buildEquityPoints(filteredTrades),
    [filteredTrades]
  );

  const strategyRows = useMemo(
    () => breakdownBy(filteredTrades, (t) => t.setup || "", "No Strategy"),
    [filteredTrades]
  );

  const directionRows = useMemo(
    () => breakdownBy(filteredTrades, (t) => t.direction || "", "Unknown"),
    [filteredTrades]
  );

  const instrumentRows = useMemo(
    () => breakdownBy(filteredTrades, (t) => t.instrument || "", "Unknown"),
    [filteredTrades]
  );

  const accountRows = useMemo(
    () => breakdownBy(filteredTrades, (t) => t.account || "", "No Account"),
    [filteredTrades]
  );

  const sessionRows = useMemo(
    () => breakdownBy(filteredTrades, (t) => t.session || "", "No Session"),
    [filteredTrades]
  );

  const dayOfWeekRows = useMemo(
    () =>
      sortByWeekday(
        breakdownBy(filteredTrades, (t) => dayOfWeekLabel(t.date), "Unknown")
      ),
    [filteredTrades]
  );

  // Only trades where a mistake was actually tagged (empty/"None" excluded)
  // — an untagged trade isn't a "mistake called None", it's just untagged.
  const mistakeRows = useMemo(() => {
    const tagged = filteredTrades.filter((t) => {
      const tag = (t.mistake || "").trim().toLowerCase();
      return tag && tag !== "none";
    });
    return breakdownBy(tagged, (t) => t.mistake || "", "Untagged").sort(
      (a, b) => a.totalR - b.totalR // worst leak first — that's the point of this table
    );
  }, [filteredTrades]);

  const emotionRows = useMemo(
    () => breakdownBy(filteredTrades, (t) => t.emotion || "", "Untagged"),
    [filteredTrades]
  );

  const distributionData = useMemo(
    () => [
      { name: "Wins", value: stats.wins, color: "#00D084" },
      { name: "Breakeven", value: stats.breakeven, color: "#8080A0" },
      { name: "Losses", value: stats.losses, color: "#FF4565" },
    ],
    [stats]
  );

  const leakMessage = useMemo(() => {
    if (stats.count === 0) return "Add closed trades to generate edge diagnostics.";

    if (stats.winRate < 0.45 && stats.expectancy < 0) {
      return "Main leak: win rate and expectancy are both weak. Review setup selection and avoid low-quality entries.";
    }

    if (stats.avgLoss > 1.2) {
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

  const hasFilters = Boolean(accountFilter || strategyFilter || rangeFilter !== "all" || search);

  function clearFilters() {
    setAccountFilter("");
    setStrategyFilter("");
    setRangeFilter("all");
    setSearch("");
  }

  return (
    <AppShell
      title="Analytics"
      subtitle={`${filteredTrades.length} trades in view · ${stats.count} closed`}
    >
      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center text-sm text-[#8080A0]">
          Loading performance analytics…
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#1E1E38] bg-[#111124]/80 p-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setRangeFilter("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${rangeFilter === "all" ? "gold-gradient text-black shadow-md shadow-[#F0B429]/20" : "bg-[#18182C] text-zinc-400 hover:text-white border border-[#282840]"}`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setRangeFilter("30d")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${rangeFilter === "30d" ? "bg-[#F0B429]/20 border border-[#F0B429] text-[#F0B429]" : "bg-[#18182C] text-zinc-400 hover:text-white border border-[#282840]"}`}
                >
                  30 Days
                </button>
                <button
                  onClick={() => setRangeFilter("90d")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${rangeFilter === "90d" ? "bg-[#F0B429]/20 border border-[#F0B429] text-[#F0B429]" : "bg-[#18182C] text-zinc-400 hover:text-white border border-[#282840]"}`}
                >
                  90 Days
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 md:w-64">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search analytics..."
                    className="w-full rounded-xl border border-[#24243C] bg-[#0D0D1A] py-2 pl-9 pr-4 text-xs font-bold text-white outline-none focus:border-[#F0B429]"
                  />
                </div>
                <button
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${filtersExpanded || hasFilters ? "bg-[#F0B429]/15 border-[#F0B429] text-[#F0B429]" : "bg-[#18182C] border-[#282840] text-zinc-300 hover:text-white"}`}
                >
                  <span>Filters</span>
                  {hasFilters && <span className="w-2 h-2 rounded-full bg-[#F0B429]" />}
                </button>
              </div>
            </div>

            {filtersExpanded && (
              <div className="mt-4 pt-4 border-t border-[#24243C] grid gap-3 md:grid-cols-2 animate-in fade-in duration-200">
                <FilterSelect
                  label="Account"
                  value={accountFilter}
                  onChange={setAccountFilter}
                  allLabel="All Accounts"
                  options={accountNames}
                />

                <FilterSelect
                  label="Strategy"
                  value={strategyFilter}
                  onChange={setStrategyFilter}
                  allLabel="All Strategies"
                  options={strategyNames}
                />
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
              <span>
                Showing <strong className="text-white">{filteredTrades.length}</strong> of {trades.length} trades · <strong className="text-white">{stats.count}</strong> closed
              </span>
              {hasFilters && (
                <button onClick={clearFilters} className="font-bold text-[#F0B429] hover:underline">
                  Clear filters ×
                </button>
              )}
            </div>
          </div>

          {stats.count === 0 ? (
            <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
          ) : (
            <>
              <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Net R"
                  value={formatR(stats.totalR)}
                  sub={`${stats.wins}W / ${stats.losses}L / ${stats.breakeven}BE`}
                  icon={<TrendingUp size={18} />}
                  tone={stats.totalR >= 0 ? "green" : "red"}
                />

                <StatCard
                  label="Win Rate"
                  value={formatPct(stats.winRate)}
                  sub={`${stats.count} closed trades`}
                  icon={<Target size={18} />}
                  tone={stats.winRate >= 0.5 ? "green" : "gold"}
                />

                <StatCard
                  label="Expectancy"
                  value={formatR(stats.expectancy)}
                  sub="average R per trade"
                  icon={<Gauge size={18} />}
                  tone={stats.expectancy >= 0 ? "green" : "red"}
                />

                <StatCard
                  label="Profit Factor"
                  value={stats.profitFactor >= 99 ? "∞" : stats.profitFactor.toFixed(2)}
                  sub={
                    stats.profitFactor >= 1.3 ? "strong edge" : "needs improvement"
                  }
                  icon={<Trophy size={18} />}
                  tone={stats.profitFactor >= 1 ? "green" : "red"}
                />
              </section>

              <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Average Win"
                  value={formatR(stats.avgWin)}
                  sub="mean winning trade"
                  icon={<TrendingUp size={18} />}
                  tone="green"
                />

                <StatCard
                  label="Average Loss"
                  value={formatR(-stats.avgLoss)}
                  sub="mean losing trade"
                  icon={<AlertTriangle size={18} />}
                  tone="red"
                />

                <StatCard
                  label="Biggest Win"
                  value={formatR(stats.biggestWin)}
                  sub="best single execution"
                  icon={<Trophy size={18} />}
                  tone="green"
                />

                <StatCard
                  label="Biggest Loss"
                  value={formatR(stats.biggestLoss)}
                  sub="worst single execution"
                  icon={<AlertTriangle size={18} />}
                  tone="red"
                />
              </section>

              <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)]">
                <Card className="min-w-0 overflow-hidden border-[#1E1E38] bg-[#0D0D1A] p-6 shadow-lg">
                  <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#1E1E38] pb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-base font-bold text-white">
                        <LineChartIcon size={18} className="shrink-0 text-[#F0B429]" />
                        <span className="truncate">Equity Curve</span>
                      </div>
                      <p className="mt-1 text-xs text-[#8080A0]">
                        Running R across {stats.count} closed trades in view.
                      </p>
                    </div>
                  </div>

                  <div className="relative h-80 overflow-hidden rounded-xl border border-[#1E1E38] bg-[#070712] p-4">
                    <AnalyticsEquityChart data={equity} />
                  </div>
                </Card>

                <Card className="min-w-0 overflow-hidden border-[#1E1E38] bg-[#111124] p-6 shadow-lg">
                  <div className="mb-5 border-b border-[#1E1E38] pb-4">
                    <div className="flex items-center gap-2 text-base font-bold text-white">
                      <BarChart3 size={18} className="shrink-0 text-[#F0B429]" />
                      <span className="truncate">Distribution</span>
                    </div>
                    <p className="mt-1 text-xs text-[#8080A0]">Wins vs losses vs breakeven.</p>
                  </div>

                  <div className="h-80">
                    <AnalyticsDistributionChart data={distributionData} />
                  </div>
                </Card>
              </section>

              <section className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                <BreakdownTable
                  title="Strategy Performance"
                  icon={<Compass size={18} className="text-[#F0B429]" />}
                  rows={strategyRows}
                  empty="Which setups are creating edge."
                />

                <BreakdownTable
                  title="Direction Breakdown"
                  icon={<Activity size={18} className="text-[#4C82FB]" />}
                  rows={directionRows}
                  empty="Long vs short performance."
                />

                <BreakdownTable
                  title="Instrument Breakdown"
                  icon={<Layers3 size={18} className="text-[#A855F7]" />}
                  rows={instrumentRows}
                  empty="Symbols/pairs driving results."
                />
              </section>

              <section className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                <BreakdownTable
                  title="Account Performance"
                  icon={<Wallet size={18} className="text-[#00D084]" />}
                  rows={accountRows}
                  empty="Which accounts are actually profitable."
                />

                <BreakdownTable
                  title="Session Breakdown"
                  icon={<Clock size={18} className="text-[#F0B429]" />}
                  rows={sessionRows}
                  empty="London, New York, Asia — where your edge lives."
                />

                <BreakdownTable
                  title="Day of Week"
                  icon={<CalendarClock size={18} className="text-[#4C82FB]" />}
                  rows={dayOfWeekRows}
                  empty="Monday through Sunday, in calendar order."
                  sortLabel="Mon → Sun"
                />
              </section>

              <section className="grid min-w-0 gap-4 lg:grid-cols-2">
                <BreakdownTable
                  title="Mistake / Leak Analysis"
                  icon={<AlertOctagon size={18} className="text-[#FF4565]" />}
                  rows={mistakeRows}
                  empty="Tagged mistakes, worst leak first — this is costing you the most."
                  sortLabel="Worst first"
                />

                <BreakdownTable
                  title="Emotion Breakdown"
                  icon={<Brain size={18} className="text-[#A855F7]" />}
                  rows={emotionRows}
                  empty="Performance by emotional state at entry."
                />
              </section>

              <Card className="border-[#F0B429]/20 bg-[#F0B429]/[0.04] p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={18} className="shrink-0 text-[#F0B429]" />
                      <h3 className="text-base font-bold text-white">Edge Diagnostic</h3>
                    </div>

                    <p className="mt-3 max-w-4xl text-sm leading-6 text-[#A0A0C0]">
                      {leakMessage}
                    </p>
                  </div>

                  <div className="shrink-0 self-start whitespace-nowrap rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 text-sm font-bold tabular-nums text-[#A0A0C0]">
                    Sample: {stats.count} closed
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "gold",
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone?: "green" | "red" | "gold";
}) {
  const color =
    tone === "green" ? "#00D084" : tone === "red" ? "#FF4565" : "#F0B429";

  return (
    <Card className="min-w-0 border-[#1E1E38] p-5 shadow-md transition-all hover:border-white/20">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-xs font-semibold uppercase tracking-wider text-[#8080A0]">
          {label}
        </div>
        <div className="shrink-0" style={{ color }}>
          {icon}
        </div>
      </div>

      <div
        className="mt-3 truncate text-2xl font-bold tabular-nums tracking-tight md:text-3xl"
        style={{ color }}
        title={value}
      >
        {value}
      </div>

      <div className="mt-1 truncate text-xs font-medium text-[#8080A0]" title={sub}>
        {sub}
      </div>
    </Card>
  );
}

function BreakdownTable({
  title,
  icon,
  rows,
  empty,
  sortLabel,
}: {
  title: string;
  icon: React.ReactNode;
  rows: BreakdownRow[];
  empty: string;
  sortLabel?: string;
}) {
  const maxAbsR = Math.max(...rows.map((row) => Math.abs(row.totalR)), 1);

  return (
    <Card className="min-w-0 border-[#1E1E38] p-6 shadow-lg">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#1E1E38] pb-3">
        <div className="flex min-w-0 items-center gap-2 text-base font-bold text-white">
          {icon}
          <span className="truncate">{title}</span>
        </div>
        {sortLabel && (
          <span className="shrink-0 whitespace-nowrap rounded-full border border-[#1E1E38] bg-[#0D0D1A] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#5A5A80]">
            {sortLabel}
          </span>
        )}
      </div>
      <p className="-mt-3 mb-4 truncate text-xs text-[#8080A0]">{empty}</p>

      <div className="space-y-2.5">
        {rows.slice(0, 8).map((row) => (
          <div
            key={row.name}
            className="min-w-0 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3.5 transition-colors hover:border-white/20"
          >
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white" title={row.name}>
                  {row.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[#8080A0]">
                  {row.trades} {row.trades === 1 ? "trade" : "trades"} · {row.wins}W /{" "}
                  {row.losses}L
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
                  row.totalR >= 0
                    ? "bg-[#00D084]/15 text-[#00D084]"
                    : "bg-[#FF4565]/15 text-[#FF4565]"
                }`}
              >
                {formatR(row.totalR)}
              </span>
            </div>

            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full ${
                  row.totalR >= 0 ? "bg-[#00D084]/70" : "bg-[#FF4565]/70"
                }`}
                style={{
                  width: `${Math.max((Math.abs(row.totalR) / maxAbsR) * 100, 4)}%`,
                }}
              />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-wide text-[#5A5A80]">
                  Win Rate
                </p>
                <p className="truncate text-xs font-bold tabular-nums text-white">
                  {row.winRate.toFixed(1)}%
                </p>
              </div>

              <div className="min-w-0 text-center">
                <p className="truncate text-[10px] uppercase tracking-wide text-[#5A5A80]">
                  Expectancy
                </p>
                <p
                  className={`truncate text-xs font-bold tabular-nums ${
                    row.expectancy >= 0 ? "text-[#00D084]" : "text-[#FF4565]"
                  }`}
                >
                  {formatR(row.expectancy)}
                </p>
              </div>

              <div className="min-w-0 text-right">
                <p className="truncate text-[10px] uppercase tracking-wide text-[#5A5A80]">
                  P. Factor
                </p>
                <p className="truncate text-xs font-bold tabular-nums text-white">
                  {row.profitFactor >= 99 ? "∞" : row.profitFactor.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#1E1E38] bg-[#0D0D1A] p-6 text-center text-sm text-[#8080A0]">
            No breakdown data available.
          </div>
        )}
      </div>
    </Card>
  );
}

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <Card className="border-[#1E1E38] p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D0D1A] text-[#F0B429]">
        <BarChart3 size={26} />
      </div>

      <h2 className="mt-4 text-lg font-black text-white">
        {hasFilters ? "No closed trades match filters" : "No closed trades yet"}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8080A0]">
        {hasFilters
          ? "Try widening your filters, or clear them to see all trades."
          : "Log trades with a result, setup, direction, and account. ProfitPnL will turn them into strategy performance, win rate, expectancy, and edge diagnostics."}
      </p>

      {hasFilters && (
        <button
          onClick={onClear}
          className="mt-5 rounded-xl border border-[#1E1E38] px-4 py-2 text-sm font-bold text-[#F0B429] hover:bg-[#F0B429]/10"
        >
          Clear filters
        </button>
      )}
    </Card>
  );
}
