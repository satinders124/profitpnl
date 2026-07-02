"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { TradeForm } from "@/components/trades/TradeForm";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAccounts, getPlaybook, getTrades } from "@/lib/firestore";
import {
  calcStats,
  directionStats,
  equityCurve,
  formatPct,
  formatR,
  uniqueClean,
} from "@/lib/stats";
import { Trade } from "@/types/trade";
import { TradingAccount } from "@/types/account";
import { PlaybookSetup } from "@/types/playbook";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  Crosshair,
  Flame,
  LineChart,
  Shield,
  Target,
  Trophy,
  Calendar as CalendarIcon,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";

type TimeRange = "all" | "7d" | "30d" | "90d";

export default function DashboardPage() {
  const { user } = useAuth();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [playbook, setPlaybook] = useState<PlaybookSetup[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Log Trade
  const [tradeModalOpen, setTradeModalOpen] = useState(false);

  const [accountFilter, setAccountFilter] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [tradeRows, accountRows, playbookRows] = await Promise.all([
        getTrades(user.uid),
        getAccounts(user.uid),
        getPlaybook(user.uid),
      ]);

      setTrades(tradeRows);
      setAccounts(accountRows);
      setPlaybook(playbookRows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const accountNames = useMemo(() => {
    return uniqueClean([
      ...accounts.map((a) => a.name),
      ...trades.map((t) => t.account),
    ]);
  }, [accounts, trades]);

  const strategyNames = useMemo(() => {
    return uniqueClean([
      ...playbook.map((p) => p.name),
      ...trades.map((t) => t.setup),
    ]);
  }, [playbook, trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      if (accountFilter && trade.account !== accountFilter) return false;
      if (strategyFilter && trade.setup !== strategyFilter) return false;
      if (!withinTimeRange(trade, timeRange)) return false;
      return true;
    });
  }, [trades, accountFilter, strategyFilter, timeRange]);

  const stats = useMemo(() => calcStats(filteredTrades), [filteredTrades]);
  const dir = useMemo(() => directionStats(filteredTrades), [filteredTrades]);
  const curve = useMemo(() => equityCurve(filteredTrades), [filteredTrades]);

  const openTrades = useMemo(() => {
    return filteredTrades.filter((t) => !hasResult(t));
  }, [filteredTrades]);

  const selectedAccounts = accountFilter
    ? accounts.filter((a) => a.name === accountFilter)
    : accounts;

  const totalCapital = selectedAccounts.reduce(
    (sum, account) => sum + Number(account.size || 0),
    0
  );

  const riskPerR = totalCapital > 0 ? totalCapital * 0.01 : 100;

  const tradesWithPnl = filteredTrades.filter(
    (t) => t.pnl !== "" && t.pnl !== null && t.pnl !== undefined
  );

  const actualPnl = tradesWithPnl.reduce(
    (sum, trade) => sum + Number(trade.pnl || 0),
    0
  );

  const dollarProfit =
    tradesWithPnl.length > 0 ? actualPnl : stats.totalR * riskPerR;

  const edgeScore = useMemo(() => {
    return calculateEdgeScore(
      stats.count,
      stats.winRate,
      stats.expectancy,
      stats.profitFactor
    );
  }, [stats.count, stats.winRate, stats.expectancy, stats.profitFactor]);

  const grade = getGrade(edgeScore);
  const gradeColor = getGradeColor(edgeScore);

  const setupRows = useMemo(
    () => getSetupPerformance(filteredTrades),
    [filteredTrades]
  );

  const bestSetup = setupRows[0];
  const worstSetup = setupRows.slice().reverse()[0];

  const recentTrades = filteredTrades
    .slice()
    .sort(
      (a, b) =>
        new Date(b.date || "").getTime() - new Date(a.date || "").getTime()
    )
    .slice(0, 6);

  return (
    <AppShell
      title="Command Center"
      subtitle={`Welcome back${user?.displayName ? `, ${user.displayName}` : ""}`}
      actionLabel="+ Log New Trade"
      onAction={() => setTradeModalOpen(true)}
    >
      {/* Log Trade Modal */}
      {tradeModalOpen && user && (
        <Modal
          isOpen={tradeModalOpen}
          onClose={() => setTradeModalOpen(false)}
          title="Log Trade Execution"
        >
          <TradeForm
            uid={user.uid}
            accounts={accounts}
            playbook={playbook}
            strategiesFromTrades={strategyNames}
            onSaved={() => {
              setTradeModalOpen(false);
              loadData();
            }}
            onCancel={() => setTradeModalOpen(false)}
          />
        </Modal>
      )}

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center text-sm text-[#8080A0]">
          Loading performance analytics…
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* --- TOP FILTERS BAR --- */}
          <DashboardFilters
            accountNames={accountNames}
            strategyNames={strategyNames}
            accountFilter={accountFilter}
            strategyFilter={strategyFilter}
            timeRange={timeRange}
            totalTrades={trades.length}
            filteredTrades={filteredTrades.length}
            onAccountChange={setAccountFilter}
            onStrategyChange={setStrategyFilter}
            onTimeRangeChange={setTimeRange}
            onClear={() => {
              setAccountFilter("");
              setStrategyFilter("");
              setTimeRange("all");
            }}
          />

          {/* --- TOP METRICS STRIP (4 CARDS) --- */}
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<Trophy size={18} />}
              label="Net Profit"
              value={`${dollarProfit >= 0 ? "+" : "-"}$${Math.abs(
                dollarProfit
              ).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              sub={`${formatR(stats.totalR)} · ${
                tradesWithPnl.length ? "actual P/L" : "est. from R"
              }`}
              tone={dollarProfit >= 0 ? "green" : "red"}
            />

            <MetricCard
              icon={<Target size={18} />}
              label="Win Rate"
              value={stats.count ? formatPct(stats.winRate) : "—"}
              sub={`${stats.wins}W / ${stats.losses}L`}
              tone="gold"
            />

            <MetricCard
              icon={<Activity size={18} />}
              label="Expectancy"
              value={formatR(stats.expectancy)}
              sub="average per trade"
              tone={stats.expectancy >= 0 ? "green" : "red"}
            />

            <MetricCard
              icon={<BarChart3 size={18} />}
              label="Profit Factor"
              value={
                stats.profitFactor >= 99 ? "∞" : stats.profitFactor.toFixed(2)
              }
              sub={
                stats.profitFactor >= 1.5 ? "strong edge" : "needs improvement"
              }
              tone={stats.profitFactor >= 1 ? "green" : "red"}
            />
          </div>

          {/* --- EXACT MONTHLY P&L CALENDAR HEATMAP & EDGE SCORE CARD --- */}
          <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <ExactMonthlyCalendarHeatmap trades={filteredTrades} />

            <RedesignedEdgeScoreCard
              score={edgeScore}
              grade={grade}
              gradeColor={gradeColor}
              stats={stats}
              bestSetup={bestSetup?.name || "None yet"}
              worstSetup={
                worstSetup?.totalR && worstSetup.totalR < 0
                  ? worstSetup.name
                  : "None detected"
              }
              dollarProfit={dollarProfit}
            />
          </section>

          {/* --- INTERACTIVE EQUITY CURVE & RISK DESK --- */}
          <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card className="flex min-w-0 flex-col justify-between overflow-hidden border-[#1E1E38] bg-[#0D0D1A] p-6 shadow-lg transition-all hover:border-[#3A3A5A]">
              <div className="mb-5 flex flex-col justify-between gap-4 border-b border-[#1E1E38] pb-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-base font-bold text-white">
                    <LineChart size={18} className="shrink-0 text-[#F0B429]" />
                    <span className="truncate">
                      Cumulative Equity Performance
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#8080A0]">
                    Move cursor along the chart to inspect trade equity
                    snapshots · {stats.count} closed trades
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <div
                    className={[
                      "whitespace-nowrap rounded-lg border px-3.5 py-1 text-sm font-bold tabular-nums shadow-inner",
                      stats.totalR >= 0
                        ? "border-[#00D084]/30 bg-[#00D084]/15 text-[#00D084]"
                        : "border-[#FF4565]/30 bg-[#FF4565]/15 text-[#FF4565]",
                    ].join(" ")}
                  >
                    {formatR(stats.totalR)}
                  </div>
                </div>
              </div>

              <div className="relative h-80 overflow-hidden rounded-xl border border-[#1E1E38] bg-[#070712] p-4">
                {curve.length ? (
                  <InstitutionalInteractiveEquityChart data={curve} />
                ) : (
                  <EmptyMini message="Log closed trades to generate your equity chart." />
                )}
              </div>
            </Card>

            <RiskDesk
              maxDD={stats.maxDD}
              streak={stats.streak}
              openTrades={openTrades.length}
              expectancy={stats.expectancy}
              profitFactor={stats.profitFactor}
            />
          </section>

          {/* --- DIRECTION ALLOCATION, SETUP INTELLIGENCE, & NEXT ACTION --- */}
          <section className="grid min-w-0 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <DirectionAllocation
              longR={dir.long.totalR}
              shortR={dir.short.totalR}
              longCount={dir.long.count}
              shortCount={dir.short.count}
              longWR={dir.long.winRate}
              shortWR={dir.short.winRate}
            />

            <SetupIntelligence best={bestSetup} worst={worstSetup} />

            <NextActionCard
              stats={stats}
              bestSetup={bestSetup}
              worstSetup={worstSetup}
              openTrades={openTrades.length}
            />
          </section>

          {/* --- STRATEGY BOARD & EXECUTION FEED --- */}
          <section className="grid min-w-0 gap-6 xl:grid-cols-2">
            <Card className="min-w-0 border-[#1E1E38] p-6 shadow-lg">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#1E1E38] pb-3">
                <div className="flex min-w-0 items-center gap-2 text-base font-bold text-white">
                  <Crosshair size={18} className="shrink-0 text-[#F0B429]" />
                  <span className="truncate">Strategy Performance</span>
                </div>
                <span className="shrink-0 text-xs text-[#8080A0]">
                  Ranked by total return
                </span>
              </div>

              {setupRows.length ? (
                <div className="space-y-3.5">
                  {setupRows.slice(0, 5).map((row) => (
                    <SetupRow key={row.name} row={row} />
                  ))}
                </div>
              ) : (
                <EmptyMini message="Add setups in Playbook or assign setups to trades." />
              )}
            </Card>

            <Card className="min-w-0 border-[#1E1E38] p-6 shadow-lg">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#1E1E38] pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-base font-bold text-white">
                    <Layers size={18} className="shrink-0 text-[#00D084]" />
                    <span className="truncate">Recent Trade Log</span>
                  </div>
                  <div className="mt-0.5 text-xs text-[#8080A0]">
                    Latest trades matching active filters
                  </div>
                </div>
              </div>

              {recentTrades.length ? (
                <div className="space-y-3">
                  {recentTrades.map((trade) => (
                    <RecentTradeRow key={trade.id} trade={trade} />
                  ))}
                </div>
              ) : (
                <EmptyMini message="No trade executions logged in this view." />
              )}
            </Card>
          </section>
        </motion.div>
      )}
    </AppShell>
  );
}

/* ============================================================
   EXACT MONTHLY P&L CALENDAR HEATMAP (WITH MONTH SWITCHER)
   ============================================================ */
type CalendarCell =
  | { type: "empty"; key: string }
  | {
      type: "day";
      key: string;
      day: number;
      dateStr: string;
      trades: Trade[];
      count: number;
      pnl: number;
    };

function ExactMonthlyCalendarHeatmap({ trades }: { trades: Trade[] }) {
  // State for current displayed month
  const [displayDate, setDisplayDate] = useState(() => new Date());

  const year = displayDate.getFullYear();
  const month = displayDate.getMonth(); // 0-indexed

  const monthName = displayDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  // Calculate calendar grid cells
  const calendarCells = useMemo<CalendarCell[]>(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Monday as first day of week (0 = Mon, 6 = Sun)
    let startDayWeek = firstDayOfMonth.getDay() - 1;
    if (startDayWeek < 0) startDayWeek = 6;

    const cells: CalendarCell[] = [];
    // Padding for days before the 1st
    for (let i = 0; i < startDayWeek; i++) {
      cells.push({ type: "empty", key: `pad-prev-${i}` });
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;

      // Filter exact trades that occurred on this specific YYYY-MM-DD
      const dayTrades = trades.filter((t) => t.date === dateStr);
      const dayPnl = dayTrades.reduce(
        (sum, t) => sum + Number(t.result || 0),
        0
      );

      cells.push({
        type: "day",
        key: `day-${day}`,
        day,
        dateStr,
        trades: dayTrades,
        count: dayTrades.length,
        pnl: dayPnl,
      });
    }

    // Padding for end of grid (make total length multiple of 7)
    const totalCells = cells.length;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remaining; i++) {
      cells.push({ type: "empty", key: `pad-next-${i}` });
    }

    return cells;
  }, [trades, year, month]);

  // Compute month summary statistics
  const monthStats = useMemo(() => {
    let winDays = 0;
    let lossDays = 0;
    let totalMonthR = 0;
    let totalMonthTrades = 0;

    for (const cell of calendarCells) {
      if (cell.type === "day" && cell.count > 0) {
        totalMonthTrades += cell.count;
        totalMonthR += cell.pnl;
        if (cell.pnl > 0) winDays++;
        if (cell.pnl < 0) lossDays++;
      }
    }

    return { winDays, lossDays, totalMonthR, totalMonthTrades };
  }, [calendarCells]);

  const handlePrevMonth = () => {
    setDisplayDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setDisplayDate(new Date());
  };

  return (
    <Card className="flex min-w-0 flex-col justify-between border-[#1E1E38] bg-[#111124] p-6 shadow-lg">
      <div>
        {/* Calendar Header with Exact Month Switcher */}
        <div className="mb-5 flex flex-col justify-between gap-3 border-b border-[#1E1E38] pb-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-base font-bold text-white">
              <CalendarIcon size={18} className="shrink-0 text-[#F0B429]" />
              <span className="truncate">Daily P&L Calendar</span>
            </div>
            <p className="mt-0.5 text-xs text-[#8080A0]">
              Net result & execution frequency matched to your logged trade
              dates
            </p>
          </div>

          {/* Month Switcher Controls */}
          <div className="flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-1 sm:self-auto">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="rounded-lg p-1.5 text-[#A0A0C0] transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleToday}
              title="Jump to current month"
              className="whitespace-nowrap px-3 py-1 text-xs font-bold text-white transition-colors hover:text-[#F0B429]"
            >
              {monthName}
            </button>
            <button
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="rounded-lg p-1.5 text-[#A0A0C0] transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Day of Week Headers */}
        <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-[#8080A0] sm:gap-2">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>

        {/* Exact Month Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarCells.map((cell) => {
            if (cell.type === "empty") {
              return (
                <div
                  key={cell.key}
                  className="h-14 rounded-xl border border-transparent bg-white/[0.01] sm:h-16"
                />
              );
            }

            const isWin = cell.pnl > 0;
            const isLoss = cell.pnl < 0;

            return (
              <div
                key={cell.key}
                className={[
                  "relative flex h-14 min-w-0 flex-col items-center justify-between overflow-hidden rounded-xl border p-1.5 transition-all hover:border-white/40 sm:h-16",
                  isWin
                    ? "border-[#00D084]/40 bg-[#00D084]/15 text-[#00D084]"
                    : isLoss
                    ? "border-[#FF4565]/40 bg-[#FF4565]/15 text-[#FF4565]"
                    : "border-[#1E1E38] bg-[#161628] text-[#8080A0]",
                ].join(" ")}
                title={
                  cell.count > 0
                    ? `${cell.dateStr}: ${formatR(cell.pnl)} across ${
                        cell.count
                      } ${cell.count === 1 ? "trade" : "trades"}`
                    : `${cell.dateStr}: No trades`
                }
              >
                <span className="self-start text-[11px] font-medium opacity-70">
                  {cell.day}
                </span>
                {cell.count > 0 ? (
                  <div className="w-full pb-0.5 text-center">
                    <div className="truncate text-[11px] font-bold tabular-nums sm:text-sm">
                      {formatR(cell.pnl)}
                    </div>
                    <div className="hidden truncate text-[9px] font-normal opacity-75 sm:block">
                      {cell.count} {cell.count === 1 ? "trade" : "trades"}
                    </div>
                  </div>
                ) : (
                  <span className="pb-1 text-[11px] opacity-20">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month Summary Bar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#1E1E38] pt-3 text-xs text-[#A0A0C0]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="whitespace-nowrap font-semibold text-[#00D084]">
            ● {monthStats.winDays} Winning{" "}
            {monthStats.winDays === 1 ? "Day" : "Days"}
          </span>
          <span className="whitespace-nowrap font-semibold text-[#FF4565]">
            ● {monthStats.lossDays} Losing{" "}
            {monthStats.lossDays === 1 ? "Day" : "Days"}
          </span>
        </div>
        <div className="whitespace-nowrap font-semibold text-white">
          Monthly Total:{" "}
          <span
            className={
              monthStats.totalMonthR >= 0 ? "text-[#00D084]" : "text-[#FF4565]"
            }
          >
            {formatR(monthStats.totalMonthR)}
          </span>{" "}
          ({monthStats.totalMonthTrades}{" "}
          {monthStats.totalMonthTrades === 1 ? "trade" : "trades"})
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
   CLEAN HUMAN-DESIGNED EDGE SCORE CARD
   ============================================================ */
function RedesignedEdgeScoreCard({
  score,
  grade,
  gradeColor,
  stats,
  bestSetup,
  worstSetup,
  dollarProfit,
}: {
  score: number;
  grade: string;
  gradeColor: string;
  stats: ReturnType<typeof calcStats>;
  bestSetup: string;
  worstSetup: string;
  dollarProfit: number;
}) {
  return (
    <Card className="relative flex min-w-0 flex-col justify-between overflow-hidden border-[#1E1E38] bg-[#111124] p-6 shadow-lg">
      <div>
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#1E1E38] pb-3">
          <span className="truncate text-xs font-bold uppercase tracking-wider text-[#A0A0C0]">
            Performance Quality Rating
          </span>
          <span
            className="shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold"
            style={{
              color: gradeColor,
              borderColor: `${gradeColor}40`,
              backgroundColor: `${gradeColor}15`,
            }}
          >
            Grade {grade}
          </span>
        </div>

        <div className="mb-6 flex items-center gap-5">
          <div className="relative grid h-20 w-20 shrink-0 place-items-center">
            <svg className="absolute inset-0" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#1E1E38"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={gradeColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 50}
                strokeDashoffset={2 * Math.PI * 50 * (1 - score / 100)}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div
              className="text-2xl font-bold tabular-nums"
              style={{ color: gradeColor }}
            >
              {Math.round(score)}
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white">
              {edgeVerdict(score)}
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#8080A0]">
              Rating computed directly from win rate, profit factor, R
              expectancy, and execution consistency.
            </p>
          </div>
        </div>
      </div>

      {/* Clean Spacious 4-Card Breakdown */}
      <div className="grid grid-cols-2 gap-3 border-t border-[#1E1E38] pt-4">
        <div className="min-w-0 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3.5">
          <div className="text-xs font-semibold text-[#8080A0]">Best Setup</div>
          <div
            className="mt-1 truncate text-sm font-bold text-[#00D084]"
            title={bestSetup}
          >
            {bestSetup}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3.5">
          <div className="text-xs font-semibold text-[#8080A0]">
            Weakest Setup
          </div>
          <div
            className="mt-1 truncate text-sm font-bold text-[#FF4565]"
            title={worstSetup}
          >
            {worstSetup}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3.5">
          <div className="text-xs font-semibold text-[#8080A0]">Net P&L</div>
          <div
            className={`mt-1 truncate text-sm font-bold tabular-nums ${
              dollarProfit >= 0 ? "text-[#00D084]" : "text-[#FF4565]"
            }`}
          >
            {dollarProfit >= 0 ? "+" : "-"}$
            {Math.abs(dollarProfit).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3.5">
          <div className="text-xs font-semibold text-[#8080A0]">
            Sample Size
          </div>
          <div className="mt-1 truncate text-sm font-bold tabular-nums text-white">
            {stats.count} closed
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
   CLEAN INSTITUTIONAL INTERACTIVE EQUITY CHART
   ============================================================ */
function InstitutionalInteractiveEquityChart({ data }: { data: number[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const min = Math.min(0, ...data);
  const max = Math.max(0, ...data);
  const range = max - min || 1;

  const pointsList = useMemo(() => {
    return data.map((val, idx) => {
      const pctX = data.length === 1 ? 50 : (idx / (data.length - 1)) * 100;
      const pctY = 100 - ((val - min) / range) * 100;
      return { pctX, pctY, val, idx };
    });
  }, [data, min, range]);

  const polylineStr = pointsList.map((p) => `${p.pctX},${p.pctY}`).join(" ");
  const areaStr = `0,100 ${polylineStr} 100,100`;
  const finalVal = data[data.length - 1] || 0;
  const color = finalVal >= 0 ? "#00D084" : "#FF4565";

  const activePoint = useMemo(() => {
    if (hoverX === null || pointsList.length === 0) return null;
    let closest = pointsList[0];
    let minDiff = Math.abs(hoverX - closest.pctX);
    for (const p of pointsList) {
      const diff = Math.abs(hoverX - p.pctX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }
    return closest;
  }, [hoverX, pointsList]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const pct = (mouseX / rect.width) * 100;
    setHoverX(pct);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-crosshair select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverX(null)}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
      >
        <defs>
          <linearGradient id="instEqFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <line
          x1="0"
          y1="25"
          x2="100"
          y2="25"
          stroke="#1E1E38"
          strokeWidth="0.5"
          strokeDasharray="2"
        />
        <line
          x1="0"
          y1="50"
          x2="100"
          y2="50"
          stroke="#1E1E38"
          strokeWidth="0.5"
          strokeDasharray="2"
        />
        <line
          x1="0"
          y1="75"
          x2="100"
          y2="75"
          stroke="#1E1E38"
          strokeWidth="0.5"
          strokeDasharray="2"
        />

        <polygon points={areaStr} fill="url(#instEqFill)" />

        <polyline
          points={polylineStr}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {activePoint ? (
          <>
            <line
              x1={activePoint.pctX}
              y1="0"
              x2={activePoint.pctX}
              y2="100"
              stroke="#F0B429"
              strokeWidth="1.2"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={activePoint.pctX}
              cy={activePoint.pctY}
              r="3.5"
              fill="#FFFFFF"
              stroke="#F0B429"
              strokeWidth="1.8"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : (
          <circle
            cx={pointsList[pointsList.length - 1]?.pctX || 100}
            cy={pointsList[pointsList.length - 1]?.pctY || 50}
            r="3"
            fill={color}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {activePoint && (
        <div
          className="pointer-events-none absolute top-2 z-30 rounded-xl border border-white/20 bg-[#0D0D1A]/95 px-3.5 py-2 shadow-xl backdrop-blur-md transition-all duration-75"
          style={{
            left: `${Math.min(72, Math.max(2, activePoint.pctX - 18))}%`,
          }}
        >
          <div className="mb-1 flex items-center justify-between gap-4 border-b border-white/10 pb-1">
            <span className="whitespace-nowrap text-xs font-semibold text-[#F0B429]">
              Trade #{activePoint.idx + 1}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap text-xs text-[#A0A0C0]">
              Net Return:
            </span>
            <span
              className={`whitespace-nowrap text-xs font-bold tabular-nums ${
                activePoint.val >= 0 ? "text-[#00D084]" : "text-[#FF4565]"
              }`}
            >
              {formatR(activePoint.val)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardFilters({
  accountNames,
  strategyNames,
  accountFilter,
  strategyFilter,
  timeRange,
  totalTrades,
  filteredTrades,
  onAccountChange,
  onStrategyChange,
  onTimeRangeChange,
  onClear,
}: {
  accountNames: string[];
  strategyNames: string[];
  accountFilter: string;
  strategyFilter: string;
  timeRange: TimeRange;
  totalTrades: number;
  filteredTrades: number;
  onAccountChange: (v: string) => void;
  onStrategyChange: (v: string) => void;
  onTimeRangeChange: (v: TimeRange) => void;
  onClear: () => void;
}) {
  const active = accountFilter || strategyFilter || timeRange !== "all";

  return (
    <Card className="border-[#1E1E38] p-4 shadow-md">
      <div className="grid min-w-0 gap-3 md:grid-cols-3">
        <FilterSelect
          label="Account"
          value={accountFilter}
          onChange={onAccountChange}
          options={accountNames}
          allLabel="All Accounts"
        />

        <FilterSelect
          label="Strategy"
          value={strategyFilter}
          onChange={onStrategyChange}
          options={strategyNames}
          allLabel="All Strategies"
        />

        <div className="min-w-0">
          <label className="text-xs font-semibold text-[#8080A0]">
            Time Range
          </label>
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value as TimeRange)}
            className="mt-1.5 w-full cursor-pointer appearance-none truncate rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-2.5 text-sm font-semibold text-white outline-none transition-colors focus:border-[#F0B429]"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-[#1E1E38]/60 pt-3 text-xs text-[#8080A0]">
        <span className="min-w-0 truncate">
          Showing <strong className="text-white">{filteredTrades}</strong> of{" "}
          {totalTrades} trades
        </span>

        {active && (
          <button
            onClick={onClear}
            className="shrink-0 whitespace-nowrap font-bold text-[#F0B429] hover:underline"
          >
            Clear filters ×
          </button>
        )}
      </div>
    </Card>
  );
}

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
        className="mt-1.5 w-full cursor-pointer appearance-none truncate rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-2.5 text-sm font-semibold text-white outline-none transition-colors focus:border-[#F0B429]"
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

function MetricCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "green" | "red" | "gold";
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

function RiskDesk({
  maxDD,
  streak,
  openTrades,
  expectancy,
  profitFactor,
}: {
  maxDD: number;
  streak: number;
  openTrades: number;
  expectancy: number;
  profitFactor: number;
}) {
  const riskLevel =
    maxDD >= 6 || expectancy < 0 || profitFactor < 1
      ? "High"
      : maxDD >= 3
      ? "Moderate"
      : "Controlled";

  const color =
    riskLevel === "High"
      ? "#FF4565"
      : riskLevel === "Moderate"
      ? "#F0B429"
      : "#00D084";

  return (
    <Card className="flex min-w-0 flex-col justify-between border-[#1E1E38] p-6 shadow-lg">
      <div>
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#1E1E38] pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-base font-bold text-white">
              <Shield size={18} className="shrink-0 text-[#F0B429]" />
              <span className="truncate">Risk Desk</span>
            </div>
            <div className="mt-1 text-xs text-[#8080A0]">
              Account drawdown monitor
            </div>
          </div>

          <div
            className="shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold shadow-inner"
            style={{
              color,
              borderColor: `${color}40`,
              background: `${color}18`,
            }}
          >
            {riskLevel}
          </div>
        </div>

        <div className="space-y-3.5">
          <RiskRow
            label="Max Trailing Drawdown"
            value={`-${maxDD.toFixed(2)}R`}
            color="#FF4565"
          />
          <RiskRow
            label="Current Win/Loss Streak"
            value={
              streak > 0
                ? `+${streak}W`
                : streak < 0
                ? `${Math.abs(streak)}L`
                : "—"
            }
            color={streak >= 0 ? "#00D084" : "#FF4565"}
          />
          <RiskRow
            label="Active Open Positions"
            value={`${openTrades}`}
            color="#4C82FB"
          />
          <RiskRow
            label="Expectancy per Trade"
            value={formatR(expectancy)}
            color={expectancy >= 0 ? "#00D084" : "#FF4565"}
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#F0B429]" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-white">Risk Note</div>
            <div className="mt-1 text-xs leading-5 text-[#A0A0C0]">
              {riskMessage(riskLevel)}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function DirectionAllocation({
  longR,
  shortR,
  longCount,
  shortCount,
  longWR,
  shortWR,
}: {
  longR: number;
  shortR: number;
  longCount: number;
  shortCount: number;
  longWR: number;
  shortWR: number;
}) {
  const total = Math.abs(longR) + Math.abs(shortR) || 1;
  const longPct = Math.max(8, (Math.abs(longR) / total) * 100);
  const shortPct = Math.max(8, (Math.abs(shortR) / total) * 100);

  return (
    <Card className="min-w-0 border-[#1E1E38] p-6">
      <div className="mb-5 flex items-center gap-2 border-b border-[#1E1E38] pb-3 text-base font-bold text-white">
        <Flame size={18} className="shrink-0 text-[#F0B429]" />
        <span className="truncate">Direction Breakdown</span>
      </div>

      <div className="space-y-5">
        <DirectionBar
          label="LONG"
          value={longR}
          count={longCount}
          winRate={longWR}
          width={longPct}
          color="#00D084"
        />
        <DirectionBar
          label="SHORT"
          value={shortR}
          count={shortCount}
          winRate={shortWR}
          width={shortPct}
          color="#FF4565"
        />
      </div>
    </Card>
  );
}

function SetupIntelligence({
  best,
  worst,
}: {
  best?: SetupPerformance;
  worst?: SetupPerformance;
}) {
  return (
    <Card className="min-w-0 border-[#1E1E38] p-6">
      <div className="mb-5 flex items-center gap-2 border-b border-[#1E1E38] pb-3 text-base font-bold text-white">
        <Brain size={18} className="shrink-0 text-[#F0B429]" />
        <span className="truncate">Edge Allocation</span>
      </div>

      <div className="space-y-3.5">
        <InsightBlock
          icon={<ArrowUpRight size={18} />}
          label="Size focus"
          title={best?.name || "No setup yet"}
          text={
            best
              ? `${best.totalR >= 0 ? "+" : ""}${best.totalR.toFixed(
                  2
                )}R across ${best.count} ${
                  best.count === 1 ? "trade" : "trades"
                }. This is your most profitable setup.`
              : "Log setups to see where your edge is concentrated."
          }
          tone="green"
        />

        <InsightBlock
          icon={<ArrowDownRight size={18} />}
          label="Review required"
          title={worst?.name || "No leak yet"}
          text={
            worst
              ? `${worst.totalR >= 0 ? "+" : ""}${worst.totalR.toFixed(
                  2
                )}R across ${worst.count} ${
                  worst.count === 1 ? "trade" : "trades"
                }. Check execution criteria before sizing up.`
              : "No underperforming setup detected yet."
          }
          tone="red"
        />
      </div>
    </Card>
  );
}

function NextActionCard({
  stats,
  bestSetup,
  worstSetup,
  openTrades,
}: {
  stats: ReturnType<typeof calcStats>;
  bestSetup?: SetupPerformance;
  worstSetup?: SetupPerformance;
  openTrades: number;
}) {
  const action = getNextAction(stats, bestSetup, worstSetup, openTrades);

  return (
    <Card className="min-w-0 border-[#1E1E38] p-6">
      <div className="mb-5 flex items-center gap-2 border-b border-[#1E1E38] pb-3 text-base font-bold text-white">
        <Target size={18} className="shrink-0 text-[#F0B429]" />
        <span className="truncate">Next Step Guidance</span>
      </div>

      <div className="rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-4">
        <div className="text-xs font-semibold uppercase text-[#F0B429]">
          Recommendation
        </div>
        <div className="mt-1.5 break-words text-base font-bold text-white">
          {action.title}
        </div>
        <p className="mt-2 text-xs leading-5 text-[#A0A0C0] sm:text-sm">
          {action.text}
        </p>
      </div>
    </Card>
  );
}

function SetupRow({ row }: { row: SetupPerformance }) {
  const positive = row.totalR >= 0;

  return (
    <div className="min-w-0 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3.5 transition-colors hover:border-white/20">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-white" title={row.name}>
            {row.name}
          </div>
          <div className="mt-1 truncate text-xs text-[#8080A0]">
            {row.count} {row.count === 1 ? "trade" : "trades"} ·{" "}
            {formatPct(row.winRate)} WR
          </div>
        </div>

        <div
          className={[
            "shrink-0 whitespace-nowrap text-sm font-bold tabular-nums",
            positive ? "text-[#00D084]" : "text-[#FF4565]",
          ].join(" ")}
        >
          {formatR(row.totalR)}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#1E1E38]">
        <div
          className={positive ? "h-full bg-[#00D084]" : "h-full bg-[#FF4565]"}
          style={{
            width: `${Math.min(100, Math.max(8, Math.abs(row.totalR) * 12))}%`,
          }}
        />
      </div>
    </div>
  );
}

function RecentTradeRow({ trade }: { trade: Trade }) {
  const isOpen = !hasResult(trade);
  const result = Number(trade.result || 0);
  const positive = result >= 0;

  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3.5 transition-colors hover:border-white/20">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div
            className={[
              "shrink-0 rounded px-2 py-0.5 text-[10px] font-bold",
              trade.direction === "LONG"
                ? "bg-[#00D084]/15 text-[#00D084]"
                : "bg-[#FF4565]/15 text-[#FF4565]",
            ].join(" ")}
          >
            {trade.direction}
          </div>
          <div
            className="truncate text-sm font-bold text-white"
            title={trade.instrument}
          >
            {trade.instrument}
          </div>
        </div>

        <div className="mt-1 truncate text-xs text-[#8080A0]">
          {trade.date} · {trade.setup || "No strategy"} ·{" "}
          {trade.account || "No account"}
        </div>
      </div>

      <div
        className={[
          "shrink-0 whitespace-nowrap text-sm font-bold tabular-nums",
          isOpen
            ? "text-[#4C82FB]"
            : positive
            ? "text-[#00D084]"
            : "text-[#FF4565]",
        ].join(" ")}
      >
        {isOpen ? "OPEN" : formatR(result)}
      </div>
    </div>
  );
}

function RiskRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3">
      <span className="min-w-0 truncate text-xs font-semibold text-[#A0A0C0]">
        {label}
      </span>
      <span
        className="shrink-0 whitespace-nowrap text-sm font-bold tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

function DirectionBar({
  label,
  value,
  count,
  winRate,
  width,
  color,
}: {
  label: string;
  value: number;
  count: number;
  winRate: number;
  width: number;
  color: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div className="text-xs font-bold text-white">{label}</div>
        <div
          className="shrink-0 whitespace-nowrap text-xs font-bold tabular-nums"
          style={{ color }}
        >
          {formatR(value)}
        </div>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-[#1E1E38]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${width}%`, background: color }}
        />
      </div>

      <div className="mt-1.5 truncate text-xs text-[#8080A0]">
        {count} {count === 1 ? "trade" : "trades"} ·{" "}
        {count ? formatPct(winRate) : "—"} WR
      </div>
    </div>
  );
}

