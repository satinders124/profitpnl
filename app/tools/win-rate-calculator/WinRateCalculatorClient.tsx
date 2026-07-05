"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/tools/ToolShell";
import { ErrorBanner, FieldLabel, NumberField, ResultRow } from "@/components/tools/inputs";
import { calcWinRate } from "@/lib/tools/calculations";

export default function WinRateCalculatorClient() {
  const [wins, setWins] = useState("45");
  const [losses, setLosses] = useState("55");
  const [breakEvens, setBreakEvens] = useState("0");

  const { result, error } = useMemo(() => {
    try {
      const winsNum = Number.parseFloat(wins);
      const lossesNum = Number.parseFloat(losses);
      const breakEvensNum = Number.parseFloat(breakEvens || "0");

      if (!wins || !losses || Number.isNaN(winsNum) || Number.isNaN(lossesNum) || Number.isNaN(breakEvensNum)) {
        return { result: null, error: null };
      }

      return { result: calcWinRate({ wins: winsNum, losses: lossesNum, breakEvens: breakEvensNum }), error: null };
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : "Invalid input." };
    }
  }, [wins, losses, breakEvens]);

  return (
    <ToolShell
      eyebrow="Free Trading Tool"
      title="Trading Win Rate Calculator"
      description="Calculate your trading win rate from wins, losses, and break-even trades. Then see the minimum reward-to-risk ratio needed to break even at that win rate."
      currentPath="/tools/win-rate-calculator"
      content={<WinRateSeoContent />}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="profit-card p-6 lg:col-span-3" aria-label="Win rate calculator form">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <FieldLabel>Winning Trades</FieldLabel>
              <NumberField value={wins} onChange={setWins} step="1" min="0" placeholder="45" ariaLabel="Winning trades" />
            </div>
            <div>
              <FieldLabel>Losing Trades</FieldLabel>
              <NumberField value={losses} onChange={setLosses} step="1" min="0" placeholder="55" ariaLabel="Losing trades" />
            </div>
            <div>
              <FieldLabel>Break-even Trades</FieldLabel>
              <NumberField value={breakEvens} onChange={setBreakEvens} step="1" min="0" placeholder="0" ariaLabel="Break-even trades" />
            </div>
          </div>
        </section>

        <aside className="profit-card p-6 lg:col-span-2" aria-label="Win rate calculator results">
          <h2 className="mb-4 font-mono2 text-xs font-bold uppercase tracking-widest text-txt/70">Result</h2>
          {error ? (
            <ErrorBanner message={error} />
          ) : result ? (
            <div>
              <ResultRow label="Win rate" value={`${(result.winRate * 100).toFixed(1)}%`} tone="gold" emphasis />
              <ResultRow label="Loss rate" value={`${(result.lossRate * 100).toFixed(1)}%`} />
              <ResultRow label="Total trades" value={String(result.totalTrades)} />
              <ResultRow label="Break-even rate" value={`${(result.breakEvenRate * 100).toFixed(1)}%`} />
              <ResultRow label="Minimum R:R to break even" value={Number.isFinite(result.minimumRewardRiskToBreakEven) ? `1 : ${result.minimumRewardRiskToBreakEven.toFixed(2)}` : "No wins"} tone="gold" />
            </div>
          ) : (
            <p className="text-sm text-dim">Enter your wins and losses to calculate win rate.</p>
          )}
        </aside>
      </div>
    </ToolShell>
  );
}

function WinRateSeoContent() {
  return (
    <article className="space-y-7 text-sm leading-relaxed text-muted2">
      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">How to calculate trading win rate</h2>
        <p>
          Trading win rate is the percentage of decisive trades that close as winners. Break-even trades are useful to track, but they should usually be separated from wins and losses when judging strategy accuracy.
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">Win rate formula</h2>
        <p className="overflow-x-auto rounded-lg border border-line/60 bg-panel/60 p-3 font-mono2 text-xs text-txt/80">
          Win Rate = Winning Trades ÷ (Winning Trades + Losing Trades)
        </p>
        <p className="mt-3">
          Win rate only becomes useful when combined with average reward-to-risk. A lower win rate can still work if winners are larger than losers.
        </p>
      </section>
    </article>
  );
}
