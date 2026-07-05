"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/tools/ToolShell";
import { ErrorBanner, FieldLabel, InfoNote, NumberField, ResultRow } from "@/components/tools/inputs";
import { calcPropFirmChallenge } from "@/lib/tools/calculations";
import { formatCurrencyValue } from "@/lib/tools/format";

export default function PropFirmChallengeCalculatorClient() {
  const [accountSize, setAccountSize] = useState("100000");
  const [profitTargetPercent, setProfitTargetPercent] = useState("10");
  const [maxDrawdownPercent, setMaxDrawdownPercent] = useState("10");
  const [dailyLossPercent, setDailyLossPercent] = useState("5");
  const [currentBalance, setCurrentBalance] = useState("102500");
  const [tradingDaysLeft, setTradingDaysLeft] = useState("20");

  const { result, error } = useMemo(() => {
    try {
      const account = Number.parseFloat(accountSize);
      const target = Number.parseFloat(profitTargetPercent);
      const maxDd = Number.parseFloat(maxDrawdownPercent);
      const dailyLoss = Number.parseFloat(dailyLossPercent);
      const current = Number.parseFloat(currentBalance);
      const days = Number.parseFloat(tradingDaysLeft);

      if (
        !accountSize ||
        !profitTargetPercent ||
        !maxDrawdownPercent ||
        !dailyLossPercent ||
        !currentBalance ||
        !tradingDaysLeft ||
        [account, target, maxDd, dailyLoss, current, days].some(Number.isNaN)
      ) {
        return { result: null, error: null };
      }

      return {
        result: calcPropFirmChallenge({
          accountSize: account,
          profitTargetPercent: target,
          maxDrawdownPercent: maxDd,
          dailyLossPercent: dailyLoss,
          currentBalance: current,
          tradingDaysLeft: days,
        }),
        error: null,
      };
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : "Invalid input." };
    }
  }, [accountSize, profitTargetPercent, maxDrawdownPercent, dailyLossPercent, currentBalance, tradingDaysLeft]);

  return (
    <ToolShell
      eyebrow="Free Prop Firm Tool"
      title="Prop Firm Challenge Calculator"
      description="Plan your challenge like a risk manager. Calculate profit target progress, remaining profit needed, drawdown buffer, daily loss limit, and required average daily profit."
      currentPath="/tools/prop-firm-challenge-calculator"
      content={<PropFirmSeoContent />}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="profit-card p-6 lg:col-span-3" aria-label="Prop firm challenge calculator form">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel>Account Size</FieldLabel>
              <NumberField value={accountSize} onChange={setAccountSize} step="100" min="0" placeholder="100000" ariaLabel="Account size" />
            </div>
            <div>
              <FieldLabel>Current Balance</FieldLabel>
              <NumberField value={currentBalance} onChange={setCurrentBalance} step="100" min="0" placeholder="102500" ariaLabel="Current balance" />
            </div>
            <div>
              <FieldLabel hint="%">Profit Target</FieldLabel>
              <NumberField value={profitTargetPercent} onChange={setProfitTargetPercent} step="0.1" min="0" placeholder="10" ariaLabel="Profit target percent" />
            </div>
            <div>
              <FieldLabel hint="%">Max Drawdown</FieldLabel>
              <NumberField value={maxDrawdownPercent} onChange={setMaxDrawdownPercent} step="0.1" min="0" placeholder="10" ariaLabel="Max drawdown percent" />
            </div>
            <div>
              <FieldLabel hint="%">Daily Loss Limit</FieldLabel>
              <NumberField value={dailyLossPercent} onChange={setDailyLossPercent} step="0.1" min="0" placeholder="5" ariaLabel="Daily loss percent" />
            </div>
            <div>
              <FieldLabel>Trading Days Left</FieldLabel>
              <NumberField value={tradingDaysLeft} onChange={setTradingDaysLeft} step="1" min="1" placeholder="20" ariaLabel="Trading days left" />
            </div>
          </div>
          <div className="mt-4">
            <InfoNote>
              This uses a simple static drawdown model. Always verify your exact prop firm rules because trailing, intraday, and end-of-day drawdown calculations can differ.
            </InfoNote>
          </div>
        </section>

        <aside className="profit-card p-6 lg:col-span-2" aria-label="Prop firm challenge calculator results">
          <h2 className="mb-4 font-mono2 text-xs font-bold uppercase tracking-widest text-txt/70">Result</h2>
          {error ? (
            <ErrorBanner message={error} />
          ) : result ? (
            <div>
              <ResultRow label="Challenge progress" value={`${(result.progressPercent * 100).toFixed(1)}%`} tone="gold" emphasis />
              <ResultRow label="Target balance" value={formatCurrencyValue(result.targetBalance, "USD", 2)} />
              <ResultRow label="Profit remaining" value={formatCurrencyValue(result.profitRemaining, "USD", 2)} tone={result.profitRemaining === 0 ? "bull" : "gold"} />
              <ResultRow label="Avg profit/day needed" value={formatCurrencyValue(result.requiredAverageDailyProfit, "USD", 2)} />
              <ResultRow label="Max loss floor" value={formatCurrencyValue(result.maxLossLimitBalance, "USD", 2)} />
              <ResultRow label="Drawdown buffer" value={formatCurrencyValue(result.totalDrawdownBuffer, "USD", 2)} tone={result.totalDrawdownBuffer > 0 ? "bull" : "bear"} />
              <ResultRow label="Daily loss limit" value={formatCurrencyValue(result.dailyLossLimitAmount, "USD", 2)} />
            </div>
          ) : (
            <p className="text-sm text-dim">Enter your challenge rules to calculate progress.</p>
          )}
        </aside>
      </div>
    </ToolShell>
  );
}

function PropFirmSeoContent() {
  return (
    <article className="space-y-7 text-sm leading-relaxed text-muted2">
      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">Why prop firm challenge math matters</h2>
        <p>
          Most failed challenges are not only about bad entries. They fail because the trader does not know the profit remaining, drawdown buffer, daily loss limit, or required pace. This calculator keeps those numbers visible before the next trade.
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-xl font-bold text-txt">Prop challenge planning formula</h2>
        <p className="overflow-x-auto rounded-lg border border-line/60 bg-panel/60 p-3 font-mono2 text-xs text-txt/80">
          Profit Remaining = Target Balance − Current Balance
        </p>
        <p className="mt-3">
          The required average daily profit divides remaining profit by trading days left. Use this as a planning guide, not a reason to force trades. ProfitPnL is built to track risk, drawdown, and prop account health continuously.
        </p>
      </section>
    </article>
  );
}
