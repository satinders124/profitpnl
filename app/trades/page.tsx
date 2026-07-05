"use client";

import { AppShell } from "@/components/layout/AppShell";
import  Modal  from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { TradeForm } from "@/components/trades/TradeForm";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  deleteTrade,
  getAccounts,
  getPlaybook,
  getTrades,
} from "@/lib/db";
import {
  calcStats,
  formatPct,
  formatR,
  uniqueClean,
} from "@/lib/stats";
import { Trade } from "@/types/trade";
import { TradingAccount } from "@/types/account";
import { PlaybookSetup } from "@/types/playbook";
import {
  CheckCircle2,
  FileText,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Filter,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TradingViewChart } from "@/components/trades/TradingViewChart";

type ResultFilter = "" | "win" | "loss" | "open" | "needs-review";

export default function TradesPage() {
  const { user } = useAuth();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [playbook, setPlaybook] = useState<PlaybookSetup[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [modalTrade, setModalTrade] = useState<Trade | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedChartTrade, setSelectedChartTrade] = useState<Trade | null>(null);

  async function load() {
    if (!user) return;

    setLoading(true);

    try {
      const [tradeRows, accountRows, playbookRows] = await Promise.all([
        getTrades(user.id),
        getAccounts(user.id),
        getPlaybook(user.id),
      ]);

      setTrades(tradeRows);
      setAccounts(accountRows);
      setPlaybook(playbookRows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Data fetch on auth ready — standard client-side pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
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
    return trades
      .filter((trade) => {
        if (accountFilter && trade.account !== accountFilter) return false;
        if (strategyFilter && trade.setup !== strategyFilter) return false;
        if (directionFilter && trade.direction !== directionFilter) return false;

        if (resultFilter === "win" && !(Number(trade.result) > 0)) return false;
        if (resultFilter === "loss" && !(Number(trade.result) < 0)) return false;
        if (resultFilter === "open" && hasResult(trade)) return false;
        if (resultFilter === "needs-review" && trade.reviewed) return false;

        if (search) {
          const haystack = [
            trade.instrument,
            trade.setup,
            trade.session,
            trade.account,
            trade.notes,
            trade.tags,
            trade.emotion,
            trade.mistake,
            trade.lesson,
          ]
            .join(" ")
            .toLowerCase();

          if (!haystack.includes(search.toLowerCase())) return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.date || "").getTime() - new Date(a.date || "").getTime()
      );
  }, [
    trades,
    accountFilter,
    strategyFilter,
    directionFilter,
    resultFilter,
    search,
  ]);

  const stats = useMemo(() => calcStats(filteredTrades), [filteredTrades]);
  const openTrades = useMemo(
    () => filteredTrades.filter((t) => !hasResult(t)).length,
    [filteredTrades]
  );
  const reviewedCount = useMemo(
    () => filteredTrades.filter((t) => t.reviewed).length,
    [filteredTrades]
  );
  const avgExecution = useMemo(() => {
    const rated = filteredTrades.filter((t) => Number(t.executionRating) > 0);
    if (!rated.length) return 0;
    return (
      rated.reduce((sum, t) => sum + Number(t.executionRating || 0), 0) /
      rated.length
    );
  }, [filteredTrades]);

  const strategiesFromTrades = useMemo(
    () => uniqueClean(trades.map((t) => t.setup)),
    [trades]
  );

  function openNewTrade() {
    setModalTrade(null);
    setFormOpen(true);
  }

  function openEditTrade(trade: Trade) {
    setModalTrade(trade);
    setFormOpen(true);
  }

  async function handleDelete(tradeId: string) {
    if (!user) return;
    if (!confirm("Delete this trade? This cannot be undone.")) return;

    await deleteTrade(user.id, tradeId);
    await load();
  }

  function clearFilters() {
    setSearch("");
    setAccountFilter("");
    setStrategyFilter("");
    setDirectionFilter("");
    setResultFilter("");
  }

  const hasFilters =
    search || accountFilter || strategyFilter || directionFilter || resultFilter;

  return (
    <AppShell
      title="Trade Review Desk"
      subtitle={`${trades.length} total trades · ${reviewedCount} reviewed`}
      actionLabel="Log Trade"
      onAction={openNewTrade}
    >
      {loading ? (
        <div className="flex min-h-[360px] items-center justify-center text-sm text-[#5A5A80]">
          Loading review desk…
        </div>
      ) : (
        <div className="space-y-5">
          <ReviewHero
            stats={stats}
            reviewed={reviewedCount}
            total={filteredTrades.length}
            avgExecution={avgExecution}
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MiniStat
              label="Total R"
              value={formatR(stats.totalR)}
              sub={`${stats.count} closed trades`}
              tone={stats.totalR >= 0 ? "green" : "red"}
            />
            <MiniStat
              label="Win Rate"
              value={stats.count ? formatPct(stats.winRate) : "—"}
              sub={`${stats.wins}W / ${stats.losses}L`}
              tone="gold"
            />
            <MiniStat
              label="Execution"
              value={avgExecution ? `${avgExecution.toFixed(1)}/5` : "—"}
              sub="average rating"
              tone="blue"
            />
            <MiniStat
              label="Open"
              value={String(openTrades)}
              sub="pending trades"
              tone="blue"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MiniStat
              label="Profit Factor"
              value={stats.count ? stats.profitFactor.toFixed(2) : "—"}
              sub="gross win / gross loss"
              tone={stats.profitFactor >= 1 ? "green" : "red"}
              icon={Target}
            />
            <MiniStat
              label="Max Drawdown"
              value={stats.count ? `${stats.maxDD.toFixed(2)}R` : "—"}
              sub="peak-to-trough"
              tone="red"
              icon={Target}
            />
            <MiniStat
              label="Current Streak"
              value={stats.count ? formatStreak(stats.streak) : "—"}
              sub={
                stats.streak > 0
                  ? "winning streak"
                  : stats.streak < 0
                    ? "losing streak"
                    : "no streak yet"
              }
              tone={
                stats.streak > 0
                  ? "green"
                  : stats.streak < 0
                    ? "red"
                    : "purple"
              }
              icon={Sparkles}
            />
            <MiniStat
              label="Best Setup"
              value={stats.bestSetup}
              sub="highest total R"
              tone="purple"
              icon={Star}
            />
          </div>

          {/* --- SLEEK QUICK FILTER HUD --- */}
          {selectedChartTrade && (
            <Card className="p-4 relative border border-[#F0B429]/30 bg-[#0D0D1A] overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F0B429] animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[#F0B429]">
                    Interactive Live Chart — {selectedChartTrade.instrument}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedChartTrade(null)}
                  className="text-xs font-bold text-zinc-400 hover:text-white transition"
                >
                  Close Chart ×
                </button>
              </div>
              <div className="rounded-xl overflow-hidden border border-[#24243C]">
                <TradingViewChart symbol={selectedChartTrade.instrument} theme="dark" />
              </div>
              <div className="mt-2 text-[10px] text-zinc-500 text-center">
                Visualizing market feed for {selectedChartTrade.instrument} synced with your trade log context.
              </div>
            </Card>
          )}

          <div className="rounded-2xl border border-[#1E1E38] bg-[#111124]/80 p-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setResultFilter("")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${!resultFilter ? "gold-gradient text-black shadow-md shadow-[#F0B429]/20" : "bg-[#18182C] text-zinc-400 hover:text-white border border-[#282840]"}`}
                >
                  All Trades ({trades.length})
                </button>
                <button
                  onClick={() => setResultFilter(resultFilter === "win" ? "" : "win")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${resultFilter === "win" ? "bg-[#00D084]/20 border border-[#00D084] text-[#00D084]" : "bg-[#18182C] text-zinc-400 hover:text-white border border-[#282840]"}`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#00D084]" /> Wins Only
                </button>
                <button
                  onClick={() => setResultFilter(resultFilter === "loss" ? "" : "loss")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${resultFilter === "loss" ? "bg-[#FF4565]/20 border border-[#FF4565] text-[#FF4565]" : "bg-[#18182C] text-zinc-400 hover:text-white border border-[#282840]"}`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF4565]" /> Losses
                </button>
                <button
                  onClick={() => setResultFilter(resultFilter === "needs-review" ? "" : "needs-review")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${resultFilter === "needs-review" ? "bg-[#F0B429]/20 border border-[#F0B429] text-[#F0B429]" : "bg-[#18182C] text-zinc-400 hover:text-white border border-[#282840]"}`}
                >
                  Needs Review ({trades.filter(t => !t.reviewed).length})
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 md:w-64">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search instrument, tag..."
                    className="w-full rounded-xl border border-[#24243C] bg-[#0D0D1A] py-2 pl-9 pr-4 text-xs font-bold text-white outline-none focus:border-[#F0B429]"
                  />
                </div>
                <button
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${filtersExpanded || hasFilters ? "bg-[#F0B429]/15 border-[#F0B429] text-[#F0B429]" : "bg-[#18182C] border-[#282840] text-zinc-300 hover:text-white"}`}
                >
                  <Filter size={13} />
                  <span>Filters</span>
                  {hasFilters && <span className="w-2 h-2 rounded-full bg-[#F0B429]" />}
                </button>
              </div>
            </div>

            {filtersExpanded && (
              <div className="mt-4 pt-4 border-t border-[#24243C] grid gap-3 md:grid-cols-3 animate-in fade-in duration-200">
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

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">
                    Direction
                  </label>
                  <select
                    value={directionFilter}
                    onChange={(e) => setDirectionFilter(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">All Directions</option>
                    <option value="LONG">LONG</option>
                    <option value="SHORT">SHORT</option>
                  </select>
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
              <span>
                Showing <strong className="text-white">{filteredTrades.length}</strong> of {trades.length} trades
              </span>
              {hasFilters && (
                <button onClick={clearFilters} className="font-bold text-[#F0B429] hover:underline">
                  Reset filters ×
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {filteredTrades.length ? (
              filteredTrades.map((trade) => (
                <TradeReviewCard
                  key={trade.id}
                  trade={trade}
                  onEdit={() => openEditTrade(trade)}
                  onDelete={() => handleDelete(trade.id)}
                  onViewChart={() => setSelectedChartTrade(trade)}
                />
              ))
            ) : (
              <Card className="p-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D0D1A] text-[#F0B429]">
                  {hasFilters ? <SlidersHorizontal /> : <FileText />}
                </div>

                <div className="mt-4 text-lg font-black">
                  {hasFilters ? "No trades match filters" : "No trades yet"}
                </div>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5A5A80]">
                  {hasFilters
                    ? "Try clearing filters or widening your search."
                    : "Log your first trade to start building your performance database."}
                </p>

                <button
                  onClick={hasFilters ? clearFilters : openNewTrade}
                  className="gold-gradient mt-5 rounded-xl px-5 py-3 text-sm font-black text-[#080810]"
                >
                  {hasFilters ? "Clear Filters" : "Log First Trade"}
                </button>
              </Card>
            )}
          </div>
        </div>
      )}

      {formOpen && user && (
        <Modal
          title={modalTrade ? "Edit Trade Review" : "Log New Trade"}
          onClose={() => setFormOpen(false)}
        >
          <TradeForm
            uid={user.id}
            existing={modalTrade}
            accounts={accounts}
            playbook={playbook}
            strategiesFromTrades={strategiesFromTrades}
            onCancel={() => setFormOpen(false)}
            onSaved={async () => {
              setFormOpen(false);
              await load();
            }}
          />
        </Modal>
      )}
    </AppShell>
  );
}

function ReviewHero({
  stats,
  reviewed,
  total,
  avgExecution,
}: {
  stats: ReturnType<typeof calcStats>;
  reviewed: number;
  total: number;
  avgExecution: number;
}) {
  const reviewRate = total ? reviewed / total : 0;

  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#F0B429]/10 blur-2xl" />

      <div className="relative grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F0B429]">
            <ShieldCheck size={15} />
            Professional Review Workflow
          </div>

          <h2 className="mt-2 text-2xl font-black tracking-[-0.06em]">
            Every trade becomes an improvement loop.
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A0A0C0]">
            Track execution quality, mistakes, emotions, tags, strategy and
            review status — so your Trade Log becomes a behavioral database,
            not just a P&L list.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <HeroFact
            label="Review Rate"
            value={total ? formatPct(reviewRate) : "—"}
            sub={`${reviewed}/${total} reviewed`}
          />
          <HeroFact
            label="Execution Score"
            value={avgExecution ? `${avgExecution.toFixed(1)}/5` : "—"}
            sub="average rating"
          />
          <HeroFact
            label="Expectancy"
            value={formatR(stats.expectancy)}
            sub="per trade"
          />
        </div>
      </div>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  sub,
  tone,
  icon: Icon = TrendingUp,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "green" | "red" | "gold" | "blue" | "purple";
  icon?: typeof TrendingUp;
}) {
  const color =
    tone === "green"
      ? "#00D084"
      : tone === "red"
        ? "#FF4565"
        : tone === "blue"
          ? "#4C82FB"
          : tone === "purple"
            ? "#A855F7"
            : "#F0B429";

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">
          {label}
        </div>
        <Icon size={17} style={{ color }} />
      </div>

      <div
        className="mt-3 truncate text-3xl font-black tracking-[-0.06em]"
        style={{ color }}
        title={value}
      >
        {value}
      </div>

      <div className="mt-1 text-xs font-semibold text-[#5A5A80]">{sub}</div>
    </Card>
  );
}

function formatStreak(streak: number) {
  if (!streak) return "—";
  const count = Math.abs(streak);
  return `${count}${streak > 0 ? "W" : "L"}`;
}

function HeroFact({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">
        {label}
      </div>
      <div className="mt-2 text-xl font-black text-[#F0B429]">{value}</div>
      <div className="mt-1 text-xs text-[#5A5A80]">{sub}</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  options: string[];
}) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        <option value="">{allLabel}</option>
        {options.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </div>
  );
}

function TradeReviewCard({
  trade,
  onEdit,
  onDelete,
  onViewChart,
}: {
  trade: Trade;
  onEdit: () => void;
  onDelete: () => void;
  onViewChart: () => void;
}) {
  const open = !hasResult(trade);
  const result = Number(trade.result || 0);
  const positive = result >= 0;
  const rating = Number(trade.executionRating || 0);
  const tags = String(trade.tags || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <Card className="overflow-hidden p-0 transition hover:border-[#2A2A50]">
      <div className="grid gap-0 lg:grid-cols-[1.2fr_1fr_auto]">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[10px] font-black",
                trade.direction === "LONG"
                  ? "bg-[#00D084]/10 text-[#00D084]"
                  : "bg-[#FF4565]/10 text-[#FF4565]",
              ].join(" ")}
            >
              {trade.direction}
            </span>

            <div className="text-base font-black">{trade.instrument}</div>

            {trade.reviewed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#00D084]/10 px-2 py-0.5 text-[10px] font-black text-[#00D084]">
                <CheckCircle2 size={12} />
                Reviewed
              </span>
            ) : (
              <span className="rounded-full bg-[#F0B429]/10 px-2 py-0.5 text-[10px] font-black text-[#F0B429]">
                Needs Review
              </span>
            )}
            
            <button
              onClick={onViewChart}
              className="inline-flex items-center gap-1 rounded-full bg-[#F0B429]/10 hover:bg-[#F0B429]/25 px-2 py-0.5 text-[10px] font-black text-[#F0B429] transition-all"
            >
              <TrendingUp size={12} />
              View Chart
            </button>
          </div>

          <div className="mt-1 text-xs text-[#5A5A80]">
            {trade.date} · {trade.session || "No session"} ·{" "}
            {trade.account || "No account"}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {trade.setup && (
              <span className="rounded-lg border border-[#F0B429]/15 bg-[#F0B429]/10 px-2 py-1 text-[11px] font-bold text-[#F0B429]">
                {trade.setup}
              </span>
            )}

            {trade.emotion && (
              <span className="rounded-lg border border-[#4C82FB]/15 bg-[#4C82FB]/10 px-2 py-1 text-[11px] font-bold text-[#4C82FB]">
                {trade.emotion}
              </span>
            )}

            {trade.mistake && (
              <span className="rounded-lg border border-[#FF4565]/15 bg-[#FF4565]/10 px-2 py-1 text-[11px] font-bold text-[#FF4565]">
                {trade.mistake}
              </span>
            )}

            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg border border-[#1E1E38] bg-[#0D0D1A] px-2 py-1 text-[11px] font-bold text-[#A0A0C0]"
              >
                #{tag}
              </span>
            ))}
          </div>

          {trade.notes && (
            <div className="mt-3 line-clamp-2 text-sm leading-6 text-[#A0A0C0]">
              {trade.notes}
            </div>
          )}
        </div>

        <div className="border-t border-[#1E1E38] p-4 lg:border-l lg:border-t-0">
          <div className="grid grid-cols-2 gap-3">
            <ReviewMetric
              label="Result"
              value={open ? "OPEN" : formatR(result)}
              color={open ? "#4C82FB" : positive ? "#00D084" : "#FF4565"}
            />

            <ReviewMetric
              label="Execution"
              value={rating ? `${rating}/5` : "—"}
              color={rating >= 4 ? "#00D084" : rating > 0 ? "#F0B429" : "#5A5A80"}
            />

            <ReviewMetric
              label="R:R"
              value={trade.rr ? `1:${trade.rr}` : "—"}
              color="#F0B429"
            />

            <ReviewMetric
              label="P&L"
              value={
                trade.pnl === "" || trade.pnl === undefined || trade.pnl === null
                  ? "—"
                  : `${Number(trade.pnl) >= 0 ? "+" : "-"}$${Math.abs(
                      Number(trade.pnl)
                    ).toFixed(0)}`
              }
              color={Number(trade.pnl || 0) >= 0 ? "#00D084" : "#FF4565"}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-[#1E1E38] p-4 lg:flex-col lg:justify-center lg:border-l lg:border-t-0">
          <button
            onClick={onEdit}
            className="flex-1 rounded-xl border border-[#1E1E38] px-3 py-2 text-xs font-black text-[#A0A0C0] lg:flex-none"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 rounded-xl border border-[#FF4565]/20 bg-[#FF4565]/10 px-3 py-2 text-xs font-black text-[#FF4565] lg:flex-none"
          >
            Delete
          </button>
        </div>
      </div>
    </Card>
  );
}

function ReviewMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3">
      <div className="text-[9px] font-black uppercase tracking-widest text-[#5A5A80]">
        {label}
      </div>
      <div className="mt-1 text-sm font-black" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

const selectClass =
  "mt-2 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 text-sm font-bold outline-none focus:border-[#F0B429]";

function hasResult(trade: Trade) {
  return (
    trade.result !== "" &&
    trade.result !== null &&
    trade.result !== undefined &&
    Number.isFinite(Number(trade.result))
  );
}