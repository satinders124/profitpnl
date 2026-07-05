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
