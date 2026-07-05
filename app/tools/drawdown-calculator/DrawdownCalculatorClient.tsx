"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/tools/ToolShell";
import { ErrorBanner, FieldLabel, NumberField, ResultRow } from "@/components/tools/inputs";
import { calcDrawdown } from "@/lib/tools/calculations";
import { formatCurrencyValue, formatSignedNumber } from "@/lib/tools/format";

export default function DrawdownCalculatorClient() {
  const [startingBalance, setStartingBalance] = useState("100000");
  const [peakBalance, setPeakBalance] = useState("100000");
  const [currentBalance, setCurrentBalance] = useState("94000");

  const { result, error } = useMemo(() => {
    try {
      const starting = Number.parseFloat(startingBalance);
      const peak = Number.parseFloat(peakBalance);
      const current = Number.parseFloat(currentBalance);

      if (!startingBalance || !peakBalance || !currentBalance || Number.isNaN(starting) || Number.isNaN(peak) || Number.isNaN(current)) {
        return { result: null, error: null };
      }

      return { result: calcDrawdown({ startingBalance: starting, peakBalance: peak, currentBalance: current }), error: null };
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : "Invalid input." };
    }
  }, [startingBalance, peakBalance, currentBalance]);

  return (
    <ToolShell
      eyebrow="Free Trading Tool"
      title="Trading Drawdown Calculator"
      description="Calculate account drawdown, percentage loss from equity peak, and the recovery gain required to get back to highs. Useful for prop-firm and risk management reviews."
      currentPath="/tools/drawdown-calculator"
      content={<DrawdownSeoContent />}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="profit-card p-6 lg:col-span-3" aria-label="Drawdown calculator form">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <FieldLabel>Starting Balance</FieldLabel>
              <NumberField value={startingBalance} onChange={setStartingBalance} step="1" min="0" placeholder="100000" ariaLabel="Starting balance" />
            </div>
            <div>
              <FieldLabel>Equity Peak</FieldLabel>
              <NumberField value={peakBalance} onChange={setPeakBalance} step="1" min="0" placeholder="100000" ariaLabel="Peak balance" />
            </div>
            <div>
              <FieldLabel>Current Balance</FieldLabel>
              <NumberField value={currentBalance} onChange={setCurrentBalance} step="1" min="0" placeholder="94000" ariaLabel="Current balance" />
            </div>
          </div>
        </section>

        <aside className="profit-card p-6 lg:col-span-2" aria-label="Drawdown calculator results">
          <h2 className="mb-4 font-mono2 text-xs font-bold uppercase tracking-widest text-txt/70">Result</h2>
          {error ? (
            <ErrorBanner message={error} />
          ) : result ? (
            <div>
              <ResultRow label="Drawdown" value={`${(result.drawdownPercent * 100).toFixed(2)}%`} tone="bear" emphasis />
              <ResultRow label="Drawdown amount" value={formatCurrencyValue(result.drawdownAmount, "USD", 2)} />
              <ResultRow label="Gain needed to recover" value={Number.isFinite(result.recoveryPercent) ? `${(result.recoveryPercent * 100).toFixed(2)}%` : "∞"} tone="gold" />
              <ResultRow label="Net change from start" value={`${formatSignedNumber(result.netChangeAmount, 2)} USD (${formatSignedNumber(result.netChangePercent * 100, 2)}%)`} tone={result.netChangeAmount >= 0 ? "bull" : "bear"} />
            </div>
          ) : (
            <p className="text-sm text-dim">Enter balances to calculate drawdown.</p>
          )}
        </aside>
      </div>
    </ToolShell>
  );
}

function DrawdownSeoContent() {
  return (
    <article className="space-y-7 text-sm leading-relaxed text-muted2">
      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">What is trading drawdown?</h2>
        <p>
          Drawdown is the drop from an account equity high to the current equity. It is one of the most important risk metrics because it shows how much capital and confidence a strategy can lose before recovering.
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">Drawdown formula</h2>
        <p className="overflow-x-auto rounded-lg border border-line/60 bg-panel/60 p-3 font-mono2 text-xs text-txt/80">
          Drawdown % = (Peak Equity − Current Equity) ÷ Peak Equity × 100
        </p>
        <p className="mt-3">
          Recovery is not symmetrical: a 10% drawdown needs an 11.11% gain to recover, and a 50% drawdown needs a 100% gain. That is why controlling drawdown is more important than chasing bigger winners.
        </p>
      </section>
    </article>
  );
}
