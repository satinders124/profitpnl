"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/tools/ToolShell";
import { FieldLabel, NumberField, ResultRow } from "@/components/tools/inputs";

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

export default function PropFirmSurvivalClient() {
  const [account, setAccount] = useState("100000");
  const [target, setTarget] = useState("10");
  const [drawdown, setDrawdown] = useState("10");
  const [risk, setRisk] = useState("1");
  const [winRate, setWinRate] = useState("45");
  const [avgWin, setAvgWin] = useState("2");
  const [avgLoss, setAvgLoss] = useState("1");
  const [trades, setTrades] = useState("80");

  const result = useMemo(() => {
    const wr = Number(winRate) / 100;
    const expectancyR = wr * Number(avgWin) - (1 - wr) * Number(avgLoss);
    const expectedReturn = expectancyR * Number(risk) * Number(trades);
    const targetNeeded = Number(target);
    const dd = Number(drawdown);
    const riskPct = Number(risk);
    const volatility = Math.sqrt(Number(trades)) * riskPct * (Number(avgWin) + Number(avgLoss)) * 0.45;
    const breachRisk = clamp((riskPct / Math.max(0.1, dd / 8)) * 25 + Math.max(0, -expectancyR) * 35 + Math.max(0, volatility - dd) * 2, 3, 95);
    const passChance = clamp(50 + (expectedReturn - targetNeeded) * 3 - breachRisk * 0.35, 2, 92);
    const recommendedRisk = clamp((dd / 10) * Math.max(0.25, expectancyR + 0.75), 0.1, 1.25);
    return { expectancyR, expectedReturn, breachRisk, passChance, recommendedRisk };
  }, [winRate, avgWin, avgLoss, risk, trades, target, drawdown]);

  return (
    <ToolShell eyebrow="Prop Firm Risk" title="Prop Firm Survival Simulator" description="Estimate whether your risk per trade is likely to survive a funded account or challenge drawdown model." currentPath="/tools/prop-firm-survival-simulator">
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="profit-card grid gap-5 p-6 sm:grid-cols-2 lg:col-span-3">
          <div><FieldLabel>Account Size</FieldLabel><NumberField value={account} onChange={setAccount} /></div>
          <div><FieldLabel hint="%">Profit Target</FieldLabel><NumberField value={target} onChange={setTarget} /></div>
          <div><FieldLabel hint="%">Max Drawdown</FieldLabel><NumberField value={drawdown} onChange={setDrawdown} /></div>
          <div><FieldLabel hint="%">Risk Per Trade</FieldLabel><NumberField value={risk} onChange={setRisk} /></div>
          <div><FieldLabel hint="%">Win Rate</FieldLabel><NumberField value={winRate} onChange={setWinRate} /></div>
          <div><FieldLabel hint="R">Average Win</FieldLabel><NumberField value={avgWin} onChange={setAvgWin} /></div>
          <div><FieldLabel hint="R">Average Loss</FieldLabel><NumberField value={avgLoss} onChange={setAvgLoss} /></div>
          <div><FieldLabel>Trades In Challenge</FieldLabel><NumberField value={trades} onChange={setTrades} /></div>
        </section>
        <aside className="profit-card p-6 lg:col-span-2">
          <ResultRow label="Breach risk estimate" value={`${result.breachRisk.toFixed(1)}%`} tone={result.breachRisk < 25 ? "bull" : result.breachRisk < 50 ? "gold" : "bear"} emphasis />
          <ResultRow label="Pass chance estimate" value={`${result.passChance.toFixed(1)}%`} tone={result.passChance >= 50 ? "bull" : "bear"} />
          <ResultRow label="Expected return" value={`${result.expectedReturn >= 0 ? "+" : ""}${result.expectedReturn.toFixed(2)}%`} />
          <ResultRow label="Expectancy" value={`${result.expectancyR >= 0 ? "+" : ""}${result.expectancyR.toFixed(2)}R`} />
          <ResultRow label="Suggested risk" value={`${result.recommendedRisk.toFixed(2)}%`} tone="gold" />
          <p className="mt-4 text-xs leading-relaxed text-dim">This is a planning estimate, not a guarantee. Prop firms calculate drawdown differently, so always verify your dashboard/rules.</p>
        </aside>
      </div>
    </ToolShell>
  );
}
