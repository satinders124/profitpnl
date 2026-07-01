"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
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
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type TimeRange = "all" | "7d" | "30d" | "90d";

export default function DashboardPage() {
  const { user } = useAuth();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [playbook, setPlaybook] = useState<PlaybookSetup[]>([]);
  const [loading, setLoading] = useState(true);

  const [accountFilter, setAccountFilter] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);

      try {
        const [tradeRows, accountRows, playbookRows] = await Promise.all([
          getTrades(user!.uid),
          getAccounts(user!.uid),
          getPlaybook(user!.uid),
        ]);

        setTrades(tradeRows);
        setAccounts(accountRows);
        setPlaybook(playbookRows);
      } finally {
        setLoading(false);
      }
    }

    load();
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

  const closed = useMemo(() => {
    return filteredTrades.filter((t) => hasResult(t));
  }, [filteredTrades]);

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
    return calculateEdgeScore(stats.count, stats.winRate, stats.expectancy, stats.profitFactor);
  }, [stats.count, stats.winRate, stats.expectancy, stats.profitFactor]);

  const grade = getGrade(edgeScore);
  const gradeColor = getGradeColor(edgeScore);

  const setupRows = useMemo(() => getSetupPerformance(filteredTrades), [filteredTrades]);

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
      actionLabel="Log Trade"
      onAction={() => alert("Trade form coming next")}
    >
      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center text-sm text-[#5A5A80]">
          Loading your trading command center…
        </div>
      ) : (
        <div className="space-y-5">
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

          <section className="grid gap-4 xl:grid-cols-[1.2fr_1.8fr]">
            <EdgeScoreCard
              score={edgeScore}
              grade={grade}
              gradeColor={gradeColor}
              stats={stats}
              bestSetup={bestSetup?.name || "—"}
              dollarProfit={dollarProfit}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={<Trophy size={18} />}
                label="Net Profit"
                value={`${dollarProfit >= 0 ? "+" : "-"}$${Math.abs(
                  dollarProfit
                ).toFixed(2)}`}
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
                value={stats.profitFactor >= 99 ? "∞" : stats.profitFactor.toFixed(2)}
                sub={stats.profitFactor >= 1.5 ? "strong edge" : "needs work"}
                tone={stats.profitFactor >= 1 ? "green" : "red"}
              />
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
            <Card className="overflow-hidden p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-black">
                    <LineChart size={17} className="text-[#F0B429]" />
                    Equity Curve
                  </div>
                  <div className="mt-1 text-xs text-[#5A5A80]">
                    {stats.count} closed trades · {timeRangeLabel(timeRange)}
                  </div>
                </div>

                <div
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-black",
                    stats.totalR >= 0
                      ? "border-[#00D084]/20 bg-[#00D084]/10 text-[#00D084]"
                      : "border-[#FF4565]/20 bg-[#FF4565]/10 text-[#FF4565]",
                  ].join(" ")}
                >
                  {formatR(stats.totalR)}
                </div>
              </div>

              <div className="h-72 rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] p-4">
                {curve.length ? (
                  <PremiumEquityChart data={curve} />
                ) : (
                  <EmptyMini message="Log closed trades to generate your equity curve." />
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

          <section className="grid gap-4 xl:grid-cols-3">
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

          <section className="grid gap-4 xl:grid-cols-[1.2fr_1.8fr]">
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-black">
                <Crosshair size={17} className="text-[#F0B429]" />
                Strategy Board
              </div>

              {setupRows.length ? (
                <div className="space-y-3">
                  {setupRows.slice(0, 5).map((row) => (
                    <SetupRow key={row.name} row={row} />
                  ))}
                </div>
              ) : (
                <EmptyMini message="Add setups in Playbook or log strategies on trades." />
              )}
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-black">Execution Feed</div>
                  <div className="mt-1 text-xs text-[#5A5A80]">
                    Latest trades matching filters
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
                <EmptyMini message="No trades match this view." />
              )}
            </Card>
          </section>
        </div>
      )}
    </AppShell>
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
    <Card className="p-4">
      <div className="grid gap-3 md:grid-cols-3">
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

        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">
            Range
          </label>
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value as TimeRange)}
            className="mt-2 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 text-sm font-bold outline-none focus:border-[#F0B429]"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-[#5A5A80]">
        <span>
          Showing {filteredTrades} of {totalTrades} trades
        </span>

        {active && (
          <button onClick={onClear} className="font-black text-[#F0B429]">
            Clear filters
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
    <div>
      <label className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 text-sm font-bold outline-none focus:border-[#F0B429]"
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

function EdgeScoreCard({
  score,
  grade,
  gradeColor,
  stats,
  bestSetup,
  dollarProfit,
}: {
  score: number;
  grade: string;
  gradeColor: string;
  stats: ReturnType<typeof calcStats>;
  bestSetup: string;
  dollarProfit: number;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#F0B429]/10 blur-2xl" />
      <div className="relative flex items-center gap-5">
        <div className="relative grid h-28 w-28 shrink-0 place-items-center">
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
          <div className="text-center">
            <div className="text-5xl font-black" style={{ color: gradeColor }}>
              {grade}
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest text-[#5A5A80]">
              Edge
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F0B429]">
            <Sparkles size={14} />
            Edge Intelligence
          </div>

          <h2 className="mt-2 text-2xl font-black tracking-[-0.06em]">
            {edgeVerdict(score)}
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#A0A0C0]">
            Score{" "}
            <span className="font-black" style={{ color: gradeColor }}>
              {Math.round(score)}/100
            </span>{" "}
            based on profit factor, expectancy, win rate and sample size.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <MiniFact label="Best Setup" value={bestSetup} />
            <MiniFact
              label="Net P&L"
              value={`${dollarProfit >= 0 ? "+" : "-"}$${Math.abs(
                dollarProfit
              ).toFixed(0)}`}
            />
            <MiniFact label="Trades" value={`${stats.count} closed`} />
            <MiniFact label="Max DD" value={`-${stats.maxDD.toFixed(2)}R`} />
          </div>
        </div>
      </div>
    </Card>
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
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">
          {label}
        </div>
        <div style={{ color }}>{icon}</div>
      </div>

      <div
        className="mt-4 text-3xl font-black tracking-[-0.06em]"
        style={{ color }}
      >
        {value}
      </div>

      <div className="mt-1 text-xs font-semibold text-[#5A5A80]">{sub}</div>
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
    <Card className="p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black">
            <Shield size={17} className="text-[#F0B429]" />
            Prop Risk Desk
          </div>
          <div className="mt-1 text-xs text-[#5A5A80]">
            Drawdown and survival monitor
          </div>
        </div>

        <div
          className="rounded-full border px-3 py-1 text-xs font-black"
          style={{
            color,
            borderColor: `${color}33`,
            background: `${color}18`,
          }}
        >
          {riskLevel}
        </div>
      </div>

      <div className="space-y-3">
        <RiskRow label="Max Drawdown" value={`-${maxDD.toFixed(2)}R`} color="#FF4565" />
        <RiskRow
          label="Current Streak"
          value={streak > 0 ? `+${streak}W` : streak < 0 ? `${Math.abs(streak)}L` : "—"}
          color={streak >= 0 ? "#00D084" : "#FF4565"}
        />
        <RiskRow label="Open Trades" value={`${openTrades}`} color="#4C82FB" />
        <RiskRow label="Expectancy" value={formatR(expectancy)} color={expectancy >= 0 ? "#00D084" : "#FF4565"} />
      </div>

      <div className="mt-5 rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#F0B429]" />
          <div>
            <div className="text-sm font-black">Risk Note</div>
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
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-black">
        <Flame size={17} className="text-[#F0B429]" />
        Direction Allocation
      </div>

      <div className="space-y-4">
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
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-black">
        <Brain size={17} className="text-[#F0B429]" />
        Edge Allocation
      </div>

      <div className="space-y-3">
        <InsightBlock
          icon={<ArrowUpRight size={18} />}
          label="Size focus"
          title={best?.name || "No setup yet"}
          text={
            best
              ? `${best.totalR >= 0 ? "+" : ""}${best.totalR.toFixed(
                  2
                )}R across ${best.count} trades. This is where your edge currently lives.`
              : "Log setups to discover where your edge lives."
          }
          tone="green"
        />

        <InsightBlock
          icon={<ArrowDownRight size={18} />}
          label="Reduce / review"
          title={worst?.name || "No leak yet"}
          text={
            worst
              ? `${worst.totalR >= 0 ? "+" : ""}${worst.totalR.toFixed(
                  2
                )}R across ${worst.count} trades. Review rules before sizing this.`
              : "No weak setup detected yet."
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
    <Card className="relative overflow-hidden p-5">
      <div className="absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-[#A855F7]/10 blur-2xl" />

      <div className="relative">
        <div className="mb-4 flex items-center gap-2 text-sm font-black">
          <Sparkles size={17} className="text-[#F0B429]" />
          Next Best Action
        </div>

        <div className="rounded-2xl border border-[#F0B429]/20 bg-[#F0B429]/10 p-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#F0B429]">
            Before next trade
          </div>
          <div className="mt-2 text-lg font-black tracking-[-0.04em]">
            {action.title}
          </div>
          <p className="mt-2 text-sm leading-6 text-[#A0A0C0]">{action.text}</p>
        </div>
      </div>
    </Card>
  );
}

function SetupRow({ row }: { row: SetupPerformance }) {
  const positive = row.totalR >= 0;

  return (
    <div className="rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-black">{row.name}</div>
          <div className="mt-1 text-xs text-[#5A5A80]">
            {row.count} trades · {formatPct(row.winRate)} WR
          </div>
        </div>

        <div
          className={[
            "text-sm font-black",
            positive ? "text-[#00D084]" : "text-[#FF4565]",
          ].join(" ")}
        >
          {formatR(row.totalR)}
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#1E1E38]">
        <div
          className={positive ? "h-full bg-[#00D084]" : "h-full bg-[#FF4565]"}
          style={{ width: `${Math.min(100, Math.max(8, Math.abs(row.totalR) * 12))}%` }}
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div
            className={[
              "rounded-full px-2 py-0.5 text-[10px] font-black",
              trade.direction === "LONG"
                ? "bg-[#00D084]/10 text-[#00D084]"
                : "bg-[#FF4565]/10 text-[#FF4565]",
            ].join(" ")}
          >
            {trade.direction}
          </div>
          <div className="truncate text-sm font-black">{trade.instrument}</div>
        </div>

        <div className="mt-1 truncate text-xs text-[#5A5A80]">
          {trade.date} · {trade.setup || "No strategy"} ·{" "}
          {trade.account || "No account"}
        </div>
      </div>

      <div
        className={[
          "text-sm font-black",
          isOpen ? "text-[#4C82FB]" : positive ? "text-[#00D084]" : "text-[#FF4565]",
        ].join(" ")}
      >
        {isOpen ? "OPEN" : formatR(result)}
      </div>
    </div>
  );
}

function PremiumEquityChart({ data }: { data: number[] }) {
  const min = Math.min(0, ...data);
  const max = Math.max(0, ...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,100 ${points} 100,100`;
  const final = data[data.length - 1] || 0;
  const color = final >= 0 ? "#00D084" : "#FF4565";

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id="equityFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <polygon points={areaPoints} fill="url(#equityFill)" />

      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3">
      <div className="text-[9px] font-black uppercase tracking-widest text-[#5A5A80]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-black">{value}</div>
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
    <div className="flex items-center justify-between rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3">
      <span className="text-xs font-bold text-[#A0A0C0]">{label}</span>
      <span className="text-sm font-black" style={{ color }}>
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
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-black">{label}</div>
        <div className="text-xs font-black" style={{ color }}>
          {formatR(value)}
        </div>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-[#1E1E38]">
        <div
          className="h-full rounded-full"
          style={{ width: `${width}%`, background: color }}
        />
      </div>

      <div className="mt-2 text-xs text-[#5A5A80]">
        {count} trades · {count ? formatPct(winRate) : "—"} WR
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
    <div className="rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] p-4">
      <div className="flex items-start gap-3">
        <div style={{ color }}>{icon}</div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-[#5A5A80]">
            {label}
          </div>
          <div className="mt-1 text-sm font-black">{title}</div>
          <div className="mt-1 text-xs leading-5 text-[#A0A0C0]">{text}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyMini({ message }: { message: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-[#1E1E38] bg-[#0D0D1A] p-6 text-center text-sm text-[#5A5A80]">
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

function timeRangeLabel(range: TimeRange) {
  if (range === "7d") return "Last 7 days";
  if (range === "30d") return "Last 30 days";
  if (range === "90d") return "Last 90 days";
  return "All time";
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
  if (score >= 88) return "Elite edge detected.";
  if (score >= 75) return "Strong edge forming.";
  if (score >= 62) return "Profitable but not optimized.";
  if (score >= 48) return "Break-even zone.";
  if (score >= 32) return "Edge is unstable.";
  return "Needs immediate review.";
}

function riskMessage(level: string) {
  if (level === "High") {
    return "Your current metrics suggest account protection should come before scaling. Reduce size and isolate the leak.";
  }

  if (level === "Moderate") {
    return "Risk is manageable, but one bad sequence could damage progress. Keep size controlled and follow daily limits.";
  }

  return "Risk is currently controlled. Focus on repeating your highest expectancy setup without adding noise.";
}

function getNextAction(
  stats: ReturnType<typeof calcStats>,
  best?: SetupPerformance,
  worst?: SetupPerformance,
  openTrades?: number
) {
  if (!stats.count) {
    return {
      title: "Log 10 clean trades.",
      text: "Your dashboard needs a minimum sample before it can identify real edge. Log date, setup, account, emotion and R result on every trade.",
    };
  }

  if (openTrades && openTrades >= 3) {
    return {
      title: "Reduce open exposure.",
      text: "You have multiple open trades. Before adding new risk, manage existing positions and confirm total exposure is inside your rules.",
    };
  }

  if (stats.expectancy < 0) {
    return {
      title: "Stop trading the weakest setup.",
      text: worst
        ? `${worst.name} is hurting expectancy. Pause it until you review screenshots, entry quality and invalidation rules.`
        : "Expectancy is negative. Pause new size increases until the main leak is identified.",
    };
  }

  if (stats.profitFactor < 1.2) {
    return {
      title: "Tighten trade selection.",
      text: "Profit factor is too thin. Take only A-grade setups for the next 10 trades and avoid marginal entries.",
    };
  }

  return {
    title: best ? `Focus on ${best.name}.` : "Repeat your best process.",
    text: best
      ? `${best.name} is currently your strongest edge. Trade it selectively, keep risk fixed, and do not strategy-hop after one loss.`
      : "Your stats are improving. Keep risk fixed and focus on consistency rather than adding more setups.",
  };
}