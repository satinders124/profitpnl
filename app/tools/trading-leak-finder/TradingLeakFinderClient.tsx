"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ToolShell } from "@/components/tools/ToolShell";

const questions = [
  ["I increase size after a losing trade", "revenge"],
  ["I enter late because I fear missing the move", "fomo"],
  ["I move my stop once price gets close", "discipline"],
  ["I close winners early before my plan says to", "exit"],
  ["I trade outside my best session or routine", "routine"],
  ["I take B/C setups after missing an A setup", "selectivity"],
  ["I keep trading after hitting my daily loss limit", "risk"],
  ["I do not review screenshots after the session", "review"],
] as const;

const leakCopy: Record<string, { title: string; fix: string }> = {
  revenge: { title: "Revenge Sizing", fix: "Hard rule: after any full -1R loss, next trade risk is capped or you stop for 20 minutes." },
  fomo: { title: "FOMO Entries", fix: "Use a missed-trade rule: if entry trigger is gone, the setup is invalid until a new trigger forms." },
  discipline: { title: "Stop-Loss Interference", fix: "Screenshot the invalidation level before entry and only move stop for pre-written reasons." },
  exit: { title: "Early Profit Taking", fix: "Scale partials only at planned levels; journal every early exit with the emotion that caused it." },
  routine: { title: "Routine Drift", fix: "Define your best session and make all other trades half size or paper-only until proven." },
  selectivity: { title: "Low-Quality Setup Creep", fix: "Grade setups A/B/C before entry. Only A setups get full risk." },
  risk: { title: "Daily Loss Rule Breaks", fix: "Use a lockout rule: after daily limit, platform is closed and review begins." },
  review: { title: "No Feedback Loop", fix: "Review 5 screenshots every Friday and write one behavior to repeat/remove next week." },
};

export default function TradingLeakFinderClient() {
  const [scores, setScores] = useState<Record<string, number>>({});
  const result = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const [, key] of questions) totals[key] = scores[key] || 0;
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [scores]);

  return (
    <ToolShell eyebrow="Behavior Audit" title="Trading Leak Finder" description="Answer a quick execution and psychology quiz to identify your top trading leaks and get a practical action plan." currentPath="/tools/trading-leak-finder">
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="profit-card space-y-4 p-6 lg:col-span-3">
          {questions.map(([question, key]) => (
            <div key={question} className="rounded-2xl border border-line bg-ink2/70 p-4">
              <p className="text-sm font-semibold text-txt">{question}</p>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((score) => (
                  <button key={score} onClick={() => setScores((s) => ({ ...s, [key]: score }))} className={`rounded-lg border px-2 py-2 text-xs font-bold ${scores[key] === score ? "border-gold bg-gold/10 text-gold" : "border-line text-muted2"}`}>{score}</button>
                ))}
              </div>
              <p className="mt-2 text-xs text-dim">0 = never, 4 = often</p>
            </div>
          ))}
        </section>
        <aside className="profit-card p-6 lg:col-span-2">
          <p className="font-mono2 text-xs uppercase tracking-widest text-gold">Your top leaks</p>
          <div className="mt-4 space-y-3">
            {result.map(([key, score], index) => {
              const leak = leakCopy[key];
              return (
                <div key={key} className="rounded-2xl border border-line bg-ink2/70 p-4">
                  <p className="text-sm font-bold text-txt">#{index + 1} {leak.title}</p>
                  <p className="mt-1 text-xs text-dim">Score: {score}/4</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted2">{leak.fix}</p>
                </div>
              );
            })}
          </div>
          <Link href="/register" className="gold-gradient mt-5 inline-flex w-full justify-center rounded-xl px-4 py-3 text-sm font-bold text-ink">Track Leaks in ProfitPnL</Link>
        </aside>
      </div>
    </ToolShell>
  );
}
