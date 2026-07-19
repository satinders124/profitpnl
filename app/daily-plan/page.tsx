"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { PageInsightPanel, type PageInsight } from "@/components/ai/PageInsightPanel";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAccounts, getPlaybook, getTrades } from "@/lib/db";
import { acceptDailyPlan, getDailyPlan, saveDailyPlanInsight, type DailyPlanRecord } from "@/lib/daily-plans";
import { getRecentShifts, TraderShift } from "@/lib/shifts-db";
import { calcStats, formatPct, formatR, hasResult } from "@/lib/stats";
import { Trade } from "@/types/trade";
import { TradingAccount } from "@/types/account";
import { PlaybookSetup } from "@/types/playbook";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Gauge,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  Zap,
} from "lucide-react";

type Plan = {
  riskLevel: "Cleared" | "Caution" | "Defense Mode";
  tone: "green" | "gold" | "red";
  maxTrades: number;
  riskPerTrade: number;
  riskScale: string;
  allowedSetups: string[];
  avoidList: string[];
  stopRules: string[];
  focus: string;
};

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value: number) {
  return `${value >= 0 ? "" : "-"}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function dateKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function todayKey() {
  return dateKey();
}

function lastNDays(trades: Trade[], days: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return trades.filter((trade) => {
    if (!trade.date) return false;
    const parsed = new Date(`${trade.date}T12:00:00`);
    return !Number.isNaN(parsed.getTime()) && parsed >= cutoff;
  });
}

function ruleAmount(value: unknown, accountSize: number, fallbackPercent: number) {
  const parsed = num(value, 0);
  if (parsed > 0) return parsed <= 100 ? accountSize * (parsed / 100) : parsed;
  return accountSize * (fallbackPercent / 100);
}

function setupRows(trades: Trade[]) {
  const map = new Map<string, { name: string; count: number; totalR: number; wins: number }>();
  for (const trade of trades.filter(hasResult)) {
    const name = trade.setup || "Unassigned setup";
    const current = map.get(name) || { name, count: 0, totalR: 0, wins: 0 };
    const result = num(trade.result, 0);
    current.count += 1;
    current.totalR += result;
    if (result > 0) current.wins += 1;
    map.set(name, current);
  }
  return Array.from(map.values()).sort((a, b) => b.totalR - a.totalR);
}

function lossTags(trades: Trade[]) {
  const map = new Map<string, { name: string; totalR: number; count: number }>();
  for (const trade of trades.filter((t) => hasResult(t) && num(t.result, 0) < 0)) {
    const name = trade.mistake || trade.emotion || trade.tags || "Unclassified loss";
    const current = map.get(name) || { name, totalR: 0, count: 0 };
    current.totalR += num(trade.result, 0);
    current.count += 1;
    map.set(name, current);
  }
  return Array.from(map.values()).sort((a, b) => a.totalR - b.totalR);
}

function latestShiftRisk(shift?: TraderShift | null) {
  if (!shift) return 0;
  let risk = 0;
  if (num(shift.stressLevel, 0) >= 8) risk += 2;
  if (num(shift.sleepQuality, 10) <= 4) risk += 2;
  if (num(shift.postDiscipline || shift.disciplineLevel, 10) <= 4) risk += 2;
  return risk;
}

function buildPlan({
  trades,
  accounts,
  playbook,
  shifts,
  accountId,
}: {
  trades: Trade[];
  accounts: TradingAccount[];
  playbook: PlaybookSetup[];
  shifts: TraderShift[];
  accountId: string;
}): Plan {
  const recent = lastNDays(trades, 30);
  const stats = calcStats(recent);
  const selectedAccount = accounts.find((account) => account.id === accountId) || accounts[0];
  const accountSize = selectedAccount ? num(selectedAccount.size, num(selectedAccount.startingBalance, 0)) : 0;
  const dailyLoss = selectedAccount ? ruleAmount(selectedAccount.dailyLoss, accountSize, 5) : 0;
  const setupRank = setupRows(recent);
  const best = setupRank.filter((row) => row.totalR > 0).slice(0, 2).map((row) => row.name);
  const activePlaybook = playbook.filter((setup) => (setup.status || "Active") === "Active").slice(0, 2).map((setup) => setup.name);
  const allowedSetups = (best.length ? best : activePlaybook.length ? activePlaybook : ["Only A+ verified setup"]);
  const worstSetup = setupRank.slice().reverse().find((row) => row.totalR < 0)?.name;
  const worstLeak = lossTags(recent)[0]?.name;
  const shiftRisk = latestShiftRisk(shifts[0]);
  const losingStreak = stats.streak < 0 ? Math.abs(stats.streak) : 0;

  let riskLevel: Plan["riskLevel"] = "Cleared";
  let tone: Plan["tone"] = "green";
  let maxTrades = 3;
  let riskScale = "Normal planned risk";
  let riskFactor = 0.01;
  const avoidList: string[] = [];

  if (worstSetup) avoidList.push(worstSetup);
  if (worstLeak) avoidList.push(worstLeak);
  if (losingStreak >= 2) avoidList.push("No revenge trades after current losing streak");

  if (shiftRisk >= 4 || losingStreak >= 3 || stats.maxDD >= 4) {
    riskLevel = "Defense Mode";
    tone = "red";
    maxTrades = 1;
    riskScale = "25% normal risk";
    riskFactor = 0.0025;
  } else if (shiftRisk >= 2 || losingStreak >= 2 || stats.expectancy <= 0) {
    riskLevel = "Caution";
    tone = "gold";
    maxTrades = 2;
    riskScale = "50% normal risk";
    riskFactor = 0.005;
  }

  const riskPerTrade = accountSize ? Math.max(1, Math.round(accountSize * riskFactor)) : 0;
  const stopLossCap = dailyLoss ? money(Math.max(riskPerTrade, dailyLoss * 0.5)) : "daily loss limit";

  return {
    riskLevel,
    tone,
    maxTrades,
    riskPerTrade,
    riskScale,
    allowedSetups,
    avoidList: Array.from(new Set(avoidList)).slice(0, 4),
    stopRules: [
      `Stop after ${riskLevel === "Defense Mode" ? "1" : "2"} loss${riskLevel === "Defense Mode" ? "" : "es"}.`,
      `Stop if down ${stopLossCap} or daily loss limit is threatened.`,
      "Stop immediately after one rule break or emotional trade.",
      "No size increase after a win; keep risk fixed for the full session.",
    ],
    focus:
      riskLevel === "Defense Mode"
        ? "Capital protection first. You are not trading to recover losses today — you are trading to prove discipline."
        : riskLevel === "Caution"
          ? "Trade slower than usual. Wait for confirmation and skip anything that is not obvious."
          : "Your execution window is open. Stay selective, follow the plan, and avoid unnecessary extra trades.",
  };
}

function toneClasses(tone: Plan["tone"]) {
  if (tone === "green") return { text: "text-[#00D084]", border: "border-[#00D084]/35", bg: "bg-[#00D084]/10", color: "#00D084" };
  if (tone === "red") return { text: "text-[#FF4565]", border: "border-[#FF4565]/35", bg: "bg-[#FF4565]/10", color: "#FF4565" };
  return { text: "text-[#F0B429]", border: "border-[#F0B429]/35", bg: "bg-[#F0B429]/10", color: "#F0B429" };
}

function cleanText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function planRecordToPayload(record: DailyPlanRecord): Plan {
  return {
    riskLevel: record.riskLevel as Plan["riskLevel"],
    tone: record.tone as Plan["tone"],
    maxTrades: record.maxTrades,
    riskPerTrade: record.riskPerTrade,
    riskScale: record.riskScale,
    allowedSetups: record.allowedSetups,
    avoidList: record.avoidList,
    stopRules: record.stopRules,
    focus: record.focus,
  };
}

function tradeIsAllowed(trade: Trade, allowedSetups: string[]) {
  if (!allowedSetups.length) return true;
  if (allowedSetups.some((setup) => cleanText(setup).includes("only a+"))) return true;
  const setup = cleanText(trade.setup || "");
  if (!setup) return false;
  return allowedSetups.some((allowed) => {
    const clean = cleanText(allowed);
    return setup === clean || setup.includes(clean) || clean.includes(setup);
  });
}

function tradeTriggersAvoid(trade: Trade, avoidList: string[]) {
  if (!avoidList.length) return false;
  const haystack = cleanText([trade.setup, trade.emotion, trade.mistake, trade.tags, trade.notes].filter(Boolean).join(" "));
  return avoidList.some((avoid) => {
    const clean = cleanText(avoid);
    if (!clean) return false;
    if (haystack.includes(clean)) return true;
    if (clean.includes("revenge") && haystack.includes("revenge")) return true;
    if (clean.includes("fomo") && haystack.includes("fomo")) return true;
    return false;
  });
}

function tradeLoss(trade: Trade) {
  const result = Number(trade.result);
  if (Number.isFinite(result) && result < 0) return true;
  const pnl = Number(trade.pnl);
  return Number.isFinite(pnl) && pnl < 0;
}

function buildExecutionScore(trades: Trade[], plan: Plan) {
  const tradesTaken = trades.length;
  const extraTrades = Math.max(0, tradesTaken - plan.maxTrades);
  const nonAllowed = trades.filter((trade) => !tradeIsAllowed(trade, plan.allowedSetups)).length;
  const avoidHits = trades.filter((trade) => tradeTriggersAvoid(trade, plan.avoidList)).length;
  const losses = trades.filter(tradeLoss).length;
  const unreviewed = trades.filter((trade) => !trade.reviewed || !trade.emotion || !trade.lesson).length;
  const score = Math.max(0, Math.min(100, 100 - extraTrades * 22 - nonAllowed * 18 - avoidHits * 18 - Math.max(0, losses - 1) * 10 - unreviewed * 5));
  const tone: "green" | "gold" | "red" = score >= 80 ? "green" : score >= 55 ? "gold" : "red";
  const label = score >= 80 ? "On Plan" : score >= 55 ? "Watch" : "Off Plan";
  return { tradesTaken, extraTrades, nonAllowed, avoidHits, losses, unreviewed, score, tone, label };
}

function PlanVsExecution({ plan, trades, accepted }: { plan: Plan; trades: Trade[]; accepted: boolean }) {
  const execution = buildExecutionScore(trades, plan);
  const tone = toneClasses(execution.tone);

  return (
    <Card className="relative overflow-hidden border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg shadow-black/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(240,180,41,0.10),transparent_32%)] pointer-events-none" />
      <div className="relative mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]">Plan vs Execution</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-white">Today&apos;s accountability score</h2>
          <p className="mt-1 text-xs text-[#8080A0]">
            {accepted ? "Tracking accepted plan against today&apos;s logged trades." : "Accept the plan to lock your rules before trading."}
          </p>
        </div>
        <div className={`rounded-2xl border ${tone.border} ${tone.bg} px-4 py-3 text-right`}>
          <p className={`text-3xl font-black ${tone.text}`}>{execution.score}</p>
          <p className={`text-[10px] font-black uppercase tracking-wider ${tone.text}`}>{execution.label}</p>
        </div>
      </div>

      <div className="relative grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <ExecutionMini label="Trades" value={`${execution.tradesTaken}/${plan.maxTrades}`} tone={execution.extraTrades ? "red" : "green"} />
        <ExecutionMini label="Extra Trades" value={String(execution.extraTrades)} tone={execution.extraTrades ? "red" : "green"} />
        <ExecutionMini label="Off-Setup" value={String(execution.nonAllowed)} tone={execution.nonAllowed ? "red" : "green"} />
        <ExecutionMini label="Avoid Hits" value={String(execution.avoidHits)} tone={execution.avoidHits ? "red" : "green"} />
        <ExecutionMini label="Losses" value={String(execution.losses)} tone={execution.losses > 1 ? "red" : execution.losses ? "gold" : "green"} />
        <ExecutionMini label="Needs Review" value={String(execution.unreviewed)} tone={execution.unreviewed ? "gold" : "green"} />
      </div>

      {trades.length === 0 ? (
        <p className="relative mt-4 rounded-2xl border border-dashed border-[#2A2A3C] bg-[#080810] p-4 text-sm text-[#8080A0]">
          No trades logged today yet. Once trades are logged, ProfitPnL will score execution against this plan.
        </p>
      ) : (
        <p className="relative mt-4 rounded-2xl border border-[#1E1E38] bg-[#080810] p-4 text-sm leading-6 text-zinc-300">
          {execution.score >= 80
            ? "Clean alignment so far. Keep following the same guardrails and avoid adding unnecessary trades."
            : execution.score >= 55
              ? "Execution is drifting. Review off-plan trades before taking another setup."
              : "Plan discipline is broken. Stop trading and process the review queue before risking more capital."}
        </p>
      )}
    </Card>
  );
}

function ExecutionMini({ label, value, tone }: { label: string; value: string; tone: "green" | "gold" | "red" }) {
  const classes = toneClasses(tone);
  return (
    <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-[#5A5A80]">{label}</p>
      <p className={`mt-1 text-lg font-black ${classes.text}`}>{value}</p>
    </div>
  );
}

function PlanCard({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-[#F0B429]">{icon} {title}</h3>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex gap-3 rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#F0B429]/10 text-xs font-black text-[#F0B429]">{index + 1}</span>
            <p className="text-sm leading-6 text-zinc-300">{item}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DailyPlanWorkflowStatus({
  briefGenerated,
  accepted,
  tradesToday,
  cloudSynced,
}: {
  briefGenerated: boolean;
  accepted: boolean;
  tradesToday: number;
  cloudSynced: boolean;
}) {
  const steps = [
    {
      label: "Guardrails ready",
      description: "Risk, setups, avoid list and stop rules are calculated from your journal.",
      done: true,
      icon: <ShieldCheck size={16} />,
    },
    {
      label: "AI briefing generated",
      description: briefGenerated ? "Pre-market paragraph is saved for today." : "Generate the AI briefing before the first trade.",
      done: briefGenerated,
      icon: <Sparkles size={16} />,
    },
    {
      label: "Plan locked",
      description: accepted ? "Accepted plan is active for execution scoring." : "Click Accept Plan to lock today’s rules.",
      done: accepted,
      icon: <ClipboardCheck size={16} />,
    },
    {
      label: "Execution tracking",
      description: tradesToday > 0 ? `${tradesToday} trade${tradesToday === 1 ? "" : "s"} scored against the plan.` : "Trades logged today will be scored automatically.",
      done: accepted && tradesToday > 0,
      icon: <Gauge size={16} />,
    },
  ];

  return (
    <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg shadow-black/20">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Daily Plan Reliability</p>
          <h2 className="mt-1 text-lg font-black text-white">Today’s pre-market workflow</h2>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${cloudSynced ? "border-[#00D084]/30 bg-[#00D084]/10 text-[#00D084]" : "border-[#F0B429]/30 bg-[#F0B429]/10 text-[#F0B429]"}`}>
          {cloudSynced ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
          {cloudSynced ? "Cloud sync active" : "Local fallback"}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step.label} className={`rounded-2xl border p-4 ${step.done ? "border-[#00D084]/25 bg-[#00D084]/10" : "border-[#1E1E38] bg-[#080810]"}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${step.done ? "border-[#00D084]/30 bg-[#00D084]/10 text-[#00D084]" : "border-[#2A2A3C] bg-[#111124] text-[#8080A0]"}`}>{step.icon}</span>
              <span className="font-mono text-[10px] font-black text-[#5A5A80]">0{index + 1}</span>
            </div>
            <p className={`text-sm font-black ${step.done ? "text-white" : "text-zinc-400"}`}>{step.label}</p>
            <p className="mt-1 text-xs leading-5 text-[#8080A0]">{step.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function DailyPlanPage() {
  const { user, displayName } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [playbook, setPlaybook] = useState<PlaybookSetup[]>([]);
  const [shifts, setShifts] = useState<TraderShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savedPlan, setSavedPlan] = useState<DailyPlanRecord | null>(null);
  const [briefGenerated, setBriefGenerated] = useState(false);
  const [cloudPlanAvailable, setCloudPlanAvailable] = useState(false);
  const [planNotice, setPlanNotice] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [tradeRows, accountRows, playbookRows, shiftRows] = await Promise.all([
        getTrades(user.id),
        getAccounts(user.id),
        getPlaybook(user.id),
        getRecentShifts(user.id, 20),
      ]);
      setTrades(tradeRows);
      setAccounts(accountRows);
      setPlaybook(playbookRows);
      setShifts(shiftRows);
      setAccountId((current) => current || accountRows[0]?.id || "");
      const cloudPlan = await getDailyPlan(user.id, todayKey());
      setSavedPlan(cloudPlan);
      setCloudPlanAvailable(Boolean(cloudPlan));
      setBriefGenerated(Boolean(cloudPlan?.aiBrief?.summary));
      setAccepted(Boolean(cloudPlan?.acceptedAt) || localStorage.getItem(`profitpnl_daily_plan_${todayKey()}`) === "accepted");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const plan = useMemo(() => buildPlan({ trades, accounts, playbook, shifts, accountId }), [trades, accounts, playbook, shifts, accountId]);
  const stats = useMemo(() => calcStats(lastNDays(trades, 30)), [trades]);
  const tone = toneClasses(plan.tone);
  const trackedPlan = savedPlan ? planRecordToPayload(savedPlan) : plan;
  const todaysTrades = useMemo(() => trades.filter((trade) => trade.date === todayKey()), [trades]);

  function planContext() {
    return {
      account: accounts.find((account) => account.id === accountId) || null,
      recentStats: {
        totalR: stats.totalR,
        winRate: stats.winRate,
        expectancy: stats.expectancy,
        maxDrawdown: stats.maxDD,
        streak: stats.streak,
      },
      latestShift: shifts[0] || null,
    };
  }

  async function saveGeneratedBrief(insight: PageInsight) {
    if (!user) return;
    setBriefGenerated(true);
    try {
      const record = await saveDailyPlanInsight(user.id, todayKey(), plan, planContext(), insight);
      if (record) {
        setSavedPlan(record);
        setCloudPlanAvailable(true);
        setPlanNotice("AI briefing saved to today’s Daily Plan.");
      } else {
        setPlanNotice("AI briefing saved on this device. Run the daily plan AI brief migration to sync it across devices.");
      }
    } catch (error) {
      console.error("Save daily plan AI briefing error:", error);
      setPlanNotice("AI briefing saved on this device. Cloud sync failed temporarily.");
    }
  }

  async function acceptPlan() {
    if (!user) return;
    setSavingPlan(true);
    setPlanNotice("");
    try {
      const record = await acceptDailyPlan(user.id, todayKey(), plan, planContext());
      if (record) {
        setSavedPlan(record);
        setCloudPlanAvailable(true);
        setPlanNotice("Daily plan saved to your ProfitPnL account.");
      } else {
        setPlanNotice("Daily plan accepted locally. Run the daily_plans migration to sync across devices.");
      }
      localStorage.setItem(`profitpnl_daily_plan_${todayKey()}`, "accepted");
      setAccepted(true);
    } catch (error) {
      console.error("Accept daily plan error:", error);
      localStorage.setItem(`profitpnl_daily_plan_${todayKey()}`, "accepted");
      setAccepted(true);
      setPlanNotice("Daily plan accepted locally. Cloud sync failed temporarily.");
    } finally {
      setSavingPlan(false);
    }
  }

  async function copyPlan() {
    const text = `ProfitPnL Daily Trading Plan — ${todayKey()}\n\nStatus: ${plan.riskLevel}\nMax trades: ${plan.maxTrades}\nRisk per trade: ${plan.riskPerTrade ? money(plan.riskPerTrade) : plan.riskScale}\n\nAllowed setups:\n${plan.allowedSetups.map((x) => `- ${x}`).join("\n")}\n\nAvoid:\n${(plan.avoidList.length ? plan.avoidList : ["No avoid list today"]).map((x) => `- ${x}`).join("\n")}\n\nStop rules:\n${plan.stopRules.map((x) => `- ${x}`).join("\n")}\n\nFocus: ${plan.focus}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (!user) return null;

  return (
    <AppShell title="Daily Trading Plan" subtitle="Generate today&apos;s risk rules before the first trade.">
      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center text-sm text-[#8080A0]"><Loader2 className="mr-2 animate-spin" /> Building today&apos;s trading plan…</div>
      ) : (
        <div className="mx-auto max-w-6xl space-y-7 pb-24">
          <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(0,208,132,0.12),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%)]" />
            <div className="relative grid gap-7 p-6 lg:grid-cols-[1.35fr_0.8fr] lg:p-8">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]"><Sparkles size={12} /> Pre-Market Command Plan</span>
                  {accepted && <span className="inline-flex items-center gap-2 rounded-full border border-[#00D084]/30 bg-[#00D084]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#00D084]"><CheckCircle2 size={12} /> Accepted</span>}
                </div>
                <div>
                  <h1 className="text-4xl font-black tracking-tighter text-white sm:text-5xl">Today&apos;s Trading Plan</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">{displayName || "Trader"}, open ProfitPnL before you trade. This plan uses your recent journal, Risk-Guard signals, accounts, and playbook to set today&apos;s guardrails.</p>
                </div>
                {accounts.length > 0 && (
                  <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="w-full max-w-md rounded-2xl border border-[#1E1E38] bg-[#080810] px-4 py-3 text-sm font-black text-white outline-none focus:border-[#F0B429]">
                    {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.firm || account.type || "Account"}</option>)}
                  </select>
                )}
              </div>
              <div className={`rounded-[2rem] border ${tone.border} ${tone.bg} p-5`}>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#A0A0C0]">Trading Permission</p>
                <p className={`mt-2 text-4xl font-black tracking-tighter ${tone.text}`}>{plan.riskLevel}</p>
                <p className="mt-2 text-xs leading-6 text-zinc-300">{plan.focus}</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3"><p className="text-[9px] font-black uppercase tracking-wider text-[#5A5A80]">Max Trades</p><p className="mt-1 text-lg font-black text-white">{plan.maxTrades}</p></div>
                  <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3"><p className="text-[9px] font-black uppercase tracking-wider text-[#5A5A80]">Risk</p><p className="mt-1 text-lg font-black text-white">{plan.riskPerTrade ? money(plan.riskPerTrade) : plan.riskScale}</p></div>
                </div>
              </div>
            </div>
          </Card>

          <DailyPlanWorkflowStatus
            briefGenerated={briefGenerated || Boolean(savedPlan?.aiBrief?.summary)}
            accepted={accepted}
            tradesToday={todaysTrades.length}
            cloudSynced={cloudPlanAvailable || Boolean(savedPlan)}
          />

          <PageInsightPanel
            kind="daily-plan"
            persistenceKey={`daily-plan-${todayKey()}-${accountId || "default"}`}
            initialInsight={savedPlan?.aiBrief || null}
            onInsightGenerated={saveGeneratedBrief}
            initialTitle="AI pre-market briefing"
            initialSummary="Generate a deeper AI plan to turn today's guardrails into a clear market permission slip."
            context={{
              riskLevel: plan.riskLevel,
              maxTrades: plan.maxTrades,
              riskPerTrade: plan.riskPerTrade,
              riskScale: plan.riskScale,
              allowedSetups: plan.allowedSetups,
              avoidList: plan.avoidList,
              stopRules: plan.stopRules,
              focus: plan.focus,
              recentStats: {
                totalR: stats.totalR,
                winRate: stats.winRate,
                expectancy: stats.expectancy,
                maxDrawdown: stats.maxDD,
                streak: stats.streak,
              },
              account: accounts.find((account) => account.id === accountId) || null,
              latestShift: shifts[0] || null,
            }}
          />

          <PlanVsExecution plan={trackedPlan} trades={todaysTrades} accepted={accepted} />

          {planNotice && (
            <div className="rounded-2xl border border-[#F0B429]/25 bg-[#F0B429]/10 px-4 py-3 text-sm font-bold text-[#F0B429]">
              {planNotice}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Mini label="30D Net R" value={formatR(stats.totalR)} icon={<Target size={20} />} tone={stats.totalR >= 0 ? "green" : "red"} />
            <Mini label="30D Win Rate" value={stats.count ? formatPct(stats.winRate) : "—"} icon={<Gauge size={20} />} />
            <Mini label="Risk Scale" value={plan.riskScale} icon={<ShieldCheck size={20} />} tone={plan.tone} />
            <Mini label="Journal Sample" value={`${stats.count} trades`} icon={<ClipboardCheck size={20} />} />
          </div>

          <section className="grid gap-7 xl:grid-cols-2">
            <PlanCard title="Allowed Setups" items={plan.allowedSetups} icon={<Zap size={14} />} />
            <PlanCard title="Avoid Today" items={plan.avoidList.length ? plan.avoidList : ["No major avoid pattern detected — stay with verified playbook rules."]} icon={<AlertTriangle size={14} />} />
          </section>

          <section className="grid gap-7 xl:grid-cols-[1fr_1fr]">
            <PlanCard title="Stop Conditions" items={plan.stopRules} icon={<TimerReset size={14} />} />
            <Card className="border-[#F0B429]/20 bg-[#0D0D1A]/95 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-[#F0B429]"><Brain size={14} /> AI Focus Note</h3>
              <p className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-5 text-sm italic leading-8 text-zinc-200">{plan.focus}</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button onClick={acceptPlan} disabled={savingPlan} className="gold-gradient inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-[#080810] disabled:opacity-60"><CheckCircle2 size={16} /> {savingPlan ? "Saving..." : accepted ? "Plan Accepted" : "Accept Plan"}</button>
                <button onClick={copyPlan} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#1E1E38] bg-[#111124] px-5 py-3 text-sm font-black text-zinc-300 hover:text-white"><Copy size={16} /> {copied ? "Copied" : "Copy Plan"}</button>
              </div>
            </Card>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function Mini({ label, value, icon, tone = "gold" }: { label: string; value: string; icon: React.ReactNode; tone?: "gold" | "green" | "red" }) {
  const cls = tone === "green" ? "text-[#00D084]" : tone === "red" ? "text-[#FF4565]" : "text-[#F0B429]";
  return <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p><p className={`mt-2 truncate text-2xl font-black ${cls}`}>{value}</p></div><div className={cls}>{icon}</div></div></Card>;
}
