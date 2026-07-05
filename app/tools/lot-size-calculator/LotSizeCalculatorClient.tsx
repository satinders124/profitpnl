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
import { calcPositionSize } from "@/lib/tools/calculations";
import { formatCurrencyValue, formatQuantity } from "@/lib/tools/format";
import { getInstrument, isTickBased, quantityLabel } from "@/lib/tools/instruments";
import { useConversionRate } from "@/lib/tools/use-conversion-rate";

export default function LotSizeCalculatorClient() {
  const [symbol, setSymbol] = useState("EURUSD");
  const [accountCurrency, setAccountCurrency] = useState("USD");
  const [balance, setBalance] = useState("10000");
  const [riskPercent, setRiskPercent] = useState("1");
  const [stopLossPips, setStopLossPips] = useState("30");

  const instrument = getInstrument(symbol) ?? getInstrument("EURUSD")!;
  const conversion = useConversionRate(instrument.quoteCurrency, accountCurrency);

  const { result, error } = useMemo(() => {
    try {
      const accountBalance = Number.parseFloat(balance);
      const risk = Number.parseFloat(riskPercent);
      const stopLoss = Number.parseFloat(stopLossPips);

      if (!balance || !riskPercent || !stopLossPips || Number.isNaN(accountBalance) || Number.isNaN(risk) || Number.isNaN(stopLoss)) {
        return { result: null, error: null };
      }

      return {
        result: calcPositionSize({
          instrument,
          accountBalance,
          riskPercent: risk,
          stopLossPips: stopLoss,
          quoteToAccountRate: conversion.rate,
        }),
        error: null,
      };
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : "Invalid input." };
    }
  }, [balance, conversion.rate, instrument, riskPercent, stopLossPips]);

  const moveUnit = isTickBased(instrument) ? "ticks" : "pips";
  const qtyLabel = quantityLabel(instrument);
  const belowMinimum = result ? result.rawQuantity > 0 && result.tradableQuantity === 0 : false;

  return (
    <ToolShell
      eyebrow="Free Trading Tool"
      title="Lot Size & Position Size Calculator"
      description="Calculate the exact lot size or contract count needed to risk a fixed percentage of your account. Built for forex, gold, crypto, indices, and futures traders."
      currentPath="/tools/lot-size-calculator"
      content={<LotSizeSeoContent />}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="profit-card p-6 lg:col-span-3" aria-label="Lot size calculator form">
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
              <FieldLabel hint={accountCurrency}>Account Balance</FieldLabel>
              <NumberField value={balance} onChange={setBalance} step="1" min="0" placeholder="10000" ariaLabel="Account balance" />
            </div>
            <div>
              <FieldLabel hint="%">Risk Per Trade</FieldLabel>
              <NumberField value={riskPercent} onChange={setRiskPercent} step="0.1" min="0" placeholder="1" ariaLabel="Risk percent" />
            </div>
            <div>
              <FieldLabel hint={moveUnit}>Stop-Loss Distance</FieldLabel>
              <NumberField value={stopLossPips} onChange={setStopLossPips} step="1" min="0" placeholder="30" ariaLabel="Stop-loss distance" />
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
          {belowMinimum ? (
            <div className="mt-4">
              <InfoNote>
                Your risk settings produce less than the minimum tradable size for this instrument. Consider using a micro contract/smaller market, reducing stop distance, or increasing account risk only if your plan allows it.
              </InfoNote>
            </div>
          ) : null}
        </section>

        <aside className="profit-card p-6 lg:col-span-2" aria-label="Lot size calculator results">
          <h2 className="mb-4 font-mono2 text-xs font-bold uppercase tracking-widest text-txt/70">Result</h2>
          {error ? (
            <ErrorBanner message={error} />
          ) : result ? (
            <div>
              <ResultRow
                label={`Tradable ${qtyLabel}`}
                value={formatQuantity(result.tradableQuantity, result.quantityStep)}
                tone="gold"
                emphasis
              />
              <ResultRow label={`Raw ${qtyLabel}`} value={formatQuantity(result.rawQuantity, 0.0001)} />
              <ResultRow label="Amount at risk" value={formatCurrencyValue(result.riskAmountAccountCcy, accountCurrency, 2)} />
              <ResultRow label={`Value per ${moveUnit.slice(0, -1)} at 1 ${qtyLabel.slice(0, -1)}`} value={formatCurrencyValue(result.pipValuePerUnitAccountCcy, accountCurrency, 2)} />
              {instrument.category !== "futures" && instrument.category !== "indices" ? (
                <ResultRow label="Approx. units" value={result.units.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-dim">Fill in your account, risk, and stop-loss to calculate size.</p>
          )}
        </aside>
      </div>
    </ToolShell>
  );
}

function LotSizeSeoContent() {
  return (
    <article className="space-y-7 text-sm leading-relaxed text-muted2">
      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">Why lot size matters</h2>
        <p>
          Lot size is the difference between controlled risk and random risk. A 30-pip stop on EURUSD, a 10-tick stop on ES, and a $100 move on BTCUSD all mean different dollar amounts. This calculator turns your stop-loss distance and risk percentage into the position size that matches your plan.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">Position size formula</h2>
        <p className="overflow-x-auto rounded-lg border border-line/60 bg-panel/60 p-3 font-mono2 text-xs text-txt/80">
          Position Size = (Account Balance × Risk %) ÷ (Stop-Loss Distance × Pip/Tick Value)
        </p>
        <p className="mt-3">
          The calculator first works out your dollar risk, then divides it by the amount you lose per pip or tick if price hits your stop. Futures are rounded to whole contracts; forex and most CFDs are rounded down to common 0.01 lot increments.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">FAQs</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-txt">How much should I risk per trade?</h3>
            <p>Many traders use 0.5% to 2% per trade. One percent is a common starting point, but the right number depends on your strategy, drawdown tolerance, and prop-firm rules.</p>
          </div>
          <div>
            <h3 className="font-semibold text-txt">Why is futures size rounded to whole contracts?</h3>
            <p>Exchange-traded futures do not trade in fractional contracts. If your calculated ES size is below 1 contract, try MES instead because micro futures have smaller tick values.</p>
          </div>
          <div>
            <h3 className="font-semibold text-txt">How do I know the stop-loss distance?</h3>
            <p>
              Use your chart setup first, measure entry to stop in pips/ticks, then enter that number here. For the dollar result of a pip or tick, use our <a href="/tools/pip-value-calculator" className="text-gold hover:underline">pip value calculator</a>.
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}
