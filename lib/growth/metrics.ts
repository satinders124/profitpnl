export type TradingMetric = {
  slug: string;
  name: string;
  formula: string;
  plainEnglish: string;
  whyItMatters: string;
  example: string;
  relatedTool?: string;
};

export const TRADING_METRICS: TradingMetric[] = [
  {
    slug: "win-rate",
    name: "Win Rate",
    formula: "Wins ÷ (Wins + Losses)",
    plainEnglish: "The percentage of closed decisive trades that finished as winners.",
    whyItMatters: "Win rate tells you how often your idea is right, but it only matters when compared with average win and average loss.",
    example: "45 wins and 55 losses equals a 45% win rate.",
    relatedTool: "/tools/win-rate-calculator",
  },
  {
    slug: "profit-factor",
    name: "Profit Factor",
    formula: "Gross Profit ÷ Gross Loss",
    plainEnglish: "How many dollars or R you make for every unit you lose.",
    whyItMatters: "A profit factor above 1 means gross wins exceed gross losses. Higher is generally better, but sample size matters.",
    example: "$4,000 gross profit and $2,000 gross loss equals a 2.0 profit factor.",
  },
  {
    slug: "expectancy",
    name: "Expectancy",
    formula: "(Win Rate × Avg Win) − (Loss Rate × Avg Loss)",
    plainEnglish: "The average amount a strategy expects to make or lose per trade.",
    whyItMatters: "Expectancy is often more useful than win rate because it combines accuracy and payout size.",
    example: "45% win rate, 2.2R average win, and 1R average loss creates +0.44R expectancy.",
    relatedTool: "/tools/expectancy-calculator",
  },
  {
    slug: "r-multiple",
    name: "R-Multiple",
    formula: "Trade Result ÷ Planned Risk",
    plainEnglish: "A normalized result that measures profit/loss relative to initial risk.",
    whyItMatters: "R-multiple lets you compare trades across instruments, position sizes, and account sizes.",
    example: "Risking $100 and making $250 equals +2.5R.",
    relatedTool: "/tools/r-multiple-calculator",
  },
  {
    slug: "max-drawdown",
    name: "Max Drawdown",
    formula: "Peak Equity − Trough Equity",
    plainEnglish: "The largest drop from a performance high to a later low.",
    whyItMatters: "Drawdown measures survival risk and emotional pressure. A strategy can be profitable but impossible to execute if drawdown is too deep.",
    example: "An account falls from $100,000 to $94,000. Max drawdown is $6,000 or 6%.",
    relatedTool: "/tools/drawdown-calculator",
  },
  {
    slug: "risk-of-ruin",
    name: "Risk of Ruin",
    formula: "Probability of losing enough capital to stop trading",
    plainEnglish: "An estimate of whether your risk per trade is too high for your win rate and payout profile.",
    whyItMatters: "Even profitable strategies can blow up if position sizing is too aggressive relative to drawdown tolerance.",
    example: "A 45% win rate strategy risking 5% per trade may have much higher ruin risk than the same strategy risking 0.5%.",
    relatedTool: "/tools/prop-firm-survival-simulator",
  },
];

export function getMetric(slug: string) {
  return TRADING_METRICS.find((metric) => metric.slug === slug);
}
