import type { Metadata } from "next";
import LotSizeCalculatorClient from "./LotSizeCalculatorClient";

const TITLE = "Lot Size Calculator — Free Forex & Futures Position Size Tool | ProfitPnL";
const DESCRIPTION =
  "Free lot size and position size calculator for forex, gold, crypto, indices, and futures. Enter account balance, risk %, and stop-loss to calculate size. No sign-up.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tools/lot-size-calculator" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/tools/lot-size-calculator",
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
  name: "Lot Size Calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: DESCRIPTION,
  url: "https://profitpnl.com/tools/lot-size-calculator",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How much should I risk per trade?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Many traders cap risk at 0.5% to 2% of account equity per trade. One percent is a common starting point, but your risk should match your strategy and drawdown tolerance.",
      },
    },
    {
      "@type": "Question",
      name: "Does this lot size calculator work for futures?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Futures instruments such as ES, NQ, YM, GC, and CL use tick values and whole-contract rounding instead of fractional forex lots.",
      },
    },
  ],
};

export default function LotSizeCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <LotSizeCalculatorClient />
    </>
  );
}
