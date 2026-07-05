import type { Metadata } from "next";
import RiskRewardCalculatorClient from "./RiskRewardCalculatorClient";

const TITLE = "Risk-Reward Ratio Calculator — Free R:R & Break-Even Win Rate Tool | ProfitPnL";
const DESCRIPTION =
  "Free risk-reward ratio calculator for traders. Enter entry, stop-loss, and take-profit to calculate R:R and break-even win rate. No sign-up.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tools/risk-reward-calculator" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/tools/risk-reward-calculator",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Risk-Reward Ratio Calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: DESCRIPTION,
  url: "https://profitpnl.com/tools/risk-reward-calculator",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a good risk-reward ratio?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Many traders look for at least 1:2, but profitability depends on both risk-reward and actual win rate.",
      },
    },
    {
      "@type": "Question",
      name: "Does a good risk-reward ratio guarantee profit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. A risk-reward ratio describes a setup's math, but your real expectancy depends on your actual win rate, costs, and execution over many trades.",
      },
    },
  ],
};

export default function RiskRewardCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <RiskRewardCalculatorClient />
    </>
  );
}
