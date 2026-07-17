"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { getTrades, saveTrade } from "@/lib/db";
import { Trade } from "@/types/trade";
import { ClipboardCheck, Loader2, Save, Sparkles, Tag, Target } from "lucide-react";

const emotions = ["Calm", "Confident", "FOMO", "Anxious", "Revenge", "Bored", "Greedy", "Fearful"];
const mistakes = ["None", "Late entry", "Moved stop", "Chased", "Oversized", "No plan", "Revenge trade", "Exited early"];

function needsReview(trade: Trade) {
  return !trade.reviewed || !trade.emotion || !trade.lesson || !trade.mistake;
}

function formatR(value: unknown) {
  const parsed = Number(value || 0);
  return `${parsed >= 0 ? "+" : ""}${parsed.toFixed(2)}R`;
}

export default function TradeReviewPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<Trade>>({});

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rows = await getTrades(user.id);
      setTrades(rows);
      const first = rows.find(needsReview) || rows[0];
      setSelectedId(first?.id || "");
      setDraft(first || {});
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const queue = useMemo(() => trades.filter(needsReview), [trades]);
  const selected = trades.find((trade) => trade.id === selectedId);
  const reviewedCount = trades.length - queue.length;
  const completion = trades.length ? Math.round((reviewedCount / trades.length) * 100) : 0;

  function selectTrade(trade: Trade) {
    setSelectedId(trade.id);
    setDraft(trade);
  }

  async function saveReview() {
    if (!user || !selected) return;
    setSaving(true);
    try {
      await saveTrade(user.id, { ...selected, ...draft, reviewed: true });
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <AppShell title="Trade Review Queue" subtitle="Process trades like an inbox and turn executions into lessons.">
      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center text-sm text-[#8080A0]"><Loader2 className="mr-2 animate-spin" /> Loading review queue…</div>
      ) : (
        <div className="mx-auto max-w-6xl space-y-7 pb-24">
          <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40"><div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(0,208,132,0.10),transparent_30%)]" /><div className="relative grid gap-7 p-6 lg:grid-cols-[1.35fr_0.8fr] lg:p-8"><div><div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]"><ClipboardCheck size={12} /> Execution Review Desk</div><h1 className="mt-5 text-4xl font-black tracking-tighter text-white sm:text-5xl">Trade Review Queue</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">Complete emotion, mistake, lesson, and review status so AI can find your real leaks.</p></div><div className="rounded-[2rem] border border-[#1E1E38] bg-[#0B0B16]/90 p-5"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5A5A80]">Review Completion</p><p className="mt-2 text-5xl font-black text-[#F0B429]">{completion}%</p><p className="mt-1 text-xs text-[#8080A0]">{queue.length} trade{queue.length === 1 ? "" : "s"} still need attention.</p><div className="mt-5 h-3 overflow-hidden rounded-full bg-[#1E1E38]"><div className="h-full rounded-full bg-[#F0B429]" style={{ width: `${completion}%` }} /></div></div></div></Card>

          <section className="grid gap-7 xl:grid-cols-[0.8fr_1.2fr]">
            <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5"><h2 className="mb-5 text-lg font-black text-white">Queue</h2>{queue.length === 0 ? <p className="rounded-2xl border border-[#00D084]/25 bg-[#00D084]/10 p-5 text-sm font-bold text-[#00D084]">All trades are reviewed.</p> : <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1 no-scrollbar">{queue.map((trade) => <button key={trade.id} onClick={() => selectTrade(trade)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === trade.id ? "border-[#F0B429]/40 bg-[#F0B429]/10" : "border-[#1E1E38] bg-[#080810] hover:border-white/20"}`}><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-black text-white">{trade.instrument || "Instrument"}</p><span className={Number(trade.result || 0) >= 0 ? "text-[#00D084]" : "text-[#FF4565]"}>{formatR(trade.result)}</span></div><p className="mt-1 text-xs text-[#8080A0]">{trade.date} · {trade.setup || "No setup"}</p></button>)}</div>}</Card>

            <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
              {!selected ? <p className="rounded-2xl border border-dashed border-[#2A2A3C] bg-[#080810] p-8 text-center text-sm text-zinc-500">Select a trade to review.</p> : <div className="space-y-5"><div className="flex flex-col gap-3 border-b border-[#1E1E38] pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black text-white">{selected.instrument}</h2><p className="mt-1 text-xs text-[#8080A0]">{selected.date} · {selected.setup || "No setup"} · {formatR(selected.result)}</p></div><button onClick={saveReview} disabled={saving} className="gold-gradient inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-[#080810] disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Review</button></div>
                <div><p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F0B429]"><Sparkles size={12} /> Emotion</p><div className="flex flex-wrap gap-2">{emotions.map((emotion) => <button key={emotion} onClick={() => setDraft((d) => ({ ...d, emotion }))} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${draft.emotion === emotion ? "border-[#F0B429]/40 bg-[#F0B429]/15 text-[#F0B429]" : "border-[#1E1E38] bg-[#080810] text-zinc-400"}`}>{emotion}</button>)}</div></div>
                <div><p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F0B429]"><Tag size={12} /> Mistake</p><div className="flex flex-wrap gap-2">{mistakes.map((mistake) => <button key={mistake} onClick={() => setDraft((d) => ({ ...d, mistake }))} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${draft.mistake === mistake ? "border-[#F0B429]/40 bg-[#F0B429]/15 text-[#F0B429]" : "border-[#1E1E38] bg-[#080810] text-zinc-400"}`}>{mistake}</button>)}</div></div>
                <label className="block"><p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F0B429]"><Target size={12} /> Lesson</p><textarea value={String(draft.lesson || "")} onChange={(e) => setDraft((d) => ({ ...d, lesson: e.target.value }))} placeholder="What is the one lesson this trade teaches?" className="h-28 w-full resize-none rounded-2xl border border-[#1E1E38] bg-[#080810] p-4 text-sm text-white outline-none focus:border-[#F0B429]" /></label>
                <label className="block"><p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">Review Notes</p><textarea value={String(draft.notes || "")} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="Add chart context, execution notes, and rule feedback." className="h-32 w-full resize-none rounded-2xl border border-[#1E1E38] bg-[#080810] p-4 text-sm text-white outline-none focus:border-[#F0B429]" /></label>
              </div>}
            </Card>
          </section>
        </div>
      )}
    </AppShell>
  );
}
