import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://profitpnl.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const routes = [
    { path: "", priority: 1, changeFrequency: "daily" as const },
    { path: "/tools", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/profit-calculator", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/lot-size-calculator", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/pip-value-calculator", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/risk-reward-calculator", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/expectancy-calculator", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/win-rate-calculator", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/r-multiple-calculator", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/drawdown-calculator", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/prop-firm-challenge-calculator", priority: 0.9, changeFrequency: "weekly" as const },

    { path: "/tools/trading-journal-audit", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/trading-leak-finder", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/trade-setup-score-calculator", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/prop-firm-survival-simulator", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/broker-csv-converter", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/what-went-wrong-trading", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/prop-firm-rules", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/prop-firm-rules/ftmo", priority: 0.75, changeFrequency: "monthly" as const },
    { path: "/prop-firm-rules/topstep", priority: 0.75, changeFrequency: "monthly" as const },
    { path: "/prop-firm-rules/apex-trader-funding", priority: 0.75, changeFrequency: "monthly" as const },
    { path: "/prop-firm-rules/fundednext", priority: 0.75, changeFrequency: "monthly" as const },
    { path: "/prop-firm-rules/the5ers", priority: 0.75, changeFrequency: "monthly" as const },
    { path: "/playbooks", priority: 0.75, changeFrequency: "monthly" as const },
    { path: "/playbooks/opening-range-breakout", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/playbooks/liquidity-sweep", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/playbooks/fair-value-gap-retest", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/playbooks/break-and-retest", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/playbooks/range-fade", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/trading-metrics", priority: 0.75, changeFrequency: "monthly" as const },
    { path: "/trading-metrics/win-rate", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/trading-metrics/profit-factor", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/trading-metrics/expectancy", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/trading-metrics/r-multiple", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/trading-metrics/max-drawdown", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/trading-metrics/risk-of-ruin", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/reports/trader-benchmark-report", priority: 0.65, changeFrequency: "monthly" as const },
    { path: "/google-sheets-trading-journal-template", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/journaling-guides", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/csv-templates", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/about", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/risk-disclaimer", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/cookie-policy", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/refund-policy", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/login", priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/register", priority: 0.5, changeFrequency: "monthly" as const },
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
