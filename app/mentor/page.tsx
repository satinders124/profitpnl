"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { PageInsightPanel } from "@/components/ai/PageInsightPanel";
import { useAuth } from "@/components/providers/AuthProvider";
import { getTrades } from "@/lib/db";
import { Trade } from "@/types/trade";
import { calcStats, formatPct, formatR, hasResult } from "@/lib/stats";
import { Award, Brain, CheckCircle2, Copy, GraduationCap, Loader2, MessageSquare, ShieldCheck, Users } from "lucide-react";

function setupBreakdown(trades: Trade[]) {
  const map = new Map<string, Trade[]>();
  for (const trade of trades.filter(hasResult)) {
    const key = trade.setup || "Unassigned";
    const rows = map.get(key) || [];
    rows.push(trade);
    map.set(key, rows);
  }
  return Array.from(map.entries()).map(([name, rows]) => ({ name, stats: calcStats(rows) })).sort((a, b) => b.stats.totalR - a.stats.totalR);
}

function reviewNeeds(trades: Trade[]) {
  return trades.filter((trade) => hasResult(trade) && (!trade.reviewed || !trade.emotion || !trade.lesson));
}

export default function MentorModePage() {
  const { user, displayName } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setTrades(await getTrades(user.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const stats = useMemo(() => calcStats(trades), [trades]);
  const setups = useMemo(() => setupBreakdown(trades), [trades]);
  const queue = useMemo(() => reviewNeeds(trades), [trades]);
  const best = setups[0];
  const weakest = setups.slice().reverse()[0];

  async function copyMentorPacket() {
    const text = `ProfitPnL Mentor Packet\nTrader: ${displayName || user?.email || "Trader"}\nClosed trades: ${stats.count}\nTotal R: ${formatR(stats.totalR)}\nWin rate: ${formatPct(stats.winRate)}\nExpectancy: ${formatR(stats.expectancy)}\nBest setup: ${best?.name || "None"}\nReview queue: ${queue.length} trades\n\nCoach focus:\n1. Review weakest setup: ${weakest?.name || "None"}\n2. Check trades missing emotion/lesson\n3. Confirm risk consistency before increasing size`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (!user) return null;

  return (
    <AppShell title="Mentor Mode" subtitle="Package your journal for coach review and accountability.">
      {loading ? <div className="flex min-h-[420px] items-center justify-center text-sm text-[#8080A0]"><Loader2 className="mr-2 animate-spin" /> Preparing mentor workspace…</div> : (
        <div className="mx-auto max-w-6xl space-y-7 pb-24">
          <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40"><div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(76,130,251,0.12),transparent_30%)]" /><div className="relative grid gap-7 p-6 lg:grid-cols-[1.3fr_0.8fr] lg:p-8"><div><div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]"><GraduationCap size={12} /> Coach Workspace</div><h1 className="mt-5 text-4xl font-black tracking-tighter text-white sm:text-5xl">Mentor Mode</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">A coach-ready snapshot of your journal: performance, best setup, weakest area, and trades that need review. Full invite-based coach access can build on this foundation.</p></div><div className="rounded-[2rem] border border-[#1E1E38] bg-[#0B0B16]/90 p-5"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5A5A80]">Mentor Packet</p><p className="mt-2 text-4xl font-black text-[#F0B429]">{stats.count}</p><p className="mt-1 text-xs text-[#8080A0]">Closed trades available for review.</p><button onClick={copyMentorPacket} className="gold-gradient mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wider text-[#080810]">{copied ? <CheckCircle2 size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy Mentor Packet"}</button></div></div></Card>

          <PageInsightPanel
            kind="mentor"
            initialTitle="AI mentor briefing"
            initialSummary="Generate a coaching packet that highlights what a mentor should review first."
            context={{
              trader: displayName || user?.email || "Trader",
              stats,
              bestSetup: best?.name || null,
              weakestSetup: weakest?.name || null,
              reviewQueueCount: queue.length,
              setups: setups.slice(0, 6).map((setup) => ({ name: setup.name, totalR: setup.stats.totalR, winRate: setup.stats.winRate, count: setup.stats.count })),
            }}
          />

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Stat label="Total R" value={formatR(stats.totalR)} icon={<Award size={20} />} /><Stat label="Win Rate" value={stats.count ? formatPct(stats.winRate) : "—"} icon={<ShieldCheck size={20} />} /><Stat label="Expectancy" value={formatR(stats.expectancy)} icon={<Brain size={20} />} /><Stat label="Review Queue" value={String(queue.length)} icon={<MessageSquare size={20} />} /></section>

          <section className="grid gap-7 xl:grid-cols-[1fr_1fr]"><Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5"><h2 className="mb-5 flex items-center gap-2 text-lg font-black text-white"><Users className="text-[#F0B429]" /> Coach Focus</h2><div className="space-y-3"><Focus label="Best Setup" value={best?.name || "No setup yet"} detail={best ? `${formatR(best.stats.totalR)} · ${formatPct(best.stats.winRate)} WR` : "Tag setups to unlock."} /><Focus label="Weakest Setup" value={weakest?.name || "No leak yet"} detail={weakest ? `${formatR(weakest.stats.totalR)} · ${weakest.stats.count} trades` : "No underperformer."} /><Focus label="First Assignment" value={queue.length ? `Review ${queue.length} trades` : "Maintain review discipline"} detail="Emotion, mistake, lesson, and notes are required for quality coaching." /></div></Card><Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5"><h2 className="mb-5 text-lg font-black text-white">Trades Needing Coach Attention</h2>{queue.length === 0 ? <p className="rounded-2xl border border-[#00D084]/25 bg-[#00D084]/10 p-5 text-sm font-bold text-[#00D084]">No incomplete trades.</p> : <div className="space-y-3">{queue.slice(0, 8).map((trade) => <div key={trade.id} className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-black text-white">{trade.instrument}</p><span className={Number(trade.result || 0) >= 0 ? "text-[#00D084]" : "text-[#FF4565]"}>{hasResult(trade) ? formatR(Number(trade.result || 0)) : "OPEN"}</span></div><p className="mt-1 text-xs text-[#8080A0]">{trade.date} · {trade.setup || "No setup"}</p></div>)}</div>}</Card></section>
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p></div><div className="text-[#F0B429]">{icon}</div></div></Card>;
}

function Focus({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p><p className="mt-2 truncate text-base font-black text-white">{value}</p><p className="mt-1 text-xs text-[#8080A0]">{detail}</p></div>;
}
