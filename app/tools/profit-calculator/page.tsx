import type { Metadata } from "next";
import ProfitCalculatorClient from "./ProfitCalculatorClient";

const TITLE = "Profit Calculator — Free Forex, Crypto & Futures P&L Tool | ProfitPnL";
const DESCRIPTION =
  "Free trading profit calculator for forex, gold, crypto, indices, and futures. Calculate profit or loss from entry price, exit price, direction, and lot size. No sign-up.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tools/profit-calculator" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/tools/profit-calculator",
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
  name: "Trading Profit Calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: DESCRIPTION,
  url: "https://profitpnl.com/tools/profit-calculator",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Does this profit calculator include spread or commission?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. It calculates raw price-based profit or loss. Your broker statement may differ because of spread, commission, swap fees, and slippage.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use this calculator for futures or crypto?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Choose a supported crypto pair or futures contract and the calculator applies the relevant contract specification for P&L math.",
      },
    },
  ],
};

export default function ProfitCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <ProfitCalculatorClient />
    </>
  );
}
