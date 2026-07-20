"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Gauge,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { PageInsightPanel } from "@/components/ai/PageInsightPanel";
import { useAuth } from "@/components/providers/AuthProvider";
import { getTrades } from "@/lib/db";
import { getRecentShifts, TraderShift } from "@/lib/shifts-db";
import { calcStats, formatPct, formatR, hasResult } from "@/lib/stats";
import { Trade } from "@/types/trade";

type SetupRow = {
  name: string;
  count: number;
  wins: number;
  totalR: number;
  winRate: number;
};

type LeakRow = {
  name: string;
  count: number;
  totalR: number;
};

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function endOfWeek(start: Date) {
  const d = addDays(start, 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseTradeDate(date?: string | null) {
  if (!date) return null;
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isInside(date: Date | null, start: Date, end: Date) {
  if (!date) return false;
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short" });
}

function formatRange(start: Date, end: Date) {
  return `${formatShortDate(start)} — ${formatShortDate(end)}`;
}

function moneyFromTrades(trades: Trade[]) {
  const withPnl = trades.filter((trade) => trade.pnl !== "" && trade.pnl !== null && trade.pnl !== undefined);
  const total = withPnl.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
  return { total, count: withPnl.length, missing: trades.length - withPnl.length };
}

function formatMoney(value: number) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function groupSetups(trades: Trade[]): SetupRow[] {
  const map = new Map<string, SetupRow>();
  for (const trade of trades.filter(hasResult)) {
    const name = (trade.setup || "Unassigned setup").trim();
    const existing = map.get(name) || { name, count: 0, wins: 0, totalR: 0, winRate: 0 };
    const result = Number(trade.result || 0);
    existing.count += 1;
    existing.totalR += result;
    if (result > 0) existing.wins += 1;
    existing.winRate = existing.count ? existing.wins / existing.count : 0;
    map.set(name, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.totalR - a.totalR);
}

function groupLeaks(trades: Trade[]): LeakRow[] {
  const map = new Map<string, LeakRow>();
  const losingTrades = trades.filter((trade) => hasResult(trade) && Number(trade.result || 0) < 0);

  for (const trade of losingTrades) {
    const raw = trade.mistake || trade.emotion || trade.tags || "Unclassified loss";
    const name = String(raw).trim() || "Unclassified loss";
    const existing = map.get(name) || { name, count: 0, totalR: 0 };
    existing.count += 1;
    existing.totalR += Number(trade.result || 0);
    map.set(name, existing);
  }

  return Array.from(map.values()).sort((a, b) => a.totalR - b.totalR);
}

function weeklyScore({
  stats,
  shifts,
  reviewCompletion,
}: {
  stats: ReturnType<typeof calcStats>;
  shifts: TraderShift[];
  reviewCompletion: number;
}) {
  const edge = Math.min(35, Math.max(0, ((stats.profitFactor - 0.7) / 1.8) * 35));
  const expectancy = Math.min(25, Math.max(0, ((stats.expectancy + 0.25) / 1.25) * 25));
  const sample = Math.min(15, Math.max(0, (stats.count / 10) * 15));
  const review = Math.min(15, Math.max(0, reviewCompletion * 15));
  const avgDiscipline = shifts.length
    ? shifts.reduce((sum, shift) => sum + Number(shift.postDiscipline || shift.disciplineLevel || 0), 0) / shifts.length
    : 6;
  const psychology = Math.min(10, Math.max(0, (avgDiscipline / 10) * 10));

  return Math.round(Math.max(0, Math.min(100, edge + expectancy + sample + review + psychology)));
}

function gradeFor(score: number) {
  if (score >= 88) return { grade: "S", color: "#00D084", label: "Elite process" };
  if (score >= 75) return { grade: "A", color: "#00D084", label: "Strong week" };
  if (score >= 62) return { grade: "B", color: "#F0B429", label: "Edge forming" };
  if (score >= 48) return { grade: "C", color: "#F0B429", label: "Needs review" };
  if (score >= 32) return { grade: "D", color: "#FF4565", label: "Risky week" };
  return { grade: "E", color: "#FF4565", label: "Rebuild process" };
}

function buildWeekOptions() {
  const current = startOfWeek(new Date());
  return Array.from({ length: 8 }, (_, index) => {
    const start = addDays(current, -7 * index);
    const end = endOfWeek(start);
    return {
      id: start.toISOString().slice(0, 10),
      label: index === 0 ? "This Week" : index === 1 ? "Last Week" : `${index}w ago`,
      start,
      end,
    };
  });
}

function reportParagraph({
  stats,
  previousStats,
  bestSetup,
  worstLeak,
  reviewCompletion,
}: {
  stats: ReturnType<typeof calcStats>;
  previousStats: ReturnType<typeof calcStats>;
  bestSetup?: SetupRow;
  worstLeak?: LeakRow;
  reviewCompletion: number;
}) {
  if (!stats.count) {
    return "No closed trades were logged for this week, so the main objective is process consistency: log every trade, tag the setup, record the emotion, and complete reviews before the next weekly report. ProfitPnL needs clean data before it can separate a real edge from random outcomes.";
  }

  const direction = stats.totalR >= previousStats.totalR ? "improved versus" : "pulled back from";
  const leakText = worstLeak
    ? `The main leak to review is “${worstLeak.name}”, costing ${formatR(worstLeak.totalR)} across ${worstLeak.count} trade${worstLeak.count === 1 ? "" : "s"}.`
    : "No recurring loss tag was detected, which means your losing trades need better emotion/mistake classification.";
  const setupText = bestSetup
    ? `Your strongest setup was “${bestSetup.name}” with ${formatR(bestSetup.totalR)} and ${formatPct(bestSetup.winRate)} win rate.`
    : "No setup produced enough tagged data yet.";

  return `This week closed at ${formatR(stats.totalR)} across ${stats.count} trade${stats.count === 1 ? "" : "s"}, with ${formatPct(stats.winRate)} win rate and ${formatR(stats.expectancy)} expectancy. Performance ${direction} last week (${formatR(previousStats.totalR)}), so the focus is to protect what is working and remove the clearest leak. ${setupText} ${leakText} Review completion is ${(reviewCompletion * 100).toFixed(0)}%, so the next edge improvement is not more trades — it is cleaner post-trade notes and stricter playbook filtering.`;
}

function nextWeekRules({
  stats,
  bestSetup,
  worstSetup,
  worstLeak,
  reviewQueue,
}: {
  stats: ReturnType<typeof calcStats>;
  bestSetup?: SetupRow;
  worstSetup?: SetupRow;
  worstLeak?: LeakRow;
  reviewQueue: Trade[];
}) {
  const rules = [
    bestSetup
      ? `Prioritize ${bestSetup.name}; it is currently your highest-output setup.`
      : "Tag every trade with a setup so ProfitPnL can identify your real edge.",
    worstSetup && worstSetup.totalR < 0
      ? `Reduce or pause ${worstSetup.name} until screenshots and rules are reviewed.`
      : "Keep trade selection tight — only take setups that match your written playbook.",
    stats.maxDD >= 3
      ? "Cut position size by 50% until drawdown stabilizes below 2R."
      : "Keep risk fixed; do not increase size after a winning streak.",
    worstLeak
      ? `Create a hard rule for ${worstLeak.name}: pause before taking another trade when this trigger appears.`
      : "Record the emotion and mistake field on every loss.",
    reviewQueue.length
      ? `Review ${reviewQueue.length} incomplete trade${reviewQueue.length === 1 ? "" : "s"} before placing the first trade next week.`
      : "Maintain 100% review completion before next Friday.",
  ];

  return rules;
}

function MiniStat({ label, value, sub, icon, tone = "gold" }: { label: string; value: string; sub: string; icon: React.ReactNode; tone?: "gold" | "green" | "red" | "blue" }) {
  const color = tone === "green" ? "#00D084" : tone === "red" ? "#FF4565" : tone === "blue" ? "#4C82FB" : "#F0B429";
  return (
    <Card className="relative overflow-hidden border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg shadow-black/20">
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full opacity-15 blur-2xl" style={{ backgroundColor: color }} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p>
          <p className="mt-2 truncate text-2xl font-black tracking-tight text-white" title={value}>{value}</p>
          <p className="mt-1 text-xs leading-5 text-[#8080A0]">{sub}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-black/20" style={{ color, borderColor: `${color}40` }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function Pill({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "green" | "red" | "blue" }) {
  const cls =
    tone === "green"
      ? "border-[#00D084]/30 bg-[#00D084]/10 text-[#00D084]"
      : tone === "red"
        ? "border-[#FF4565]/30 bg-[#FF4565]/10 text-[#FF4565]"
        : tone === "blue"
          ? "border-[#4C82FB]/30 bg-[#4C82FB]/10 text-[#8BB0FF]"
          : "border-[#F0B429]/30 bg-[#F0B429]/10 text-[#F0B429]";
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${cls}`}>{children}</span>;
}

export default function WeeklyReviewPage() {
  const { user, displayName } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [shifts, setShifts] = useState<TraderShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const weekOptions = useMemo(() => buildWeekOptions(), []);
  const [selectedWeekId, setSelectedWeekId] = useState(weekOptions[0]?.id || "");

  const selectedWeek = weekOptions.find((week) => week.id === selectedWeekId) || weekOptions[0];
  const previousWeek = useMemo(() => {
    const start = addDays(selectedWeek.start, -7);
    return { start, end: endOfWeek(start) };
  }, [selectedWeek]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [tradeRows, shiftRows] = await Promise.all([
        getTrades(user.id),
        getRecentShifts(user.id, 50),
      ]);
      setTrades(tradeRows);
      setShifts(shiftRows);
    } catch (error) {
      console.error("Weekly review load error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const weekTrades = useMemo(
    () => trades.filter((trade) => isInside(parseTradeDate(trade.date), selectedWeek.start, selectedWeek.end)),
    [trades, selectedWeek]
  );

  const previousWeekTrades = useMemo(
    () => trades.filter((trade) => isInside(parseTradeDate(trade.date), previousWeek.start, previousWeek.end)),
    [trades, previousWeek]
  );

  const weekShifts = useMemo(
    () => shifts.filter((shift) => isInside(new Date(shift.clockIn), selectedWeek.start, selectedWeek.end)),
    [shifts, selectedWeek]
  );

  const stats = useMemo(() => calcStats(weekTrades), [weekTrades]);
  const previousStats = useMemo(() => calcStats(previousWeekTrades), [previousWeekTrades]);
  const setupRows = useMemo(() => groupSetups(weekTrades), [weekTrades]);
  const bestSetup = setupRows[0];
  const worstSetup = setupRows.slice().reverse()[0];
  const leakRows = useMemo(() => groupLeaks(weekTrades), [weekTrades]);
  const worstLeak = leakRows[0];
  const money = useMemo(() => moneyFromTrades(weekTrades), [weekTrades]);

  const closedWeekTrades = useMemo(() => weekTrades.filter(hasResult), [weekTrades]);
  const reviewQueue = useMemo(
    () => closedWeekTrades.filter((trade) => !trade.reviewed || !trade.emotion || !trade.lesson),
    [closedWeekTrades]
  );
  const reviewCompletion = closedWeekTrades.length ? Math.max(0, 1 - reviewQueue.length / closedWeekTrades.length) : 0;
  const score = weeklyScore({ stats, shifts: weekShifts, reviewCompletion });
  const grade = gradeFor(score);
  const paragraph = reportParagraph({ stats, previousStats, bestSetup, worstLeak, reviewCompletion });
  const rules = nextWeekRules({ stats, bestSetup, worstSetup, worstLeak, reviewQueue });
  const avgDiscipline = weekShifts.length
    ? weekShifts.reduce((sum, shift) => sum + Number(shift.postDiscipline || shift.disciplineLevel || 0), 0) / weekShifts.length
    : 0;
  const avgStress = weekShifts.length
    ? weekShifts.reduce((sum, shift) => sum + Number(shift.stressLevel || 0), 0) / weekShifts.length
    : 0;

  async function copyReport() {
    const text = `ProfitPnL Weekly AI Review (${formatRange(selectedWeek.start, selectedWeek.end)})\n\n${paragraph}\n\nNext week rules:\n${rules.map((rule, index) => `${index + 1}. ${rule}`).join("\n")}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (!user) return null;

  return (
    <AppShell title="Weekly AI Review" subtitle="Your trading week diagnosed into actions.">
      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center text-sm text-[#8080A0]">
          <Loader2 className="mr-2 animate-spin" /> Building weekly AI review…
        </div>
      ) : (
        <div className="mx-auto max-w-6xl space-y-7 pb-24">
          <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(0,208,132,0.12),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%)]" />
            <div className="relative grid gap-7 p-6 lg:grid-cols-[1.35fr_0.8fr] lg:p-8">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]">
                    <Sparkles size={12} /> ProfitPnL Weekly Intelligence
                  </span>
                  <Pill tone={stats.totalR >= 0 ? "green" : "red"}>{formatR(stats.totalR)}</Pill>
                  <Pill tone={reviewCompletion >= 0.8 ? "green" : "gold"}>{Math.round(reviewCompletion * 100)}% reviewed</Pill>
                </div>

                <div>
                  <h1 className="text-4xl font-black tracking-tighter text-white sm:text-5xl">
                    Weekly AI Review
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">
                    {displayName ? `${displayName}, this` : "This"} is your trading week converted into a performance diagnosis, psychology read, and next-week execution rules.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {weekOptions.map((week) => (
                    <button
                      key={week.id}
                      onClick={() => setSelectedWeekId(week.id)}
                      className={[
                        "rounded-2xl border px-3.5 py-2 text-xs font-black transition",
                        selectedWeek.id === week.id
                          ? "border-[#F0B429]/40 bg-[#F0B429]/15 text-[#F0B429]"
                          : "border-[#1E1E38] bg-[#111124] text-[#8080A0] hover:text-white",
                      ].join(" ")}
                    >
                      {week.label}
                    </button>
                  ))}
                </div>

                <div className="rounded-[1.5rem] border border-[#F0B429]/20 bg-[#14142B]/80 p-5 shadow-[0_0_45px_-24px_#F0B429]">
                  <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">
                    <Brain size={13} /> Executive Summary
                  </p>
                  <p className="text-sm italic leading-8 text-zinc-200">{paragraph}</p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-[#1E1E38] bg-[#0B0B16]/90 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5A5A80]">Trader Score</p>
                    <p className="mt-1 text-5xl font-black tracking-tighter" style={{ color: grade.color }}>Grade {grade.grade}</p>
                    <p className="mt-1 text-xs font-bold text-[#A0A0C0]">{grade.label}</p>
                  </div>
                  <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${grade.color} ${Math.max(3, score) * 3.6}deg, #1E1E38 0deg)` }}>
                    <div className="absolute inset-2.5 rounded-full bg-[#080810]" />
                    <span className="relative text-2xl font-black" style={{ color: grade.color }}>{score}</span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#5A5A80]">Week</p>
                    <p className="mt-1 text-xs font-black text-white">{formatRange(selectedWeek.start, selectedWeek.end)}</p>
                  </div>
                  <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#5A5A80]">Trades</p>
                    <p className="mt-1 text-xs font-black text-[#F0B429]">{stats.count} closed</p>
                  </div>
                </div>

                <button
                  onClick={copyReport}
                  className="gold-gradient mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wider text-[#080810]"
                >
                  {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy Review"}
                </button>
              </div>
            </div>
          </Card>

          <PageInsightPanel
            kind="weekly-review"
            initialTitle="AI weekly coach"
            initialSummary="Generate a deeper weekly coaching read that converts performance, leaks, and psychology into next-week rules."
            context={{
              week: formatRange(selectedWeek.start, selectedWeek.end),
              stats,
              previousStats,
              bestSetup,
              worstSetup,
              worstLeak,
              reviewCompletion,
              reviewQueueCount: reviewQueue.length,
              nextWeekRules: rules,
              psychology: { sessions: weekShifts.length, avgDiscipline, avgStress },
            }}
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MiniStat label="Net R" value={formatR(stats.totalR)} sub={`Previous: ${formatR(previousStats.totalR)}`} icon={stats.totalR >= previousStats.totalR ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />} tone={stats.totalR >= 0 ? "green" : "red"} />
            <MiniStat label="Win Rate" value={stats.count ? formatPct(stats.winRate) : "—"} sub={`${stats.wins}W / ${stats.losses}L / ${stats.breakeven}BE`} icon={<Target size={20} />} />
            <MiniStat label="Expectancy" value={formatR(stats.expectancy)} sub="Average R per closed trade" icon={<Gauge size={20} />} tone={stats.expectancy >= 0 ? "green" : "red"} />
            <MiniStat label="Dollar P&L" value={money.count ? formatMoney(money.total) : "No $ logged"} sub={money.missing ? `${money.missing} missing $ values` : "All trades tracked"} icon={<BarChart3 size={20} />} tone={money.total >= 0 ? "green" : "red"} />
          </div>

          <section className="grid gap-7 xl:grid-cols-[1fr_1fr]">
            <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Edge Attribution</p>
                  <h2 className="mt-1 text-lg font-black text-white">Best and weakest setups</h2>
                </div>
                <Trophy className="text-[#F0B429]" size={22} />
              </div>

              {setupRows.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#2A2A3C] bg-[#080810] p-8 text-center text-sm text-zinc-500">No setup data this week. Assign setups to trades to unlock edge attribution.</p>
              ) : (
                <div className="space-y-3">
                  {setupRows.slice(0, 5).map((setup) => (
                    <div key={setup.name} className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white" title={setup.name}>{setup.name}</p>
                          <p className="mt-1 text-xs text-[#8080A0]">{setup.count} trade{setup.count === 1 ? "" : "s"} · {formatPct(setup.winRate)} WR</p>
                        </div>
                        <span className={`text-sm font-black ${setup.totalR >= 0 ? "text-[#00D084]" : "text-[#FF4565]"}`}>{formatR(setup.totalR)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Leak Finder</p>
                  <h2 className="mt-1 text-lg font-black text-white">What cost you this week</h2>
                </div>
                <AlertTriangle className="text-[#F0B429]" size={22} />
              </div>

              {leakRows.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#2A2A3C] bg-[#080810] p-8 text-center text-sm text-zinc-500">No tagged losing leaks this week. Keep tagging mistakes and emotions for stronger diagnosis.</p>
              ) : (
                <div className="space-y-3">
                  {leakRows.slice(0, 5).map((leak) => (
                    <div key={leak.name} className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white" title={leak.name}>{leak.name}</p>
                          <p className="mt-1 text-xs text-[#8080A0]">{leak.count} loss tag{leak.count === 1 ? "" : "s"}</p>
                        </div>
                        <span className="text-sm font-black text-[#FF4565]">{formatR(leak.totalR)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section className="grid gap-7 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Psychology</p>
                  <h2 className="mt-1 text-lg font-black text-white">Risk-Guard signal</h2>
                </div>
                <Brain className="text-[#F0B429]" size={22} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">Sessions</p>
                  <p className="mt-2 text-2xl font-black text-white">{weekShifts.length}</p>
                  <p className="mt-1 text-xs text-[#8080A0]">Risk-Guard clock-outs</p>
                </div>
                <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">Avg Discipline</p>
                  <p className="mt-2 text-2xl font-black text-[#00D084]">{weekShifts.length ? avgDiscipline.toFixed(1) : "—"}/10</p>
                  <p className="mt-1 text-xs text-[#8080A0]">From shift reports</p>
                </div>
                <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">Avg Stress</p>
                  <p className="mt-2 text-2xl font-black text-[#F0B429]">{weekShifts.length ? avgStress.toFixed(1) : "—"}/10</p>
                  <p className="mt-1 text-xs text-[#8080A0]">Pre-session pressure</p>
                </div>
              </div>
            </Card>

            <Card className="border-[#F0B429]/20 bg-[#0D0D1A]/95 p-5 shadow-lg">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Next Week Prescription</p>
                  <h2 className="mt-1 text-lg font-black text-white">Rules to trade by</h2>
                </div>
                <ShieldCheck className="text-[#F0B429]" size={22} />
              </div>
              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <div key={rule} className="flex gap-3 rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#F0B429]/10 text-xs font-black text-[#F0B429]">{index + 1}</span>
                    <p className="text-sm leading-6 text-zinc-300">{rule}</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Review Queue</p>
                <h2 className="mt-1 text-lg font-black text-white">Trades needing attention</h2>
              </div>
              <ClipboardCheck className="text-[#F0B429]" size={22} />
            </div>
            {reviewQueue.length === 0 ? (
              <p className="rounded-2xl border border-[#00D084]/25 bg-[#00D084]/10 p-5 text-sm font-bold text-[#00D084]">Clean week — all logged trades have review coverage.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {reviewQueue.slice(0, 9).map((trade) => (
                  <div key={trade.id} className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-black text-white">{trade.instrument || "Instrument"}</p>
                      <span className={`text-xs font-black ${Number(trade.result || 0) >= 0 ? "text-[#00D084]" : "text-[#FF4565]"}`}>{hasResult(trade) ? formatR(Number(trade.result || 0)) : "OPEN"}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#8080A0]">{trade.date} · {trade.setup || "No setup"}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {!trade.reviewed && <Pill>Needs review</Pill>}
                      {!trade.emotion && <Pill tone="blue">No emotion</Pill>}
                      {!trade.lesson && <Pill tone="red">No lesson</Pill>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </AppShell>
  );
}
