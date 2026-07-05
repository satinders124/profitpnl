export type PropFirmRule = {
  slug: string;
  name: string;
  audience: string;
  markets: string;
  accountExamples: string;
  profitTarget: string;
  maxDrawdown: string;
  dailyLoss: string;
  minimumDays: string;
  payoutNotes: string;
  newsRules: string;
  consistencyRules: string;
  keyRiskTip: string;
  calculatorPreset: {
    accountSize: number;
    profitTargetPercent: number;
    maxDrawdownPercent: number;
    dailyLossPercent: number;
  };
};

export const PROP_FIRMS: PropFirmRule[] = [
  {
    slug: "ftmo",
    name: "FTMO",
    audience: "Forex, indices, metals, and CFD traders",
    markets: "Forex, indices, commodities, crypto CFDs depending on platform availability",
    accountExamples: "$10K, $25K, $50K, $100K, $200K challenge sizes",
    profitTarget: "Commonly around 10% in phase one and 5% in phase two, but always check the current FTMO rules.",
    maxDrawdown: "Typically based on maximum loss and account equity/balance rules.",
    dailyLoss: "Daily loss rules can include floating losses; traders should monitor intraday drawdown closely.",
    minimumDays: "Minimum trading day requirements may apply depending on challenge type.",
    payoutNotes: "Payout terms and profit splits vary by account type and region.",
    newsRules: "News restrictions may apply to certain account types and high-impact events.",
    consistencyRules: "Consistency rules may apply to some challenge variations or scaling conditions.",
    keyRiskTip: "Use smaller fixed risk until you build a drawdown buffer; FTMO-style daily loss rules punish oversized losing days.",
    calculatorPreset: { accountSize: 100000, profitTargetPercent: 10, maxDrawdownPercent: 10, dailyLossPercent: 5 },
  },
  {
    slug: "topstep",
    name: "Topstep",
    audience: "Futures traders",
    markets: "CME futures such as ES, NQ, CL, GC, and micros depending on plan/platform",
    accountExamples: "$50K, $100K, $150K style futures evaluations",
    profitTarget: "Profit targets depend on account size and current program rules.",
    maxDrawdown: "Often uses trailing drawdown mechanics; understand whether it trails intraday or end-of-day.",
    dailyLoss: "Daily loss limits may apply and can end an evaluation quickly if risk is not controlled.",
    minimumDays: "Trading day requirements vary by program.",
    payoutNotes: "Payout eligibility and withdrawal rules vary by funded status and account history.",
    newsRules: "Futures news/event rules vary; always confirm current policy.",
    consistencyRules: "Some futures programs focus heavily on consistency and risk behavior.",
    keyRiskTip: "Micro contracts are often the safest path to survive trailing drawdown while building consistency.",
    calculatorPreset: { accountSize: 50000, profitTargetPercent: 6, maxDrawdownPercent: 4, dailyLossPercent: 2 },
  },
  {
    slug: "apex-trader-funding",
    name: "Apex Trader Funding",
    audience: "Futures traders and high-frequency evaluation traders",
    markets: "Futures contracts depending on supported platforms and exchanges",
    accountExamples: "$25K to $300K style evaluation accounts depending on program availability",
    profitTarget: "Targets vary by account size; traders must check current Apex rules.",
    maxDrawdown: "Trailing threshold mechanics are a core risk rule; understand how it moves before sizing trades.",
    dailyLoss: "Daily loss rules may vary by account/program and should be respected even if not hard-blocked.",
    minimumDays: "Minimum trading day rules may apply before passing or payout eligibility.",
    payoutNotes: "Payout rules often include consistency and withdrawal conditions.",
    newsRules: "Event/news policies can change; verify before trading major releases.",
    consistencyRules: "Consistency and payout safety rules are especially important for Apex-style accounts.",
    keyRiskTip: "Avoid large single-day spikes; smooth growth is safer for payout consistency and drawdown thresholds.",
    calculatorPreset: { accountSize: 50000, profitTargetPercent: 6, maxDrawdownPercent: 5, dailyLossPercent: 3 },
  },
  {
    slug: "fundednext",
    name: "FundedNext",
    audience: "Forex, CFD, indices, metals, and crypto traders",
    markets: "Forex, commodities, indices, and crypto depending on account and broker setup",
    accountExamples: "Multiple challenge sizes and model types depending on current offering",
    profitTarget: "Profit targets vary by model and phase.",
    maxDrawdown: "Maximum loss and daily loss rules vary by model; some models handle drawdown differently.",
    dailyLoss: "Daily loss limits are critical and may include floating losses.",
    minimumDays: "Minimum trading days may apply based on model.",
    payoutNotes: "Profit share, payout frequency, and scaling vary by plan.",
    newsRules: "News trading rules depend on model and instrument.",
    consistencyRules: "Consistency conditions may apply, especially around payouts and scaling.",
    keyRiskTip: "Track daily loss buffer before every trade; daily breach is more common than missing the profit target.",
    calculatorPreset: { accountSize: 100000, profitTargetPercent: 10, maxDrawdownPercent: 10, dailyLossPercent: 5 },
  },
  {
    slug: "the5ers",
    name: "The5ers",
    audience: "Forex and CFD traders seeking slower, risk-controlled scaling",
    markets: "Forex, metals, and CFDs depending on account/program",
    accountExamples: "Program-dependent funded and evaluation sizes",
    profitTarget: "Targets depend on program type and scaling structure.",
    maxDrawdown: "Drawdown rules vary by program and are usually central to long-term scaling.",
    dailyLoss: "Daily pause/loss rules may apply depending on program.",
    minimumDays: "Minimum activity rules may apply.",
    payoutNotes: "Payout and scaling models vary by program.",
    newsRules: "News rules vary by program; confirm before trading events.",
    consistencyRules: "Risk consistency is important for sustainable scaling.",
    keyRiskTip: "Use fixed fractional risk and focus on low drawdown; The5ers-style growth rewards survival.",
    calculatorPreset: { accountSize: 50000, profitTargetPercent: 6, maxDrawdownPercent: 4, dailyLossPercent: 2 },
  },
];

export function getPropFirm(slug: string) {
  return PROP_FIRMS.find((firm) => firm.slug === slug);
}
