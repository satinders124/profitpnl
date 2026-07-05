import assert from "node:assert/strict";
import {
  calcDrawdown,
  calcExpectancy,
  calcPipValue,
  calcPositionSize,
  calcProfitLoss,
  calcPropFirmChallenge,
  calcRiskReward,
  calcRMultiple,
  calcWinRate,
} from "../lib/tools/calculations.ts";
import { getInstrument } from "../lib/tools/instruments.ts";

function approx(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} ≈ ${expected}`);
}

function instrument(symbol) {
  const item = getInstrument(symbol);
  assert.ok(item, `instrument ${symbol} exists`);
  return item;
}

const eurusd = instrument("EURUSD");
const usdjpy = instrument("USDJPY");
const es = instrument("ES");
const mes = instrument("MES");
const nq = instrument("NQ");

// Pip/tick values
approx(calcPipValue({ instrument: eurusd, quantity: 1, quoteToAccountRate: 1 }).pipValueAccountCcy, 10);
approx(calcPipValue({ instrument: eurusd, quantity: 0.1, quoteToAccountRate: 1 }).pipValueAccountCcy, 1);
approx(calcPipValue({ instrument: usdjpy, quantity: 1, quoteToAccountRate: 1 / 150 }).pipValueQuoteCcy, 1000);
approx(calcPipValue({ instrument: usdjpy, quantity: 1, quoteToAccountRate: 1 / 150 }).pipValueAccountCcy, 1000 / 150);
approx(calcPipValue({ instrument: es, quantity: 1, quoteToAccountRate: 1 }).pipValueAccountCcy, 12.5);
approx(calcPipValue({ instrument: nq, quantity: 1, quoteToAccountRate: 1 }).pipValueAccountCcy, 5);

// Position size
const eurusdSize = calcPositionSize({
  instrument: eurusd,
  accountBalance: 10000,
  riskPercent: 1,
  stopLossPips: 50,
  quoteToAccountRate: 1,
});
approx(eurusdSize.riskAmountAccountCcy, 100);
approx(eurusdSize.rawQuantity, 0.2);
approx(eurusdSize.tradableQuantity, 0.2);

const esSize = calcPositionSize({
  instrument: es,
  accountBalance: 50000,
  riskPercent: 0.5,
  stopLossPips: 10,
  quoteToAccountRate: 1,
});
approx(esSize.rawQuantity, 2);
approx(esSize.tradableQuantity, 2);

const microSize = calcPositionSize({
  instrument: mes,
  accountBalance: 10000,
  riskPercent: 1,
  stopLossPips: 20,
  quoteToAccountRate: 1,
});
approx(microSize.rawQuantity, 4);
approx(microSize.tradableQuantity, 4);

// Profit/loss
const eurusdProfit = calcProfitLoss({
  instrument: eurusd,
  direction: "long",
  entryPrice: 1.1,
  exitPrice: 1.105,
  quantity: 1,
  quoteToAccountRate: 1,
});
approx(eurusdProfit.pips, 50, 1e-9);
approx(eurusdProfit.profitLossAccountCcy, 500, 1e-6);

const eurusdShortLoss = calcProfitLoss({
  instrument: eurusd,
  direction: "short",
  entryPrice: 1.1,
  exitPrice: 1.105,
  quantity: 1,
  quoteToAccountRate: 1,
});
approx(eurusdShortLoss.profitLossAccountCcy, -500, 1e-6);

const esProfit = calcProfitLoss({
  instrument: es,
  direction: "long",
  entryPrice: 5000,
  exitPrice: 5010,
  quantity: 2,
  quoteToAccountRate: 1,
});
approx(esProfit.profitLossAccountCcy, 1000);

// Risk reward
const rrLong = calcRiskReward({ direction: "long", entryPrice: 100, stopLossPrice: 95, takeProfitPrice: 115 });
approx(rrLong.ratio, 3);
approx(rrLong.breakEvenWinRate, 0.25);
const rrShort = calcRiskReward({ direction: "short", entryPrice: 100, stopLossPrice: 105, takeProfitPrice: 85 });
approx(rrShort.ratio, 3);
assert.throws(() => calcRiskReward({ direction: "long", entryPrice: 100, stopLossPrice: 105, takeProfitPrice: 115 }));

// Expectancy
const expectancy = calcExpectancy({ winRatePercent: 45, averageWin: 2.2, averageLoss: 1 });
approx(expectancy.expectancy, 0.44);
approx(expectancy.breakEvenWinRate, 1 / 3.2);
assert.ok(expectancy.profitFactor > 1);

// Win rate
const winRate = calcWinRate({ wins: 45, losses: 55, breakEvens: 5 });
approx(winRate.winRate, 0.45);
approx(winRate.lossRate, 0.55);
approx(winRate.breakEvenRate, 5 / 105);
approx(winRate.minimumRewardRiskToBreakEven, 55 / 45);

// R-multiple
const rMultiple = calcRMultiple({ direction: "long", entryPrice: 100, stopLossPrice: 95, exitPrice: 112.5, riskAmount: 100 });
approx(rMultiple.rMultiple, 2.5);
approx(rMultiple.dollarResult, 250);
const rMultipleLoss = calcRMultiple({ direction: "short", entryPrice: 100, stopLossPrice: 105, exitPrice: 106, riskAmount: 100 });
approx(rMultipleLoss.rMultiple, -1.2);

// Drawdown
const drawdown = calcDrawdown({ startingBalance: 100000, peakBalance: 100000, currentBalance: 94000 });
approx(drawdown.drawdownAmount, 6000);
approx(drawdown.drawdownPercent, 0.06);
approx(drawdown.recoveryPercent, 6000 / 94000);

// Prop firm challenge
const prop = calcPropFirmChallenge({
  accountSize: 100000,
  profitTargetPercent: 10,
  maxDrawdownPercent: 10,
  dailyLossPercent: 5,
  currentBalance: 102500,
  tradingDaysLeft: 20,
});
approx(prop.targetBalance, 110000);
approx(prop.profitRemaining, 7500);
approx(prop.progressPercent, 0.25);
approx(prop.requiredAverageDailyProfit, 375);
approx(prop.maxLossLimitBalance, 90000);
approx(prop.totalDrawdownBuffer, 12500);
approx(prop.dailyLossLimitAmount, 5000);

console.log("All calculator math tests passed.");
