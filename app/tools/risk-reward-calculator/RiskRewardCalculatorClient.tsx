"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/tools/ToolShell";
import { DirectionToggle, ErrorBanner, FieldLabel, NumberField, ResultRow } from "@/components/tools/inputs";
import { calcRiskReward, type Direction } from "@/lib/tools/calculations";
import { formatNumber } from "@/lib/tools/format";

export default function RiskRewardCalculatorClient() {
  const [direction, setDirection] = useState<Direction>("long");
  const [entryPrice, setEntryPrice] = useState("100");
  const [stopLossPrice, setStopLossPrice] = useState("95");
  const [takeProfitPrice, setTakeProfitPrice] = useState("115");

  const { result, error } = useMemo(() => {
    try {
      const entry = Number.parseFloat(entryPrice);
      const stopLoss = Number.parseFloat(stopLossPrice);
      const takeProfit = Number.parseFloat(takeProfitPrice);

      if (!entryPrice || !stopLossPrice || !takeProfitPrice || Number.isNaN(entry) || Number.isNaN(stopLoss) || Number.isNaN(takeProfit)) {
        return { result: null, error: null };
      }

      return {
        result: calcRiskReward({ direction, entryPrice: entry, stopLossPrice: stopLoss, takeProfitPrice: takeProfit }),
        error: null,
      };
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : "Invalid input." };
    }
  }, [direction, entryPrice, stopLossPrice, takeProfitPrice]);

  const strongSetup = (result?.ratio ?? 0) >= 2;

  return (
    <ToolShell
      eyebrow="Free Trading Tool"
      title="Risk-Reward Ratio Calculator"
      description="Check whether a trade setup is worth taking before you enter. Calculate risk-reward ratio, risk per unit, reward per unit, and the break-even win rate required."
      currentPath="/tools/risk-reward-calculator"
      content={<RiskRewardSeoContent />}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="profit-card p-6 lg:col-span-3" aria-label="Risk reward calculator form">
          <div className="mb-5">
            <FieldLabel>Direction</FieldLabel>
            <DirectionToggle value={direction} onChange={setDirection} />
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <FieldLabel>Entry Price</FieldLabel>
              <NumberField value={entryPrice} onChange={setEntryPrice} step="0.00001" min="0" ariaLabel="Entry price" />
            </div>
            <div>
              <FieldLabel>Stop-Loss Price</FieldLabel>
              <NumberField value={stopLossPrice} onChange={setStopLossPrice} step="0.00001" min="0" ariaLabel="Stop-loss price" />
            </div>
            <div>
              <FieldLabel>Take-Profit Price</FieldLabel>
              <NumberField value={takeProfitPrice} onChange={setTakeProfitPrice} step="0.00001" min="0" ariaLabel="Take-profit price" />
            </div>
          </div>
        </section>

        <aside className="profit-card p-6 lg:col-span-2" aria-label="Risk reward calculator results">
          <h2 className="mb-4 font-mono2 text-xs font-bold uppercase tracking-widest text-txt/70">Result</h2>
          {error ? (
            <ErrorBanner message={error} />
          ) : result ? (
            <div>
              <ResultRow label="Risk : Reward" value={`1 : ${result.ratio.toFixed(2)}`} tone={strongSetup ? "bull" : "gold"} emphasis />
              <ResultRow label="Risk per unit" value={formatNumber(result.riskPerUnit, 5)} />
              <ResultRow label="Reward per unit" value={formatNumber(result.rewardPerUnit, 5)} />
              <ResultRow label="Break-even win rate" value={`${(result.breakEvenWinRate * 100).toFixed(1)}%`} tone="gold" />
            </div>
          ) : (
            <p className="text-sm text-dim">Fill in entry, stop-loss, and take-profit to calculate R:R.</p>
          )}
        </aside>
      </div>
    </ToolShell>
  );
}

function RiskRewardSeoContent() {
  return (
    <article className="space-y-7 text-sm leading-relaxed text-muted2">
      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">What is risk-reward ratio?</h2>
        <p>
          Risk-reward ratio compares how much you are risking to how much you could make. If you risk $100 to make $300, your setup is 1:3. This is one of the fastest ways to filter trades before emotion gets involved.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">Risk-reward formula</h2>
        <p className="overflow-x-auto rounded-lg border border-line/60 bg-panel/60 p-3 font-mono2 text-xs text-txt/80">
          R:R = Reward ÷ Risk | Break-even Win Rate = 1 ÷ (1 + R:R)
        </p>
        <p className="mt-3">
          A 1:2 setup needs a 33.3% win rate to break even before costs. A 1:1 setup needs 50%. A 1:3 setup needs only 25%. Your real edge comes from combining actual win rate with average reward-to-risk over many trades.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">FAQs</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-txt">What is a good risk-reward ratio?</h3>
            <p>Many traders target at least 1:2, but a setup is only good if your real win rate and costs support it. Some scalping systems can work with lower R:R if the win rate is high enough.</p>
          </div>
          <div>
            <h3 className="font-semibold text-txt">Does risk-reward guarantee profitability?</h3>
            <p>No. It describes one trade setup. Long-term profitability depends on win rate, average winner, average loser, fees, slippage, and consistency.</p>
          </div>
          <div>
            <h3 className="font-semibold text-txt">How do I turn this into dollars?</h3>
            <p>
              After checking the R:R, use the <a href="/tools/lot-size-calculator" className="text-gold hover:underline">lot size calculator</a> to size your trade or the <a href="/tools/profit-calculator" className="text-gold hover:underline">profit calculator</a> to estimate the dollar P&L.
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}
