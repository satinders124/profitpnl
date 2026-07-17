"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { PageInsightPanel } from "@/components/ai/PageInsightPanel";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAccounts, getTrades } from "@/lib/db";
import { TradingAccount } from "@/types/account";
import { Trade } from "@/types/trade";
import { AlertTriangle, CheckCircle2, Gauge, Loader2, ShieldCheck, Target, TrendingDown, Trophy, Wallet } from "lucide-react";

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value: number) {
  return `${value >= 0 ? "" : "-"}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function ruleAmount(value: unknown, accountSize: number, defaultPercent: number) {
  const parsed = num(value, 0);
  if (parsed > 0) {
    // Account form stores prop rules as percentages (e.g. 6 = 6%).
    // If an older/manual account has a large dollar amount, keep it as dollars.
    return parsed <= 100 ? accountSize * (parsed / 100) : parsed;
  }
  return accountSize * (defaultPercent / 100);
}

function ruleLabel(value: unknown, amount: number, defaultPercent: number) {
  const parsed = num(value, 0);
  const percent = parsed > 0 && parsed <= 100 ? parsed : parsed > 100 ? null : defaultPercent;
  return percent ? `${money(amount)} (${percent}%)` : money(amount);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function pnlForTrades(trades: Trade[]) {
  return trades.reduce((sum, trade) => sum + num(trade.pnl, 0), 0);
}

function dayTotals(trades: Trade[]) {
  const map = new Map<string, number>();
  for (const trade of trades) {
    if (!trade.date) continue;
    map.set(trade.date, (map.get(trade.date) || 0) + num(trade.pnl, 0));
  }
  return Array.from(map.entries()).map(([date, pnl]) => ({ date, pnl })).sort((a, b) => b.pnl - a.pnl);
}

function healthScore({ progress, dailyBuffer, drawdownBuffer, consistencyRisk }: { progress: number; dailyBuffer: number; drawdownBuffer: number; consistencyRisk: number }) {
  let score = 55;
  score += Math.min(25, Math.max(0, progress * 25));
  score += dailyBuffer > 0 ? 10 : -20;
  score += drawdownBuffer > 0 ? 10 : -25;
  score -= consistencyRisk > 0.45 ? 15 : consistencyRisk > 0.35 ? 7 : 0;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function grade(score: number) {
  if (score >= 80) return { label: "Payout Safe", color: "#00D084" };
  if (score >= 60) return { label: "Controlled", color: "#F0B429" };
  return { label: "At Risk", color: "#FF4565" };
}

function Stat({ label, value, sub, icon, tone = "gold" }: { label: string; value: string; sub: string; icon: React.ReactNode; tone?: "gold" | "green" | "red" }) {
  const color = tone === "green" ? "#00D084" : tone === "red" ? "#FF4565" : "#F0B429";
  return (
    <Card className="relative overflow-hidden border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full opacity-15 blur-2xl" style={{ backgroundColor: color }} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p><p className="mt-2 truncate text-2xl font-black text-white">{value}</p><p className="mt-1 text-xs text-[#8080A0]">{sub}</p></div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-black/20" style={{ color, borderColor: `${color}40` }}>{icon}</div>
      </div>
    </Card>
  );
}

export default function PropFirmChallengePage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [accountRows, tradeRows] = await Promise.all([getAccounts(user.id), getTrades(user.id)]);
      setAccounts(accountRows);
      setTrades(tradeRows);
      setSelectedAccountId((current) => current || accountRows[0]?.id || "");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const selected = accounts.find((account) => account.id === selectedAccountId) || accounts[0];
  const accountTrades = useMemo(() => selected ? trades.filter((trade) => !trade.account || trade.account === selected.name) : trades, [trades, selected]);
  const totals = useMemo(() => dayTotals(accountTrades), [accountTrades]);
  const realizedPnl = pnlForTrades(accountTrades);

  const rawAccountSize = selected ? num(selected.size, 0) : 0;
  const startingBalance = selected ? num(selected.startingBalance, rawAccountSize) : 0;
  const accountSize = rawAccountSize || startingBalance;
  const currentBalance = selected && selected.currentBalance !== "" && selected.currentBalance !== null && selected.currentBalance !== undefined
    ? num(selected.currentBalance, startingBalance + realizedPnl)
    : startingBalance + realizedPnl;
  const profitTarget = selected ? ruleAmount(selected.profitTarget, accountSize, 10) : 0;
  const dailyLoss = selected ? ruleAmount(selected.dailyLoss, accountSize, 5) : 0;
  const maxDrawdown = selected ? ruleAmount(selected.maxDD, accountSize, 10) : 0;
  const profit = currentBalance - startingBalance;
  const targetBalance = startingBalance + profitTarget;
  const progress = profitTarget > 0 ? Math.max(0, Math.min(1, profit / profitTarget)) : 0;
  const todayPnl = totals.find((day) => day.date === todayIso())?.pnl || 0;
  const dailyBuffer = dailyLoss + todayPnl;
  const drawdownFloor = startingBalance - maxDrawdown;
  const drawdownBuffer = currentBalance - drawdownFloor;
  const biggestWinningDay = Math.max(0, ...totals.map((day) => day.pnl));
  const consistencyRisk = profit > 0 ? biggestWinningDay / profit : 0;
  const score = healthScore({ progress, dailyBuffer, drawdownBuffer, consistencyRisk });
  const g = grade(score);

  if (!user) return null;

  return (
    <AppShell title="Prop Firm Challenge" subtitle="Track challenge health, drawdown buffers, and payout safety.">
      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center text-sm text-[#8080A0]"><Loader2 className="mr-2 animate-spin" /> Loading challenge data…</div>
      ) : accounts.length === 0 ? (
        <Card className="mx-auto max-w-2xl p-8 text-center"><Trophy className="mx-auto text-[#F0B429]" size={42} /><h2 className="mt-4 text-2xl font-black text-white">Create a prop firm account first</h2><p className="mt-3 text-sm leading-7 text-[#A0A0C0]">Add account size, profit target, max drawdown, and daily loss limit so ProfitPnL can monitor challenge safety.</p><Link href="/accounts" className="gold-gradient mt-6 inline-flex rounded-2xl px-6 py-3 text-sm font-black text-[#080810]">Open Accounts</Link></Card>
      ) : (
        <div className="mx-auto max-w-6xl space-y-7 pb-24">
          <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(0,208,132,0.12),transparent_30%)]" />
            <div className="relative grid gap-7 p-6 lg:grid-cols-[1.35fr_0.8fr] lg:p-8">
              <div className="space-y-5"><div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]"><ShieldCheck size={12} /> Prop Firm Command Center</div><h1 className="text-4xl font-black tracking-tighter text-white sm:text-5xl">Challenge Health Monitor</h1><p className="max-w-2xl text-sm leading-7 text-[#A0A0C0]">Stay inside payout rules. Monitor target progress, daily loss buffer, maximum drawdown, and consistency concentration before you place another trade.</p><select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="w-full max-w-md rounded-2xl border border-[#1E1E38] bg-[#080810] px-4 py-3 text-sm font-black text-white outline-none focus:border-[#F0B429]">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.firm || account.type || "Account"}</option>)}</select></div>
              <div className="rounded-[2rem] border border-[#1E1E38] bg-[#0B0B16]/90 p-5"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5A5A80]">Challenge Score</p><p className="mt-1 text-5xl font-black" style={{ color: g.color }}>{score}</p><p className="mt-1 text-sm font-black" style={{ color: g.color }}>{g.label}</p><div className="mt-5 h-3 overflow-hidden rounded-full bg-[#1E1E38]"><div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: g.color }} /></div></div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Stat label="Target Progress" value={`${Math.round(progress * 100)}%`} sub={`${money(Math.max(0, targetBalance - currentBalance))} remaining`} icon={<Target size={20} />} tone={progress >= 1 ? "green" : "gold"} />
            <Stat label="Daily Buffer" value={money(dailyBuffer)} sub={`Limit: ${ruleLabel(selected?.dailyLoss, dailyLoss, 5)} · Today: ${money(todayPnl)}`} icon={<Gauge size={20} />} tone={dailyBuffer > 0 ? "green" : "red"} />
            <Stat label="Drawdown Buffer" value={money(drawdownBuffer)} sub={`Floor: ${money(drawdownFloor)}`} icon={<TrendingDown size={20} />} tone={drawdownBuffer > 0 ? "green" : "red"} />
            <Stat label="Consistency Risk" value={profit > 0 ? `${Math.round(consistencyRisk * 100)}%` : "—"} sub={`Biggest win day: ${money(biggestWinningDay)}`} icon={<AlertTriangle size={20} />} tone={consistencyRisk > 0.45 ? "red" : "green"} />
          </div>

          <PageInsightPanel
            kind="prop-firm"
            initialTitle="Claude prop firm risk briefing"
            initialSummary="Generate a challenge safety read before you risk more capital."
            context={{
              account: selected,
              score,
              grade: g.label,
              accountSize,
              startingBalance,
              currentBalance,
              profit,
              profitTarget,
              progress,
              dailyLoss,
              todayPnl,
              dailyBuffer,
              maxDrawdown,
              drawdownFloor,
              drawdownBuffer,
              consistencyRisk,
              biggestWinningDay,
            }}
          />

          <section className="grid gap-7 xl:grid-cols-[1fr_1fr]">
            <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5"><h2 className="flex items-center gap-2 text-lg font-black text-white"><Wallet className="text-[#F0B429]" /> Account Snapshot</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><Mini label="Starting" value={money(startingBalance)} /><Mini label="Current" value={money(currentBalance)} /><Mini label="Profit Target" value={ruleLabel(selected?.profitTarget, profitTarget, 10)} /><Mini label="Max Drawdown" value={ruleLabel(selected?.maxDD, maxDrawdown, 10)} /></div></Card>
            <Card className="border-[#F0B429]/20 bg-[#0D0D1A]/95 p-5"><h2 className="flex items-center gap-2 text-lg font-black text-white"><CheckCircle2 className="text-[#F0B429]" /> AI Rule Verdict</h2><div className="mt-5 space-y-3 text-sm leading-7 text-zinc-300"><p>{dailyBuffer <= 0 ? "Stop trading today. Daily loss buffer is breached or too close." : "Daily loss buffer is available, but keep risk fixed and avoid scaling up."}</p><p>{drawdownBuffer <= maxDrawdown * 0.25 ? "Maximum drawdown buffer is tight. Reduce risk until the account recovers." : "Max drawdown buffer is healthy enough for planned risk."}</p><p>{consistencyRisk > 0.45 ? "Consistency warning: one day is carrying too much of the profit. Avoid oversized wins that risk payout rules." : "Consistency profile is acceptable based on logged P&L."}</p></div></Card>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p><p className="mt-2 text-lg font-black text-white">{value}</p></div>;
}
