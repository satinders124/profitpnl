import type { Instrument } from "./instruments";

export type Direction = "long" | "short";

export type PipValueInput = {
  instrument: Instrument;
  quantity: number;
  /** Rate that converts 1 unit of the instrument quote currency into account currency. */
  quoteToAccountRate: number;
};

export type PipValueResult = {
  pipValueQuoteCcy: number;
  pipValueAccountCcy: number;
};

export type PositionSizeInput = {
  instrument: Instrument;
  accountBalance: number;
  riskPercent: number;
  stopLossPips: number;
  quoteToAccountRate: number;
};

export type PositionSizeResult = {
  riskAmountAccountCcy: number;
  pipValuePerUnitAccountCcy: number;
  rawQuantity: number;
  tradableQuantity: number;
  quantityStep: number;
  units: number;
};

export type ProfitLossInput = {
  instrument: Instrument;
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  quoteToAccountRate: number;
};

export type ProfitLossResult = {
  priceDelta: number;
  pips: number;
  pipValueAccountCcy: number;
  profitLossAccountCcy: number;
};

export type RiskRewardInput = {
  direction: Direction;
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
};

export type RiskRewardResult = {
  riskPerUnit: number;
  rewardPerUnit: number;
  ratio: number;
  breakEvenWinRate: number;
};

function assertPositive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
}

export function floorToStep(value: number, step: number): number {
  assertPositive(step, "Quantity step");
  const precision = Math.max(0, Math.ceil(Math.log10(1 / step)) + 2);
  return Number((Math.floor(value / step) * step).toFixed(precision));
}

/**
 * For FX/metals/crypto:
 *   value of 1 pip/tick = pipSize × contractSize × lots
 * For futures/index CFDs:
 *   value of 1 tick = tickSize × pointValue × contracts/lots
 */
export function calcPipValue(input: PipValueInput): PipValueResult {
  const { instrument, quantity, quoteToAccountRate } = input;

  assertPositive(quantity, "Position size");
  assertPositive(quoteToAccountRate, "Conversion rate");

  const pipValueQuoteCcy =
    instrument.category === "futures" || instrument.category === "indices"
      ? instrument.pipSize * (instrument.pointValue ?? 0) * quantity
      : instrument.pipSize * instrument.contractSize * quantity;

  assertPositive(pipValueQuoteCcy, "Pip/tick value");

  return {
    pipValueQuoteCcy,
    pipValueAccountCcy: pipValueQuoteCcy * quoteToAccountRate,
  };
}

export function calcPositionSize(input: PositionSizeInput): PositionSizeResult {
  const { instrument, accountBalance, riskPercent, stopLossPips, quoteToAccountRate } = input;

  assertPositive(accountBalance, "Account balance");
  assertPositive(riskPercent, "Risk percentage");
  assertPositive(stopLossPips, "Stop-loss distance");
  assertPositive(quoteToAccountRate, "Conversion rate");

  const riskAmountAccountCcy = accountBalance * (riskPercent / 100);
  const { pipValueAccountCcy: pipValuePerUnitAccountCcy } = calcPipValue({
    instrument,
    quantity: 1,
    quoteToAccountRate,
  });

  const rawQuantity = riskAmountAccountCcy / (stopLossPips * pipValuePerUnitAccountCcy);
  const tradableQuantity = floorToStep(rawQuantity, instrument.quantityStep);

  return {
    riskAmountAccountCcy,
    pipValuePerUnitAccountCcy,
    rawQuantity,
    tradableQuantity,
    quantityStep: instrument.quantityStep,
    units: rawQuantity * instrument.contractSize,
  };
}

export function calcProfitLoss(input: ProfitLossInput): ProfitLossResult {
  const { instrument, direction, entryPrice, exitPrice, quantity, quoteToAccountRate } = input;

  assertPositive(entryPrice, "Entry price");
  assertPositive(exitPrice, "Exit price");
  assertPositive(quantity, "Position size");
  assertPositive(quoteToAccountRate, "Conversion rate");

  const rawDelta = exitPrice - entryPrice;
  const priceDelta = direction === "long" ? rawDelta : -rawDelta;
  const pips = priceDelta / instrument.pipSize;
  const { pipValueAccountCcy } = calcPipValue({ instrument, quantity, quoteToAccountRate });

  return {
    priceDelta,
    pips,
    pipValueAccountCcy,
    profitLossAccountCcy: pips * pipValueAccountCcy,
  };
}

