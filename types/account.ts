export type TradingAccount = {
  id: string;
  name: string;
  firm?: string;
  type?: string;
  size?: number;
  maxDD?: number;
  dailyLoss?: number;
  trailingDD?: boolean;
  status?: string;
};
