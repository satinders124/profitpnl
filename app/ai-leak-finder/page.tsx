"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { PageInsightPanel } from "@/components/ai/PageInsightPanel";
import { useAuth } from "@/components/providers/AuthProvider";
import { getTrades } from "@/lib/db";
import { Trade } from "@/types/trade";
import { calcStats, formatPct, formatR, hasResult } from "@/lib/stats";
import { Brain, Flame, Loader2, Search, ShieldAlert, Sparkles, Target } from "lucide-react";

type Leak = {
  dimension: string;
  name: string;
  trades: number;
  totalR: number;
  winRate: number;
  expectancy: number;
  fix: string;
};

function groupBy(trades: Trade[], dimension: string, getKey: (trade: Trade) => string, fix: (name: string) => string): Leak[] {
  const groups = new Map<string, Trade[]>();
  for (const trade of trades.filter(hasResult)) {
    const key = getKey(trade).trim() || "Unknown";
    const bucket = groups.get(key) || [];
    bucket.push(trade);
    groups.set(key, bucket);
  }
  return Array.from(groups.entries())
    .map(([name, rows]) => {
      const stats = calcStats(rows);
      return { dimension, name, trades: stats.count, totalR: stats.totalR, winRate: stats.winRate, expectancy: stats.expectancy, fix: fix(name) };
    })
    .filter((row) => row.trades >= 2 && row.totalR < 0)
    .sort((a, b) => a.totalR - b.totalR);
}

function weekday(date?: string) {
  if (!date) return "Unknown";
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleDateString("en-US", { weekday: "long" });
}

function hourBucket(time?: string) {
  if (!time) return "No time logged";
  const hour = Number(time.slice(0, 2));
  if (!Number.isFinite(hour)) return "No time logged";
  if (hour < 6) return "Overnight";
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

function buildLeaks(trades: Trade[]) {
  return [
    ...groupBy(trades, "Setup", (t) => t.setup || "No setup", (name) => `Pause or reduce ${name} until you review screenshots and checklist rules.`),
    ...groupBy(trades, "Instrument", (t) => t.instrument || "No instrument", (name) => `Cut size on ${name} and only trade it with your highest-confidence playbook.`),
    ...groupBy(trades, "Session", (t) => t.session || "No session", (name) => `Add a rule for ${name}: max 1-2 trades and no entries after a loss.`),
    ...groupBy(trades, "Emotion", (t) => t.emotion || "No emotion", (name) => `When ${name} appears, pause for 10 minutes before placing another trade.`),
    ...groupBy(trades, "Mistake", (t) => t.mistake || "No mistake", (name) => `Create a hard checklist item against ${name} before every entry.`),
    ...groupBy(trades, "Day", (t) => weekday(t.date), (name) => `Treat ${name} as a caution day until it turns positive over a larger sample.`),
    ...groupBy(trades, "Time Window", (t) => hourBucket(t.time), (name) => `Reduce trading during the ${name} window unless a top setup appears.`),
  ].sort((a, b) => a.totalR - b.totalR);
}

function topPatternText(leak?: Leak) {
  if (!leak) return "No statistically meaningful negative leak detected yet. Keep logging setup, emotion, mistake, session, and time on every trade.";
  return `Your biggest leak is ${leak.dimension.toLowerCase()} “${leak.name}”, costing ${formatR(leak.totalR)} across ${leak.trades} trades with ${formatPct(leak.winRate)} win rate. ${leak.fix}`;
}

export default function AiLeakFinderPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

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

  const leaks = useMemo(() => buildLeaks(trades), [trades]);
  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return clean ? leaks.filter((leak) => `${leak.dimension} ${leak.name}`.toLowerCase().includes(clean)) : leaks;
  }, [leaks, query]);
  const mainLeak = leaks[0];
  const closedCount = trades.filter(hasResult).length;

  if (!user) return null;

  return (
    <AppShell title="AI Leak Finder" subtitle="Find the exact behavior, setup, and condition costing you R.">
      {loading ? <div className="flex min-h-[420px] items-center justify-center text-sm text-[#8080A0]"><Loader2 className="mr-2 animate-spin" /> Scanning journal leaks…</div> : (
        <div className="mx-auto max-w-6xl space-y-7 pb-24">
          <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40"><div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(255,69,101,0.12),transparent_30%)]" /><div className="relative grid gap-7 p-6 lg:grid-cols-[1.3fr_0.8fr] lg:p-8"><div><div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]"><Sparkles size={12} /> AI Leak Intelligence</div><h1 className="mt-5 text-4xl font-black tracking-tighter text-white sm:text-5xl">AI Leak Finder</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">ProfitPnL scans setup, instrument, session, emotion, mistake, weekday, and time windows to show where your edge is bleeding.</p></div><div className="rounded-[2rem] border border-[#FF4565]/25 bg-[#FF4565]/10 p-5"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#FF9AAA]">Primary Leak</p><p className="mt-2 text-2xl font-black text-white">{mainLeak ? mainLeak.name : "No leak yet"}</p><p className="mt-2 text-xs leading-6 text-zinc-300">{topPatternText(mainLeak)}</p></div></div></Card>

          <PageInsightPanel
            kind="leak-finder"
            initialTitle="AI leak diagnosis"
            initialSummary="Generate an AI diagnosis that turns the highest R-cost pattern into a concrete rule and correction plan."
            context={{
              closedTrades: closedCount,
              mainLeak,
              topLeaks: leaks.slice(0, 8),
            }}
          />

          <section className="grid gap-4 md:grid-cols-3"><Stat label="Closed Trades" value={String(closedCount)} icon={<Target size={20} />} /><Stat label="Leaks Found" value={String(leaks.length)} icon={<ShieldAlert size={20} />} tone="red" /><Stat label="Worst Cost" value={mainLeak ? formatR(mainLeak.totalR) : "—"} icon={<Flame size={20} />} tone="red" /></section>

          <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5"><div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Leak Board</p><h2 className="mt-1 text-lg font-black text-white">Ranked by R cost</h2></div><div className="relative w-full lg:max-w-sm"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A5A80]" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search leaks…" className="w-full rounded-2xl border border-[#1E1E38] bg-[#080810] py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-[#F0B429]" /></div></div>{filtered.length === 0 ? <p className="rounded-2xl border border-dashed border-[#2A2A3C] bg-[#080810] p-8 text-center text-sm text-zinc-500">No matching leaks. Add more tagged trades for stronger detection.</p> : <div className="grid gap-4 lg:grid-cols-2">{filtered.map((leak) => <div key={`${leak.dimension}-${leak.name}`} className="rounded-[1.5rem] border border-[#1E1E38] bg-[#080810] p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><span className="rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#F0B429]">{leak.dimension}</span><h3 className="mt-3 truncate text-base font-black text-white" title={leak.name}>{leak.name}</h3><p className="mt-1 text-xs text-[#8080A0]">{leak.trades} trades · {formatPct(leak.winRate)} WR · {formatR(leak.expectancy)} expectancy</p></div><span className="text-lg font-black text-[#FF4565]">{formatR(leak.totalR)}</span></div><div className="mt-4 rounded-2xl border border-[#1E1E38] bg-[#111124] p-3"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F0B429]"><Brain size={12} /> Fix</p><p className="mt-2 text-xs leading-6 text-zinc-300">{leak.fix}</p></div></div>)}</div>}</Card>
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value, icon, tone = "gold" }: { label: string; value: string; icon: React.ReactNode; tone?: "gold" | "red" }) {
  const color = tone === "red" ? "#FF4565" : "#F0B429";
  return <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p></div><div style={{ color }}>{icon}</div></div></Card>;
}