export function calcRiskReward(input: RiskRewardInput): RiskRewardResult {
  const { direction, entryPrice, stopLossPrice, takeProfitPrice } = input;

  assertPositive(entryPrice, "Entry price");
  assertPositive(stopLossPrice, "Stop-loss price");
  assertPositive(takeProfitPrice, "Take-profit price");

  const riskPerUnit = direction === "long" ? entryPrice - stopLossPrice : stopLossPrice - entryPrice;
  const rewardPerUnit = direction === "long" ? takeProfitPrice - entryPrice : entryPrice - takeProfitPrice;

  if (riskPerUnit <= 0) {
    throw new Error("Stop-loss must be on the losing side of your entry for the selected direction.");
  }

  if (rewardPerUnit <= 0) {
    throw new Error("Take-profit must be on the winning side of your entry for the selected direction.");
  }

  const ratio = rewardPerUnit / riskPerUnit;

  return {
    riskPerUnit,
    rewardPerUnit,
    ratio,
    breakEvenWinRate: 1 / (1 + ratio),
  };
}

export type ExpectancyInput = {
  winRatePercent: number;
  averageWin: number;
  averageLoss: number;
};

export type ExpectancyResult = {
  winRate: number;
  lossRate: number;
  expectancy: number;
  profitFactor: number;
  breakEvenWinRate: number;
};

export function calcExpectancy(input: ExpectancyInput): ExpectancyResult {
  const { winRatePercent, averageWin, averageLoss } = input;

  if (!Number.isFinite(winRatePercent) || winRatePercent < 0 || winRatePercent > 100) {
    throw new Error("Win rate must be between 0 and 100.");
  }
  assertPositive(averageWin, "Average win");
  assertPositive(averageLoss, "Average loss");

  const winRate = winRatePercent / 100;
  const lossRate = 1 - winRate;
  const expectancy = winRate * averageWin - lossRate * averageLoss;
  const losingSide = lossRate * averageLoss;
  const profitFactor = losingSide === 0 ? Infinity : (winRate * averageWin) / losingSide;

  return {
    winRate,
    lossRate,
    expectancy,
    profitFactor,
    breakEvenWinRate: averageLoss / (averageWin + averageLoss),
  };
}

export type WinRateInput = {
  wins: number;
  losses: number;
  breakEvens?: number;
};

export type WinRateResult = {
  wins: number;
  losses: number;
  breakEvens: number;
  totalTrades: number;
  decisiveTrades: number;
  winRate: number;
  lossRate: number;
  breakEvenRate: number;
  minimumRewardRiskToBreakEven: number;
};

export function calcWinRate(input: WinRateInput): WinRateResult {
  const wins = Math.max(0, Math.floor(input.wins));
  const losses = Math.max(0, Math.floor(input.losses));
  const breakEvens = Math.max(0, Math.floor(input.breakEvens ?? 0));
  const decisiveTrades = wins + losses;
  const totalTrades = decisiveTrades + breakEvens;

  if (totalTrades <= 0) {
    throw new Error("Enter at least one trade.");
  }
  if (decisiveTrades <= 0) {
    throw new Error("Enter at least one win or loss to calculate win rate.");
  }

  const winRate = wins / decisiveTrades;
  const lossRate = losses / decisiveTrades;

  return {
    wins,
    losses,
    breakEvens,
    totalTrades,
    decisiveTrades,
    winRate,
    lossRate,
    breakEvenRate: breakEvens / totalTrades,
    minimumRewardRiskToBreakEven: winRate === 0 ? Infinity : lossRate / winRate,
  };
}

export type RMultipleInput = {
  direction: Direction;
  entryPrice: number;
  stopLossPrice: number;
  exitPrice: number;
  riskAmount?: number;
};

export type RMultipleResult = {
  riskPerUnit: number;
  resultPerUnit: number;
  rMultiple: number;
  dollarResult?: number;
};

