export type PublicPlaybook = {
  slug: string;
  name: string;
  market: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  summary: string;
  context: string;
  entryRules: string[];
  invalidation: string[];
  targets: string[];
  mistakes: string[];
  journalTags: string[];
};

export const PLAYBOOKS: PublicPlaybook[] = [
  {
    slug: "opening-range-breakout",
    name: "Opening Range Breakout",
    market: "Futures / Indices / Forex sessions",
    difficulty: "Intermediate",
    summary: "A session-open momentum setup that trades the break of an established opening range.",
    context: "Best used around liquid market opens where volume expands and direction becomes clear.",
    entryRules: ["Define a fixed opening range", "Wait for a clean close outside the range", "Confirm volume or momentum expansion", "Enter on break or first retest"],
    invalidation: ["Price closes back inside the range", "Breakout occurs into major opposing liquidity", "News event invalidates technical context"],
    targets: ["Range projection", "Prior session high/low", "Minimum 1:2 risk-reward"],
    mistakes: ["Entering before the range is formed", "Chasing after extended candles", "Ignoring opening spread/volatility"],
    journalTags: ["ORB", "session-open", "momentum", "breakout"],
  },
  {
    slug: "liquidity-sweep",
    name: "Liquidity Sweep Reversal",
    market: "Forex / Futures / Crypto",
    difficulty: "Advanced",
    summary: "A reversal setup after price takes obvious highs/lows and fails to continue.",
    context: "Works best near prior highs/lows, equal highs/lows, session extremes, and key HTF levels.",
    entryRules: ["Identify obvious liquidity level", "Wait for sweep beyond the level", "Confirm displacement back inside", "Enter on retrace or structure shift"],
    invalidation: ["Price accepts beyond swept level", "No displacement after sweep", "Stop is inside noisy liquidity zone"],
    targets: ["Opposite side of range", "Nearest fair value gap", "Prior structure pivot"],
    mistakes: ["Calling every wick a sweep", "Countertrend trading without confirmation", "Too tight stop after a volatile sweep"],
    journalTags: ["liquidity", "sweep", "reversal", "HTF-level"],
  },
  {
    slug: "fair-value-gap-retest",
    name: "Fair Value Gap Retest",
    market: "Forex / Indices / Futures",
    difficulty: "Intermediate",
    summary: "A continuation setup using imbalance created by strong displacement.",
    context: "Useful after clear trend displacement where price leaves an inefficient area and later retests it.",
    entryRules: ["Identify strong displacement candle", "Mark the imbalance/fair value gap", "Wait for controlled retrace", "Enter only if structure remains aligned"],
    invalidation: ["Gap fully fills with no reaction", "Market structure flips", "Retrace becomes impulsive against your bias"],
    targets: ["Recent swing high/low", "Liquidity pool", "Measured continuation leg"],
    mistakes: ["Trading tiny low-quality gaps", "Ignoring trend context", "Entering after reaction already happened"],
    journalTags: ["FVG", "imbalance", "continuation", "pullback"],
  },
  {
    slug: "break-and-retest",
    name: "Break and Retest",
    market: "All liquid markets",
    difficulty: "Beginner",
    summary: "A classic structure setup where broken support/resistance is retested as the opposite side.",
    context: "Best around clear levels with repeated touches and decisive breaks.",
    entryRules: ["Mark clean support/resistance", "Wait for decisive break", "Wait for retest", "Enter after rejection/confirmation"],
    invalidation: ["Level is messy or not respected", "Retest slices back through level", "Risk-reward is below plan"],
    targets: ["Next structure level", "Measured range move", "At least 1:2 R:R"],
    mistakes: ["Entering first touch blindly", "Forcing levels that are not obvious", "Ignoring higher timeframe trend"],
    journalTags: ["break-retest", "structure", "support-resistance"],
  },
  {
    slug: "range-fade",
    name: "Range Fade",
    market: "Forex / Indices / Crypto",
    difficulty: "Advanced",
    summary: "A mean-reversion setup that fades range extremes when continuation fails.",
    context: "Works best in clear low-trend ranges after failed breakouts and liquidity sweeps.",
    entryRules: ["Define range high/low", "Wait for failed breakout or rejection", "Enter back toward range mean", "Reduce size in high-news environments"],
    invalidation: ["Strong close outside range", "Volume confirms breakout", "Trend day conditions appear"],
    targets: ["Range midpoint", "Opposite range side", "Partial at 1R"],
    mistakes: ["Fading strong trend days", "Averaging losers", "Ignoring news catalysts"],
    journalTags: ["range", "fade", "mean-reversion", "failed-breakout"],
  },
];

export function getPlaybook(slug: string) {
  return PLAYBOOKS.find((playbook) => playbook.slug === slug);
}
