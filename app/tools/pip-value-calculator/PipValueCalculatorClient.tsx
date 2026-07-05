"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/tools/ToolShell";
import {
  CurrencySelect,
  ErrorBanner,
  FieldLabel,
  InfoNote,
  InstrumentSelect,
  NumberField,
  RateInput,
  ResultRow,
} from "@/components/tools/inputs";
import { calcPipValue } from "@/lib/tools/calculations";
import { formatCurrencyValue } from "@/lib/tools/format";
import { getInstrument, isTickBased, quantityLabel } from "@/lib/tools/instruments";
import { useConversionRate } from "@/lib/tools/use-conversion-rate";

export default function PipValueCalculatorClient() {
  const [symbol, setSymbol] = useState("EURUSD");
  const [accountCurrency, setAccountCurrency] = useState("USD");
  const [quantity, setQuantity] = useState("1");

  const instrument = getInstrument(symbol) ?? getInstrument("EURUSD")!;
  const conversion = useConversionRate(instrument.quoteCurrency, accountCurrency);

  const { result, error } = useMemo(() => {
    try {
      const qty = Number.parseFloat(quantity);
      if (!quantity || Number.isNaN(qty)) {
        return { result: null, error: null };
      }

      return {
        result: calcPipValue({ instrument, quantity: qty, quoteToAccountRate: conversion.rate }),
        error: null,
      };
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : "Invalid input." };
    }
  }, [conversion.rate, instrument, quantity]);

  const unitLabel = isTickBased(instrument) ? "tick" : "pip";
  const qtyLabel = quantityLabel(instrument);

  return (
    <ToolShell
      eyebrow="Free Trading Tool"
      title="Pip & Tick Value Calculator"
      description="Find out how much one pip or tick is worth for your exact position size and account currency. Works for forex, gold, crypto, indices, and futures."
      currentPath="/tools/pip-value-calculator"
      content={<PipValueSeoContent />}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="profit-card p-6 lg:col-span-3" aria-label="Pip value calculator form">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel>Instrument</FieldLabel>
              <InstrumentSelect value={symbol} onChange={setSymbol} />
            </div>
            <div>
              <FieldLabel>Account Currency</FieldLabel>
              <CurrencySelect value={accountCurrency} onChange={setAccountCurrency} />
            </div>
            <div>
              <FieldLabel hint={qtyLabel}>Position Size</FieldLabel>
              <NumberField value={quantity} onChange={setQuantity} step={String(instrument.quantityStep)} min="0" placeholder="1" ariaLabel="Position size" />
            </div>
            <RateInput
              from={instrument.quoteCurrency}
              to={accountCurrency}
              rate={conversion.rate}
              onChange={conversion.setRate}
              loading={conversion.loading}
              isLive={conversion.isLive}
            />
          </div>

          {conversion.error ? (
            <div className="mt-4">
              <InfoNote>{conversion.error}</InfoNote>
            </div>
          ) : null}
          {instrument.note ? (
            <div className="mt-4">
              <InfoNote>{instrument.note}</InfoNote>
            </div>
          ) : null}
        </section>

        <aside className="profit-card p-6 lg:col-span-2" aria-label="Pip value calculator results">
          <h2 className="mb-4 font-mono2 text-xs font-bold uppercase tracking-widest text-txt/70">Result</h2>
          {error ? (
            <ErrorBanner message={error} />
          ) : result ? (
            <div>
              <ResultRow
                label={`Value of 1 ${unitLabel}`}
                value={formatCurrencyValue(result.pipValueAccountCcy, accountCurrency, 2)}
                tone="gold"
                emphasis
              />
              <ResultRow label={`Value in ${instrument.quoteCurrency}`} value={formatCurrencyValue(result.pipValueQuoteCcy, instrument.quoteCurrency, 4)} />
              <ResultRow label="Instrument" value={instrument.label} />
              <ResultRow label={`${unitLabel === "pip" ? "Pip" : "Tick"} size`} value={String(instrument.pipSize)} />
            </div>
          ) : (
            <p className="text-sm text-dim">Enter a position size to calculate pip/tick value.</p>
          )}
        </aside>
      </div>
    </ToolShell>
  );
}

function PipValueSeoContent() {
  return (
    <article className="space-y-7 text-sm leading-relaxed text-muted2">
      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">What is pip value?</h2>
        <p>
          Pip value is the amount of money a position gains or loses when price moves by one pip. Futures traders usually call the same idea tick value. Knowing this number is essential because your stop-loss, target, and risk all convert through pip or tick value.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">Pip value formula</h2>
        <p className="overflow-x-auto rounded-lg border border-line/60 bg-panel/60 p-3 font-mono2 text-xs text-txt/80">
          Pip Value = Pip Size × Contract Size × Lots × Currency Conversion Rate
        </p>
        <p className="mt-3">
          Futures use tick size and point value instead. For example, ES moves in 0.25-point ticks and each tick is worth $12.50 per contract. NQ moves in 0.25-point ticks and each tick is worth $5 per contract.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">FAQs</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-txt">Does pip value change?</h3>
            <p>Yes. If the instrument&apos;s quote currency is different from your account currency, the final pip value changes with the exchange rate. That is why the calculator includes a live/manual conversion rate field.</p>
          </div>
          <div>
            <h3 className="font-semibold text-txt">What is the difference between a pip and a tick?</h3>
            <p>Pip is mostly used in forex. Tick is mostly used in futures and indices. Both are price increments used to calculate money gained or lost on a trade.</p>
          </div>
          <div>
            <h3 className="font-semibold text-txt">How does this help position sizing?</h3>
            <p>
              Once you know pip value, you can calculate how much a stop-loss costs. Our <a href="/tools/lot-size-calculator" className="text-gold hover:underline">lot size calculator</a> does that automatically.
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}