export function calcRMultiple(input: RMultipleInput): RMultipleResult {
  const { direction, entryPrice, stopLossPrice, exitPrice, riskAmount } = input;

  assertPositive(entryPrice, "Entry price");
  assertPositive(stopLossPrice, "Stop-loss price");
  assertPositive(exitPrice, "Exit price");

  if (riskAmount !== undefined && riskAmount < 0) {
    throw new Error("Risk amount cannot be negative.");
  }

  const riskPerUnit = direction === "long" ? entryPrice - stopLossPrice : stopLossPrice - entryPrice;
  if (riskPerUnit <= 0) {
    throw new Error("Stop-loss must be on the losing side of your entry for the selected direction.");
  }

  const resultPerUnit = direction === "long" ? exitPrice - entryPrice : entryPrice - exitPrice;
  const rMultiple = resultPerUnit / riskPerUnit;

  return {
    riskPerUnit,
    resultPerUnit,
    rMultiple,
    dollarResult: riskAmount !== undefined ? rMultiple * riskAmount : undefined,
  };
}

export type DrawdownInput = {
  startingBalance: number;
  peakBalance: number;
  currentBalance: number;
};

export type DrawdownResult = {
  drawdownAmount: number;
  drawdownPercent: number;
  recoveryPercent: number;
  netChangeAmount: number;
  netChangePercent: number;
};

export function calcDrawdown(input: DrawdownInput): DrawdownResult {
  const { startingBalance, peakBalance, currentBalance } = input;

  assertPositive(startingBalance, "Starting balance");
  assertPositive(peakBalance, "Peak balance");
  if (!Number.isFinite(currentBalance) || currentBalance < 0) {
    throw new Error("Current balance must be zero or greater.");
  }
  if (currentBalance > peakBalance) {
    throw new Error("Current balance cannot be higher than peak balance for a drawdown calculation.");
  }

  const drawdownAmount = peakBalance - currentBalance;
  const drawdownPercent = drawdownAmount / peakBalance;
  const recoveryPercent = currentBalance === 0 ? Infinity : drawdownAmount / currentBalance;
  const netChangeAmount = currentBalance - startingBalance;
  const netChangePercent = netChangeAmount / startingBalance;

  return {
    drawdownAmount,
    drawdownPercent,
    recoveryPercent,
    netChangeAmount,
    netChangePercent,
  };
}

export type PropFirmChallengeInput = {
  accountSize: number;
  profitTargetPercent: number;
  maxDrawdownPercent: number;
  dailyLossPercent: number;
  currentBalance: number;
  tradingDaysLeft: number;
};

export type PropFirmChallengeResult = {
  targetBalance: number;
  profitTargetAmount: number;
  profitRemaining: number;
  progressPercent: number;
  maxLossLimitBalance: number;
  totalDrawdownBuffer: number;
  dailyLossLimitAmount: number;
  requiredAverageDailyProfit: number;
};

export function calcPropFirmChallenge(input: PropFirmChallengeInput): PropFirmChallengeResult {
  const {
    accountSize,
    profitTargetPercent,
    maxDrawdownPercent,
    dailyLossPercent,
    currentBalance,
    tradingDaysLeft,
  } = input;

  assertPositive(accountSize, "Account size");
  assertPositive(profitTargetPercent, "Profit target");
  assertPositive(maxDrawdownPercent, "Max drawdown");
  assertPositive(dailyLossPercent, "Daily loss limit");
  if (!Number.isFinite(currentBalance) || currentBalance < 0) {
    throw new Error("Current balance must be zero or greater.");
  }
  assertPositive(tradingDaysLeft, "Trading days left");

  const profitTargetAmount = accountSize * (profitTargetPercent / 100);
  const targetBalance = accountSize + profitTargetAmount;
  const profitRemaining = Math.max(0, targetBalance - currentBalance);
  const currentProfit = currentBalance - accountSize;
  const progressPercent = Math.min(1, Math.max(0, currentProfit / profitTargetAmount));
  const maxLossLimitBalance = accountSize * (1 - maxDrawdownPercent / 100);
  const totalDrawdownBuffer = currentBalance - maxLossLimitBalance;
  const dailyLossLimitAmount = accountSize * (dailyLossPercent / 100);
  const requiredAverageDailyProfit = profitRemaining / tradingDaysLeft;

  return {
    targetBalance,
    profitTargetAmount,
    profitRemaining,
    progressPercent,
    maxLossLimitBalance,
    totalDrawdownBuffer,
    dailyLossLimitAmount,
    requiredAverageDailyProfit,
  };
}
