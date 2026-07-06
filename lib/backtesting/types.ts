export type Candle = {
  time: number; // unix seconds, UTC
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type BacktestSide = "long" | "short";
export type BacktestExitReason = "manual" | "stop_loss" | "take_profit";

export type BacktestTrade = {
  id: string;
  side: BacktestSide;
  symbol: string;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit?: number | null;
  quantity: number;
  riskAmount: number;
  pnl: number;
  rMultiple: number;
  balanceAfter: number;
  exitReason: BacktestExitReason;
  setup?: string;
  notes?: string;
};

export type OpenBacktestTrade = {
  id: string;
  side: BacktestSide;
  symbol: string;
  entryTime: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number | null;
  quantity: number;
  riskAmount: number;
  setup?: string;
  notes?: string;
};

export type BacktestStats = {
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
  returnPercent: number;
  profitFactor: number;
  expectancyR: number;
  maxDrawdown: number;
  bestTradeR: number;
  worstTradeR: number;
};

export const BINANCE_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT"];
export const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

// ---- Indicators, drawings, and automated strategy backtesting ----

export type IndicatorType = "sma" | "ema" | "rsi";

export interface IndicatorConfig {
  sma: { enabled: boolean; period: number };
  ema: { enabled: boolean; period: number };
  rsi: { enabled: boolean; period: number };
  volume: boolean;
}

export type DrawingType = "level" | "trendline" | "rectangle";

export interface DrawingPoint {
  time: number; // unix seconds (snapped to nearest candle)
  price: number;
}

export interface Drawing {
  id: string;
  type: DrawingType;
  color: string;
  label?: string;
  price?: number; // level
  points?: DrawingPoint[]; // trendline / rectangle (2 points)
}

export type StrategyType = "ma_cross" | "breakout" | "mean_reversion";

export interface StrategyConfig {
  type: StrategyType;
  fastPeriod: number;
  slowPeriod: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  initialCapital: number;
  symbol: string;
}

export interface StrategyResult {
  trades: BacktestTrade[];
  stats: BacktestStats;
}
