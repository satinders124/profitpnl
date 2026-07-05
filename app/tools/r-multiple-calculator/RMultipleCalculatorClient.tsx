"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/tools/ToolShell";
import { DirectionToggle, ErrorBanner, FieldLabel, NumberField, ResultRow } from "@/components/tools/inputs";
import { calcRMultiple, type Direction } from "@/lib/tools/calculations";
import { formatCurrencyValue, formatNumber, formatSignedNumber } from "@/lib/tools/format";

export default function RMultipleCalculatorClient() {
  const [direction, setDirection] = useState<Direction>("long");
  const [entryPrice, setEntryPrice] = useState("100");
  const [stopLossPrice, setStopLossPrice] = useState("95");
  const [exitPrice, setExitPrice] = useState("112.5");
  const [riskAmount, setRiskAmount] = useState("100");

  const { result, error } = useMemo(() => {
    try {
      const entry = Number.parseFloat(entryPrice);
      const stop = Number.parseFloat(stopLossPrice);
      const exit = Number.parseFloat(exitPrice);
      const risk = riskAmount ? Number.parseFloat(riskAmount) : undefined;

      if (!entryPrice || !stopLossPrice || !exitPrice || Number.isNaN(entry) || Number.isNaN(stop) || Number.isNaN(exit) || (riskAmount && Number.isNaN(risk))) {
        return { result: null, error: null };
      }

      return { result: calcRMultiple({ direction, entryPrice: entry, stopLossPrice: stop, exitPrice: exit, riskAmount: risk }), error: null };
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : "Invalid input." };
    }
  }, [direction, entryPrice, stopLossPrice, exitPrice, riskAmount]);

  const winning = (result?.rMultiple ?? 0) >= 0;

  return (
    <ToolShell
      eyebrow="Free Trading Tool"
      title="R-Multiple Calculator"
      description="Convert a trade result into R. Enter your entry, stop-loss, and exit price to see whether the trade was +2R, -1R, or anything in between."
      currentPath="/tools/r-multiple-calculator"
      content={<RMultipleSeoContent />}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="profit-card p-6 lg:col-span-3" aria-label="R multiple calculator form">
          <div className="mb-5">
            <FieldLabel>Direction</FieldLabel>
            <DirectionToggle value={direction} onChange={setDirection} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel>Entry Price</FieldLabel>
              <NumberField value={entryPrice} onChange={setEntryPrice} step="0.00001" min="0" ariaLabel="Entry price" />
            </div>
            <div>
              <FieldLabel>Stop-Loss Price</FieldLabel>
              <NumberField value={stopLossPrice} onChange={setStopLossPrice} step="0.00001" min="0" ariaLabel="Stop-loss price" />
            </div>
            <div>
              <FieldLabel>Exit Price</FieldLabel>
              <NumberField value={exitPrice} onChange={setExitPrice} step="0.00001" min="0" ariaLabel="Exit price" />
            </div>
            <div>
              <FieldLabel hint="optional">Risk Amount</FieldLabel>
              <NumberField value={riskAmount} onChange={setRiskAmount} step="1" min="0" placeholder="100" ariaLabel="Risk amount" />
            </div>
          </div>
        </section>

        <aside className="profit-card p-6 lg:col-span-2" aria-label="R multiple calculator results">
          <h2 className="mb-4 font-mono2 text-xs font-bold uppercase tracking-widest text-txt/70">Result</h2>
          {error ? (
            <ErrorBanner message={error} />
          ) : result ? (
            <div>
              <ResultRow label="Realized R" value={`${formatSignedNumber(result.rMultiple, 2)}R`} tone={winning ? "bull" : "bear"} emphasis />
              <ResultRow label="Risk per unit" value={formatNumber(result.riskPerUnit, 5)} />
              <ResultRow label="Result per unit" value={formatSignedNumber(result.resultPerUnit, 5)} />
              {result.dollarResult !== undefined ? <ResultRow label="Dollar result" value={formatCurrencyValue(result.dollarResult, "USD", 2)} tone={winning ? "bull" : "bear"} /> : null}
            </div>
          ) : (
            <p className="text-sm text-dim">Fill in entry, stop, and exit to calculate R.</p>
          )}
        </aside>
      </div>
    </ToolShell>
  );
}

function RMultipleSeoContent() {
  return (
    <article className="space-y-7 text-sm leading-relaxed text-muted2">
      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">What is an R-multiple?</h2>
        <p>
          R-multiple measures a trade result relative to the amount you planned to risk. If you risked $100 and made $250, the trade was +2.5R. If you lost the full planned risk, it was -1R.
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">R-multiple formula</h2>
        <p className="overflow-x-auto rounded-lg border border-line/60 bg-panel/60 p-3 font-mono2 text-xs text-txt/80">
          R-Multiple = Trade Result ÷ Planned Risk
        </p>
        <p className="mt-3">
          Tracking R makes trade review cleaner because it separates execution quality from account size. ProfitPnL uses R-multiples to help compare setups, sessions, and trading habits fairly.
        </p>
      </section>
    </article>
  );
}
