"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAccounts, getPlaybook, getTrades } from "@/lib/db";
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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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
      setAccepted(localStorage.getItem(`profitpnl_daily_plan_${todayKey()}`) === "accepted");
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

  function acceptPlan() {
    localStorage.setItem(`profitpnl_daily_plan_${todayKey()}`, "accepted");
    setAccepted(true);
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
                <button onClick={acceptPlan} className="gold-gradient inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-[#080810]"><CheckCircle2 size={16} /> Accept Plan</button>
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
