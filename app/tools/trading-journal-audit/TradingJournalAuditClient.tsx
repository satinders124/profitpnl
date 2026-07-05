"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Upload, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ToolShell } from "@/components/tools/ToolShell";
import { analyzeTrades, parseTradesCsv } from "@/lib/growth/tool-analysis";

const sampleCsv = `date,instrument,direction,setup,session,emotion,result,pnl
2026-07-01,NQ,LONG,Opening Range Breakout,New York,Focused,2.4,480
2026-07-02,ES,SHORT,FVG Retest,New York,FOMO,-1,-200
2026-07-03,XAUUSD,LONG,Liquidity Sweep,London,Calm,1.8,360
2026-07-04,NQ,LONG,Opening Range Breakout,New York,Focused,-0.5,-100
2026-07-05,BTCUSD,SHORT,Range Fade,Asia,Tired,-1,-150`;

function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "bull" | "bear" | "gold" | "neutral" }) {
  const cls = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : tone === "gold" ? "text-gold" : "text-txt";
  return (
    <div className="rounded-2xl border border-line bg-ink2/70 p-4">
      <p className="font-mono2 text-[11px] uppercase tracking-widest text-dim">{label}</p>
      <p className={`mt-2 font-mono2 text-2xl font-bold ${cls}`}>{value}</p>
    </div>
  );
}

export default function TradingJournalAuditClient() {
  const [csv, setCsv] = useState(sampleCsv);
  const trades = useMemo(() => parseTradesCsv(csv), [csv]);
  const audit = useMemo(() => analyzeTrades(trades), [trades]);

  async function onFile(file?: File) {
    if (!file) return;
    setCsv(await file.text());
  }

  return (
    <ToolShell
      eyebrow="AI-Style Trade Audit"
      title="AI Trading Journal Audit"
      description="Paste or upload a CSV and get an instant performance audit: edge score, leaks, strengths, best setups, worst sessions, and a concrete action plan. Runs locally in your browser."
      currentPath="/tools/trading-journal-audit"
      content={<AuditSeo />}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="profit-card p-6 lg:col-span-3">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-txt">Journal CSV</h2>
              <p className="mt-1 text-sm text-muted2">Needs at least a result/R column. Setup, session, and emotion improve the audit.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-gold hover:border-gold/50">
              <Upload size={16} /> Upload CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => onFile(event.target.files?.[0])} />
            </label>
          </div>
          <textarea
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            className="min-h-[360px] w-full rounded-2xl border border-line bg-ink2 p-4 font-mono2 text-xs leading-relaxed text-txt outline-none focus:border-gold/70"
          />
        </section>

        <aside className="space-y-5 lg:col-span-2">
          <div className="profit-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono2 text-xs uppercase tracking-widest text-gold">ProfitPnL Edge Score</p>
                <p className="mt-2 text-5xl font-black text-txt">{audit.edgeScore}<span className="text-xl text-dim">/100</span></p>
              </div>
              <Sparkles className="text-gold" size={36} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Stat label="Trades" value={String(audit.count)} />
              <Stat label="Win Rate" value={`${(audit.winRate * 100).toFixed(1)}%`} tone="gold" />
              <Stat label="Expectancy" value={`${audit.expectancy >= 0 ? "+" : ""}${audit.expectancy.toFixed(2)}R`} tone={audit.expectancy >= 0 ? "bull" : "bear"} />
              <Stat label="Profit Factor" value={audit.profitFactor >= 99 ? "∞" : audit.profitFactor.toFixed(2)} tone={audit.profitFactor >= 1 ? "bull" : "bear"} />
            </div>
          </div>

          <div className="profit-card p-6">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-txt"><AlertTriangle size={18} className="text-bear" /> Top Leaks</h3>
            <ul className="space-y-2 text-sm text-muted2">
              {audit.leaks.map((leak) => <li key={leak} className="rounded-xl border border-line bg-ink2/70 p-3">{leak}</li>)}
            </ul>
          </div>

          <div className="profit-card p-6">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-txt"><CheckCircle2 size={18} className="text-bull" /> Strengths</h3>
            <ul className="space-y-2 text-sm text-muted2">
              {audit.strengths.map((strength) => <li key={strength} className="rounded-xl border border-line bg-ink2/70 p-3">{strength}</li>)}
            </ul>
            <Link href="/register" className="gold-gradient mt-4 inline-flex w-full justify-center rounded-xl px-4 py-3 text-sm font-bold text-ink">Track This Automatically</Link>
          </div>
        </aside>
      </div>
    </ToolShell>
  );
}

function AuditSeo() {
  return (
    <article className="space-y-6 text-sm leading-relaxed text-muted2">
      <h2 className="text-xl font-bold text-txt">What is a trading journal audit?</h2>
      <p>A trading journal audit turns raw trade history into a diagnosis: where your edge comes from, what leaks R, and what behavior to fix next.</p>
      <p>This public MVP is rule-based and privacy-friendly. For ongoing AI coaching, save trades inside ProfitPnL and let the platform review your journal automatically.</p>
    </article>
  );
}
