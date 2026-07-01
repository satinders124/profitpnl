export type TradingAccount = {
  id: string;

  name: string;
  firm?: string;

  type?:
    | "Prop"
    | "Funded"
    | "Evaluation"
    | "Personal"
    | "Demo"
    | string;

  status?:
    | "Active"
    | "Passed"
    | "Failed"
    | "Paused"
    | string;

  // These can be strings inside forms, then converted with Number(...) when calculating
  size?: number | string;
  maxDD?: number | string;
  dailyLoss?: number | string;
  profitTarget?: number | string;
  startingBalance?: number | string;
  currentBalance?: number | string;

  trailingDD?: boolean;

  notes?: string;
};