function InsightBlock({
  icon,
  label,
  title,
  text,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  text: string;
  tone: "green" | "red";
}) {
  const color = tone === "green" ? "#00D084" : "#FF4565";

  return (
    <div className="min-w-0 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0" style={{ color }}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8080A0]">
            {label}
          </div>
          <div className="mt-1 truncate text-sm font-bold text-white" title={title}>
            {title}
          </div>
          <div className="mt-1 text-xs leading-5 text-[#A0A0C0]">{text}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyMini({ message }: { message: string }) {
  return (
    <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-[#1E1E38] bg-[#0D0D1A] p-6 text-center text-sm text-[#8080A0]">
      {message}
    </div>
  );
}

type SetupPerformance = {
  name: string;
  count: number;
  wins: number;
  totalR: number;
  winRate: number;
};

function getSetupPerformance(trades: Trade[]): SetupPerformance[] {
  const map = new Map<string, SetupPerformance>();

  for (const trade of trades) {
    if (!trade.setup || !hasResult(trade)) continue;

    const existing =
      map.get(trade.setup) ||
      ({
        name: trade.setup,
        count: 0,
        wins: 0,
        totalR: 0,
        winRate: 0,
      } satisfies SetupPerformance);

    existing.count += 1;
    existing.totalR += Number(trade.result || 0);
    if (Number(trade.result || 0) > 0) existing.wins += 1;
    existing.winRate = existing.count ? existing.wins / existing.count : 0;

    map.set(trade.setup, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.totalR - a.totalR);
}

function hasResult(trade: Trade) {
  return (
    trade.result !== "" &&
    trade.result !== null &&
    trade.result !== undefined &&
    Number.isFinite(Number(trade.result))
  );
}

function withinTimeRange(trade: Trade, range: TimeRange) {
  if (range === "all") return true;
  if (!trade.date) return false;

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return new Date(`${trade.date}T12:00:00`) >= cutoff;
}

function calculateEdgeScore(
  count: number,
  winRate: number,
  expectancy: number,
  profitFactor: number
) {
  let score = 0;

  score += Math.min(35, Math.max(0, ((profitFactor - 0.7) / 1.8) * 35));
  score += Math.min(30, Math.max(0, ((expectancy + 0.25) / 1.25) * 30));
  score += Math.min(20, Math.max(0, (winRate / 0.55) * 20));
  score += Math.min(15, Math.max(0, (count / 100) * 15));

  return Math.max(0, Math.min(100, score));
}

function getGrade(score: number) {
  if (score >= 88) return "S";
  if (score >= 75) return "A";
  if (score >= 62) return "B";
  if (score >= 48) return "C";
  if (score >= 32) return "D";
  return "E";
}

function getGradeColor(score: number) {
  if (score >= 75) return "#00D084";
  if (score >= 48) return "#F0B429";
  return "#FF4565";
}

function edgeVerdict(score: number) {
  if (score >= 88) return "Strong consistency detected.";
  if (score >= 75) return "Positive edge forming.";
  if (score >= 62) return "Profitable execution.";
  if (score >= 48) return "Break-even zone.";
  if (score >= 32) return "Inconsistent performance.";
  return "Review rules required.";
}

function riskMessage(level: string) {
  if (level === "High") {
    return "Consider reducing position size by 50% until drawdown stabilizes.";
  }

  if (level === "Moderate") {
    return "Drawdown is within normal limits. Stick strictly to your daily loss cap.";
  }

  return "Risk metrics are healthy. Focus on executing your highest expectancy setups.";
}

function getNextAction(
  stats: ReturnType<typeof calcStats>,
  best?: SetupPerformance,
  worst?: SetupPerformance,
  openTrades?: number
) {
  if (!stats.count) {
    return {
      title: "Log 10 completed trades.",
      text: "Record date, setup, instrument, and profit/loss to generate your statistical performance profile.",
    };
  }

  if (openTrades && openTrades >= 3) {
    return {
      title: "Manage open exposure.",
      text: "You have multiple active positions. Ensure stops are set before entering new setups.",
    };
  }

  if (stats.expectancy < 0) {
    return {
      title: "Pause your weakest strategy.",
      text: worst
        ? `${worst.name} has negative expectancy. Review execution criteria before sizing this strategy.`
        : "Expectancy is negative. Review entry criteria before increasing position size.",
    };
  }

  if (stats.profitFactor < 1.2) {
    return {
      title: "Be more selective.",
      text: "Profit factor is thin. Focus exclusively on high-probability setups for your next sequence of trades.",
    };
  }

  return {
    title: best ? `Stick to ${best.name}.` : "Maintain your execution process.",
    text: best
      ? `${best.name} is currently your most profitable setup. Continue trading it with consistent sizing.`
      : "Your metrics show steady consistency. Maintain disciplined risk management.",
  };
}
