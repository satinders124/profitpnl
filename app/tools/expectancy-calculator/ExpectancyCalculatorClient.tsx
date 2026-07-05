"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/tools/ToolShell";
import { ErrorBanner, FieldLabel, NumberField, ResultRow } from "@/components/tools/inputs";
import { calcExpectancy } from "@/lib/tools/calculations";
import { formatNumber, formatSignedNumber } from "@/lib/tools/format";

export default function ExpectancyCalculatorClient() {
  const [winRate, setWinRate] = useState("45");
  const [averageWin, setAverageWin] = useState("2.2");
  const [averageLoss, setAverageLoss] = useState("1");

  const { result, error } = useMemo(() => {
    try {
      const winRateNum = Number.parseFloat(winRate);
      const averageWinNum = Number.parseFloat(averageWin);
      const averageLossNum = Number.parseFloat(averageLoss);

      if (!winRate || !averageWin || !averageLoss || Number.isNaN(winRateNum) || Number.isNaN(averageWinNum) || Number.isNaN(averageLossNum)) {
        return { result: null, error: null };
      }

      return {
        result: calcExpectancy({ winRatePercent: winRateNum, averageWin: averageWinNum, averageLoss: averageLossNum }),
        error: null,
      };
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : "Invalid input." };
    }
  }, [winRate, averageWin, averageLoss]);

  const positive = (result?.expectancy ?? 0) >= 0;

  return (
    <ToolShell
      eyebrow="Free Trading Tool"
      title="Trading Expectancy Calculator"
      description="Calculate whether your strategy has a positive edge using win rate, average winner, and average loser. Works in R-multiples, dollars, points, or any consistent unit."
      currentPath="/tools/expectancy-calculator"
      content={<ExpectancySeoContent />}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="profit-card p-6 lg:col-span-3" aria-label="Expectancy calculator form">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <FieldLabel hint="%">Win Rate</FieldLabel>
              <NumberField value={winRate} onChange={setWinRate} step="0.1" min="0" placeholder="45" ariaLabel="Win rate" />
            </div>
            <div>
              <FieldLabel hint="R or $">Average Win</FieldLabel>
              <NumberField value={averageWin} onChange={setAverageWin} step="0.01" min="0" placeholder="2.2" ariaLabel="Average win" />
            </div>
            <div>
              <FieldLabel hint="positive">Average Loss</FieldLabel>
              <NumberField value={averageLoss} onChange={setAverageLoss} step="0.01" min="0" placeholder="1" ariaLabel="Average loss" />
            </div>
          </div>
        </section>

        <aside className="profit-card p-6 lg:col-span-2" aria-label="Expectancy calculator results">
          <h2 className="mb-4 font-mono2 text-xs font-bold uppercase tracking-widest text-txt/70">Result</h2>
          {error ? (
            <ErrorBanner message={error} />
          ) : result ? (
            <div>
              <ResultRow label="Expectancy per trade" value={formatSignedNumber(result.expectancy, 2)} tone={positive ? "bull" : "bear"} emphasis />
              <ResultRow label="Profit factor" value={Number.isFinite(result.profitFactor) ? formatNumber(result.profitFactor, 2) : "∞"} tone={result.profitFactor >= 1 ? "bull" : "bear"} />
              <ResultRow label="Loss rate" value={`${(result.lossRate * 100).toFixed(1)}%`} />
              <ResultRow label="Break-even win rate" value={`${(result.breakEvenWinRate * 100).toFixed(1)}%`} tone="gold" />
            </div>
          ) : (
            <p className="text-sm text-dim">Enter your strategy stats to calculate expectancy.</p>
          )}
        </aside>
      </div>
    </ToolShell>
  );
}

function ExpectancySeoContent() {
  return (
    <article className="space-y-7 text-sm leading-relaxed text-muted2">
      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">What is trading expectancy?</h2>
        <p>
          Expectancy is the average result your strategy should produce per trade over a large sample. A strategy with positive expectancy can make money even with a lower win rate if the average winner is larger than the average loser.
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">Expectancy formula</h2>
        <p className="overflow-x-auto rounded-lg border border-line/60 bg-panel/60 p-3 font-mono2 text-xs text-txt/80">
          Expectancy = (Win Rate × Average Win) − (Loss Rate × Average Loss)
        </p>
        <p className="mt-3">
          Use R-multiples for cleaner analysis: average win in R, average loss in R, and expectancy becomes expected R per trade. ProfitPnL tracks this automatically from your journaled trade history.
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">FAQs</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-txt">Is expectancy more important than win rate?</h3>
            <p>Yes. Win rate alone can be misleading. A 40% win rate can be profitable with large winners, while a 70% win rate can lose money if losses are too large.</p>
          </div>
          <div>
            <h3 className="font-semibold text-txt">Should I use dollars or R?</h3>
            <p>Both work if you stay consistent, but R-multiples make strategies easier to compare because they normalize each trade by planned risk.</p>
          </div>
        </div>
      </section>
    </article>
  );
}
