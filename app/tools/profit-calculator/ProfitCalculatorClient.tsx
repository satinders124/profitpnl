"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/tools/ToolShell";
import {
  CurrencySelect,
  DirectionToggle,
  ErrorBanner,
  FieldLabel,
  InfoNote,
  InstrumentSelect,
  NumberField,
  RateInput,
  ResultRow,
} from "@/components/tools/inputs";
import { calcProfitLoss, type Direction } from "@/lib/tools/calculations";
import { formatCurrencyValue, formatSignedNumber } from "@/lib/tools/format";
import { getInstrument, isTickBased, quantityLabel } from "@/lib/tools/instruments";
import { useConversionRate } from "@/lib/tools/use-conversion-rate";

export default function ProfitCalculatorClient() {
  const [symbol, setSymbol] = useState("EURUSD");
  const [accountCurrency, setAccountCurrency] = useState("USD");
  const [direction, setDirection] = useState<Direction>("long");
  const [entryPrice, setEntryPrice] = useState("1.10000");
  const [exitPrice, setExitPrice] = useState("1.10500");
  const [quantity, setQuantity] = useState("1");

  const instrument = getInstrument(symbol) ?? getInstrument("EURUSD")!;
  const conversion = useConversionRate(instrument.quoteCurrency, accountCurrency);

  const { result, error } = useMemo(() => {
    try {
      const entry = Number.parseFloat(entryPrice);
      const exit = Number.parseFloat(exitPrice);
      const qty = Number.parseFloat(quantity);

      if (!entryPrice || !exitPrice || !quantity || Number.isNaN(entry) || Number.isNaN(exit) || Number.isNaN(qty)) {
        return { result: null, error: null };
      }

      return {
        result: calcProfitLoss({
          instrument,
          direction,
          entryPrice: entry,
          exitPrice: exit,
          quantity: qty,
          quoteToAccountRate: conversion.rate,
        }),
        error: null,
      };
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : "Invalid input." };
    }
  }, [conversion.rate, direction, entryPrice, exitPrice, instrument, quantity]);

  const profitable = (result?.profitLossAccountCcy ?? 0) >= 0;
  const moveLabel = isTickBased(instrument) ? "Ticks" : "Pips";

  return (
    <ToolShell
      eyebrow="Free Trading Tool"
      title="Forex, Crypto & Futures Profit Calculator"
      description="Calculate exact profit or loss before or after a trade using entry price, exit price, direction, and position size. Works for forex, gold, crypto, indices, and futures."
      currentPath="/tools/profit-calculator"
      content={<ProfitCalculatorSeoContent />}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="profit-card p-6 lg:col-span-3" aria-label="Profit calculator form">
          <div className="mb-5">
            <FieldLabel>Direction</FieldLabel>
            <DirectionToggle value={direction} onChange={setDirection} />
          </div>

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
              <FieldLabel hint={`step ${instrument.pipSize}`}>Entry Price</FieldLabel>
              <NumberField value={entryPrice} onChange={setEntryPrice} step={String(instrument.pipSize)} min="0" ariaLabel="Entry price" />
            </div>
            <div>
              <FieldLabel hint={`step ${instrument.pipSize}`}>Exit Price</FieldLabel>
              <NumberField value={exitPrice} onChange={setExitPrice} step={String(instrument.pipSize)} min="0" ariaLabel="Exit price" />
            </div>
            <div>
              <FieldLabel hint={quantityLabel(instrument)}>Position Size</FieldLabel>
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

        <aside className="profit-card p-6 lg:col-span-2" aria-label="Profit calculator results">
          <h2 className="mb-4 font-mono2 text-xs font-bold uppercase tracking-widest text-txt/70">Result</h2>
          {error ? (
            <ErrorBanner message={error} />
          ) : result ? (
            <div>
              <ResultRow
                label="Profit / Loss"
                value={`${formatSignedNumber(result.profitLossAccountCcy, 2)} ${accountCurrency}`}
                tone={profitable ? "bull" : "bear"}
                emphasis
              />
              <ResultRow label="Price movement" value={formatSignedNumber(result.priceDelta, instrument.priceDecimals)} />
              <ResultRow label={moveLabel} value={formatSignedNumber(result.pips, 1)} />
              <ResultRow label="Value per pip/tick" value={formatCurrencyValue(result.pipValueAccountCcy, accountCurrency, 2)} />
            </div>
          ) : (
            <p className="text-sm text-dim">Fill in the fields to calculate your P&L.</p>
          )}
        </aside>
      </div>
    </ToolShell>
  );
}

function ProfitCalculatorSeoContent() {
  return (
    <article className="space-y-7 text-sm leading-relaxed text-muted2">
      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">What is a trading profit calculator?</h2>
        <p>
          A trading profit calculator converts a price move into real profit or loss in your account currency. Instead of guessing what a 50-pip forex move, a 10-point ES futures move, or a BTCUSD move means in dollars, you can calculate it instantly before placing the trade.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">Profit calculator formula</h2>
        <p className="overflow-x-auto rounded-lg border border-line/60 bg-panel/60 p-3 font-mono2 text-xs text-txt/80">
          Profit/Loss = Price Movement × Pip or Tick Value × Position Size
        </p>
        <p className="mt-3">
          Long trades profit when price rises. Short trades profit when price falls. For futures, ProfitPnL uses fixed exchange-style point values such as ES at $50 per point and NQ at $20 per point.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">FAQs</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-txt">Does this include spread or commission?</h3>
            <p>No. This tool calculates raw price-based P&L. Your final broker result can differ because of spread, commission, swaps, and slippage.</p>
          </div>
          <div>
            <h3 className="font-semibold text-txt">Can I use this for crypto and futures?</h3>
            <p>Yes. Select BTCUSD, ETHUSD, ES, NQ, YM, GC, CL, or another supported instrument and the calculator uses the right contract model for the calculation.</p>
          </div>
          <div>
            <h3 className="font-semibold text-txt">What should I use next?</h3>
            <p>
              Use the <a href="/tools/risk-reward-calculator" className="text-gold hover:underline">risk-reward calculator</a> before entering a trade, then use the <a href="/tools/lot-size-calculator" className="text-gold hover:underline">lot size calculator</a> to size it correctly.
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}
