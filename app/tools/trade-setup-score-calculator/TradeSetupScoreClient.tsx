"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/tools/ToolShell";

const checks = [
  ["Higher timeframe trend/context supports the idea", 12],
  ["Entry is at a pre-planned level", 12],
  ["Stop-loss is at real invalidation, not random distance", 14],
  ["Minimum risk-reward is at least 1:2", 12],
  ["No major news/event risk against the trade", 10],
  ["Setup matches my written playbook rules", 16],
  ["I am not revenge trading or chasing", 14],
  ["Position size matches my risk plan", 10],
] as const;

export default function TradeSetupScoreClient() {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const score = useMemo(() => checks.reduce((sum, [label, points]) => sum + (selected[label] ? points : 0), 0), [selected]);
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F";
  const verdict = score >= 80 ? "Trade allowed if execution stays clean." : score >= 60 ? "Reduce risk or wait for more confirmation." : "Skip. Setup quality is not strong enough.";

  return (
    <ToolShell eyebrow="Pre-Trade Checklist" title="Trade Setup Score Calculator" description="Score any trade before entry and avoid low-quality setups, FOMO, and random risk." currentPath="/tools/trade-setup-score-calculator">
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="profit-card p-6 lg:col-span-3">
          <div className="grid gap-3">
            {checks.map(([label, points]) => (
              <label key={label} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-ink2/70 p-4">
                <span className="text-sm font-semibold text-txt">{label}</span>
                <span className="flex items-center gap-3">
                  <span className="font-mono2 text-xs text-dim">+{points}</span>
                  <input type="checkbox" className="h-5 w-5 accent-[#F0B429]" checked={!!selected[label]} onChange={(e) => setSelected((s) => ({ ...s, [label]: e.target.checked }))} />
                </span>
              </label>
            ))}
          </div>
        </section>
        <aside className="profit-card p-6 lg:col-span-2">
          <p className="font-mono2 text-xs uppercase tracking-widest text-gold">Setup Score</p>
          <p className="mt-3 text-6xl font-black text-txt">{score}<span className="text-xl text-dim">/100</span></p>
          <p className="mt-2 text-2xl font-bold text-gold">Grade {grade}</p>
          <p className="mt-4 rounded-2xl border border-line bg-ink2/70 p-4 text-sm leading-relaxed text-muted2">{verdict}</p>
        </aside>
      </div>
    </ToolShell>
  );
}
