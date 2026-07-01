export type TradeDirection = "LONG" | "SHORT";

export type Trade = {
  id: string;
  date: string;
  instrument: string;
  direction: TradeDirection | string;

  setup?: string;
  session?: string;
  timeframe?: string;
  emotion?: string;

  entry?: number | string;
  sl?: number | string;
  tp?: number | string;
  rr?: number | string;

  result?: number | string | null;
  pnl?: number | string | null;

  account?: string;
  notes?: string;
  tags?: string;
  chartUrl?: string;
  time?: string;

  reviewed?: boolean;
  executionRating?: number | string;
  mistake?: string;
  lesson?: string;

  createdAt?: unknown;
};